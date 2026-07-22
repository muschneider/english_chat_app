import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { ModelMessage } from "ai";
import { db } from "@/lib/db";
import { sessions, messages, errorPatterns } from "@/lib/db/schema";
import type { MessageRow, SessionRow } from "@/lib/db/schema";
import { generateTeacherTurn } from "@/lib/ai/teacher";
import type { TeacherTurn } from "@/lib/ai/schema";
import type { TurnContext } from "@/lib/ai/prompt";
import { shiftLevel, nextErrorScore } from "@/lib/levels";

const HISTORY_LIMIT = 24;
const PATTERN_THRESHOLD = 3;

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

/** Create a brand new session and generate the opening teacher turn. */
export async function createSession(): Promise<{
  session: SessionRow;
  message: ClientMessage;
}> {
  const [session] = await db.insert(sessions).values({}).returning();

  const context: TurnContext = {
    intent: "start",
    currentLevel: session.currentLevel,
    recentErrorScore: session.recentErrorScore,
  };

  const turn = await generateTeacherTurn({ history: [], context });

  const [teacherRow] = await db
    .insert(messages)
    .values({
      sessionId: session.id,
      role: "teacher",
      content: turn.conversation,
      payload: turn,
    })
    .returning();

  const [updated] = await db
    .update(sessions)
    .set({
      currentLevel: turn.level,
      title: turn.topic || session.title,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, session.id))
    .returning();

  return { session: updated, message: toClientMessage(teacherRow) };
}

/** Load a session and its full transcript. */
export async function getSession(sessionId: string): Promise<{
  session: SessionRow;
  messages: ClientMessage[];
} | null> {
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  if (!session) return null;

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  return { session, messages: rows.map(toClientMessage) };
}

export interface AdvanceArgs {
  sessionId: string;
  intent: "reply" | "hint";
  message?: string;
  hintLevel?: number;
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
  const { sessionId, intent } = args;

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId));
  if (!session) return null;

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
        errorTally,
      },
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

  const turn = await generateTeacherTurn({
    history,
    context: {
      intent: "reply",
      currentLevel: session.currentLevel,
      recentErrorScore: session.recentErrorScore,
      errorTally,
      patternToDrill: patternToDrill
        ? {
            errorType: patternToDrill.errorType,
            label: patternToDrill.label,
            count: patternToDrill.count,
          }
        : null,
    },
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

  const [updatedSession] = await db
    .update(sessions)
    .set({
      currentLevel: newLevel,
      recentErrorScore: newScore,
      title: turn.topic || session.title,
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
