import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { ModelMessage } from "ai";
import { db } from "@/lib/db";
import {
  sessions,
  messages,
  errorPatterns,
  users,
  userMemories,
} from "@/lib/db/schema";
import type {
  MessageRow,
  SessionRow,
  UserMemoryRow,
  UserRow,
} from "@/lib/db/schema";
import { generateTeacherTurn } from "@/lib/ai/teacher";
import type { MemoryUpdate, TeacherTurn } from "@/lib/ai/schema";
import type { LearnerProfile, TurnContext } from "@/lib/ai/prompt";
import { shiftLevel, nextErrorScore } from "@/lib/levels";
import type { Daypart } from "@/lib/time";
import {
  isTopicSlug,
  randomTopicSlug,
  topicEnLabel,
  topicPtLabel,
} from "@/lib/topics";

const HISTORY_LIMIT = 24;
const PATTERN_THRESHOLD = 3;
/** Run a fresh level assessment every N learner replies. */
const ASSESSMENT_INTERVAL = 6;
/** Cap on how many durable facts we inject into the prompt each turn. */
const MEMORY_LIMIT = 80;

export interface ClientMessage {
  id: string;
  role: "teacher" | "user";
  content: string;
  payload: TeacherTurn | null;
  createdAt: string;
}

function toClientMessage(row: MessageRow): ClientMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    payload: (row.payload as TeacherTurn | null) ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toHistory(rows: MessageRow[]): ModelMessage[] {
  return rows.map((row) => ({
    role: row.role === "teacher" ? "assistant" : "user",
    content: row.content,
  }));
}

async function loadErrorTally(sessionId: string) {
  const rows = await db
    .select()
    .from(errorPatterns)
    .where(eq(errorPatterns.sessionId, sessionId));
  return rows;
}

async function loadUser(userId: string): Promise<UserRow | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

function toProfile(user: UserRow): LearnerProfile {
  return { name: user.name, selfLevel: user.englishLevel };
}

/** All durable facts the tutor knows about this learner (most recent first). */
async function loadUserMemories(userId: string): Promise<UserMemoryRow[]> {
  return db
    .select()
    .from(userMemories)
    .where(eq(userMemories.userId, userId))
    .orderBy(desc(userMemories.updatedAt))
    .limit(MEMORY_LIMIT);
}

/**
 * Persist durable facts the tutor extracted this turn. Keyed by (userId, key)
 * so a changed fact (e.g. moved city) overwrites the previous value instead of
 * piling up duplicates.
 */
async function upsertUserMemories(userId: string, updates: MemoryUpdate[]) {
  for (const update of updates) {
    const key = update.key.trim().slice(0, 64);
    const fact = update.fact.trim().slice(0, 500);
    if (!key || !fact) continue;

    await db
      .insert(userMemories)
      .values({ userId, key, fact, category: update.category })
      .onConflictDoUpdate({
        target: [userMemories.userId, userMemories.key],
        set: { fact, category: update.category, updatedAt: new Date() },
      });
  }
}

export interface CreateSessionOptions {
  /** A topic slug the learner picked; when absent/invalid a random one is used. */
  topic?: string;
  /** The learner's LOCAL part of the day, so the opening greeting fits the clock. */
  daypart?: Daypart;
}

/** Create a brand new session (owned by `userId`) and generate the opening turn. */
export async function createSession(
  userId: string,
  options: CreateSessionOptions = {},
): Promise<{
  session: SessionRow;
  message: ClientMessage;
}> {
  const user = await loadUser(userId);
  if (!user) throw new Error("User not found for new session.");

  // The learner's self-declared level is the starting point; the adaptive
  // engine drifts from there as the conversation progresses.
  const startingLevel = user.englishLevel;
  // A conversation opens on the chosen topic, or a random one for variety.
  const topicSlug = isTopicSlug(options.topic) ? options.topic : randomTopicSlug();

  const memories = await loadUserMemories(userId);

  const [session] = await db
    .insert(sessions)
    .values({ userId, currentLevel: startingLevel, topic: topicSlug })
    .returning();

  const context: TurnContext = {
    intent: "start",
    currentLevel: startingLevel,
    recentErrorScore: session.recentErrorScore,
    topic: topicEnLabel(topicSlug),
    daypart: options.daypart,
  };

  const turn = await generateTeacherTurn({
    history: [],
    context,
    profile: toProfile(user),
    memories,
  });

  const [teacherRow] = await db
    .insert(messages)
    .values({
      sessionId: session.id,
      role: "teacher",
      content: turn.conversation,
      payload: turn,
    })
    .returning();

  // Keep the opening level anchored to the learner's self-declared level (the
  // model has no evidence yet on turn 1); adaptation kicks in from real replies.
  const [updated] = await db
    .update(sessions)
    .set({
      currentLevel: startingLevel,
      title: topicPtLabel(topicSlug),
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, session.id))
    .returning();

  return { session: updated, message: toClientMessage(teacherRow) };
}

/** Load a session and its full transcript, scoped to its owner. */
export async function getSession(
  sessionId: string,
  userId: string,
): Promise<{
  session: SessionRow;
  messages: ClientMessage[];
} | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  if (!session) return null;

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  return { session, messages: rows.map(toClientMessage) };
}

/**
 * Fetch the user's most recently updated session with its full transcript.
 * Used on cold boot (no localStorage hint) so the same conversation follows
 * the learner across devices (computer, phone, tablet). Returns null if the
 * user has never started a conversation.
 */
export async function getLatestSessionForUser(
  userId: string,
): Promise<{
  session: SessionRow;
  messages: ClientMessage[];
} | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.updatedAt))
    .limit(1);
  if (!session) return null;

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, session.id))
    .orderBy(asc(messages.createdAt));

  return { session, messages: rows.map(toClientMessage) };
}

export interface AdvanceArgs {
  sessionId: string;
  userId: string;
  intent: "reply" | "hint";
  message?: string;
  hintLevel?: number;
  /** The learner's LOCAL part of the day, for a natural time-aware greeting. */
  daypart?: Daypart;
}

export interface AdvanceResult {
  turn: TeacherTurn;
  userMessage: ClientMessage | null;
  teacherMessage: ClientMessage | null;
  level: SessionRow["currentLevel"];
}

/**
 * Advance the conversation: either the learner replied, or the learner asked
 * for escalating help (a hint). Hints are ephemeral (not stored); replies are
 * persisted and drive the adaptive engine + pattern tracking.
 */
export async function advanceConversation(
  args: AdvanceArgs,
): Promise<AdvanceResult | null> {
  const { sessionId, userId, intent } = args;

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  if (!session) return null;

  const user = await loadUser(userId);
  if (!user) return null;

  const profile = toProfile(user);
  const memories = await loadUserMemories(userId);
  const topicLabel = topicEnLabel(session.topic);

  // Recent transcript for the model (chronological).
  const recentRows = (
    await db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(HISTORY_LIMIT)
  ).reverse();

  const history = toHistory(recentRows);

  const tally = await loadErrorTally(sessionId);
  const errorTally = tally.map((t) => ({
    errorType: t.errorType,
    label: t.label,
    count: t.count,
  }));

  if (intent === "hint") {
    const hintLevel = Math.min(Math.max(args.hintLevel ?? 1, 1), 3);
    history.push({
      role: "user",
      content: `I'm not sure how to answer this. Please help me (hint level ${hintLevel}).`,
    });

    const turn = await generateTeacherTurn({
      history,
      context: {
        intent: "hint",
        currentLevel: session.currentLevel,
        recentErrorScore: session.recentErrorScore,
        hintLevel,
        topic: topicLabel,
        daypart: args.daypart,
        errorTally,
      },
      profile,
      memories,
    });

    return {
      turn,
      userMessage: null,
      teacherMessage: null,
      level: session.currentLevel,
    };
  }

  // intent === "reply"
  const text = (args.message ?? "").trim();
  if (!text) return null;

  // Persist the learner's message immediately so it is never lost.
  const [userRow] = await db
    .insert(messages)
    .values({ sessionId, role: "user", content: text })
    .returning();

  history.push({ role: "user", content: text });

  // Is there a recurring error ready to be drilled this turn?
  const patternToDrill =
    tally
      .filter((t) => t.count >= PATTERN_THRESHOLD)
      .sort((a, b) => b.count - a.count)[0] ?? null;

  // Time for a periodic level assessment?
  const assessmentDue = session.turnsSinceAssessment + 1 >= ASSESSMENT_INTERVAL;

  const turn = await generateTeacherTurn({
    history,
    context: {
      intent: "reply",
      currentLevel: session.currentLevel,
      recentErrorScore: session.recentErrorScore,
      topic: topicLabel,
      daypart: args.daypart,
      assessmentDue,
      errorTally,
      patternToDrill: patternToDrill
        ? {
            errorType: patternToDrill.errorType,
            label: patternToDrill.label,
            count: patternToDrill.count,
          }
        : null,
    },
    profile,
    memories,
  });

  // Persist the teacher's structured turn.
  const [teacherRow] = await db
    .insert(messages)
    .values({
      sessionId,
      role: "teacher",
      content: turn.conversation,
      payload: turn,
    })
    .returning();

  // Update recurring-error tallies from this turn's corrections.
  const corrections = turn.feedback?.corrections ?? [];
  await upsertErrorPatterns(sessionId, corrections);

  // Remember any durable facts the learner revealed this turn.
  await upsertUserMemories(userId, turn.memoryUpdates ?? []);

  // If we drilled a pattern this turn, clear its counter.
  if (turn.detectedPattern && patternToDrill) {
    await db
      .update(errorPatterns)
      .set({ count: 0, drilledAt: new Date() })
      .where(
        and(
          eq(errorPatterns.sessionId, sessionId),
          eq(errorPatterns.errorType, patternToDrill.errorType),
        ),
      );
  }

  // Adaptive level + rolling error score.
  const newLevel = shiftLevel(session.currentLevel, turn.suggestedLevelChange);
  const newScore = nextErrorScore(session.recentErrorScore, corrections.length);
  // Advance the assessment cadence; reset it whenever an assessment was produced.
  const newTurnsSinceAssessment = turn.assessment
    ? 0
    : session.turnsSinceAssessment + 1;

  const [updatedSession] = await db
    .update(sessions)
    .set({
      currentLevel: newLevel,
      recentErrorScore: newScore,
      turnsSinceAssessment: newTurnsSinceAssessment,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return {
    turn,
    userMessage: toClientMessage(userRow),
    teacherMessage: toClientMessage(teacherRow),
    level: updatedSession.currentLevel,
  };
}

async function upsertErrorPatterns(
  sessionId: string,
  corrections: { errorType: string; explanation: string }[],
) {
  for (const correction of corrections) {
    const errorType = correction.errorType.slice(0, 64);
    const label = correction.explanation.slice(0, 200);

    const existing = await db
      .select()
      .from(errorPatterns)
      .where(
        and(
          eq(errorPatterns.sessionId, sessionId),
          eq(errorPatterns.errorType, errorType),
        ),
      );

    if (existing.length > 0) {
      await db
        .update(errorPatterns)
        .set({
          count: sql`${errorPatterns.count} + 1`,
          lastSeenAt: new Date(),
        })
        .where(eq(errorPatterns.id, existing[0].id));
    } else {
      await db.insert(errorPatterns).values({
        sessionId,
        errorType,
        label,
      });
    }
  }
}
