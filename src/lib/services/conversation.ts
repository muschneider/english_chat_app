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
import {
  generateTeacherPanels,
  generateTeacherTurn,
  streamTeacherChat,
} from "@/lib/ai/teacher";
import type { MemoryUpdate, Panels, TeacherTurn } from "@/lib/ai/schema";
import type { DeepPartial } from "@/lib/ai/types";
import type { LearnerProfile, TurnContext } from "@/lib/ai/prompt";
import { applyLevelSignal, nextErrorScore } from "@/lib/levels";
import { getLanguage } from "@/lib/languages";
import { describeGap, type Daypart, type Weekday } from "@/lib/time";
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

/** The learner plus everything durable the tutor knows, in one round-trip. */
async function loadUserWithMemories(
  userId: string,
): Promise<{ user: UserRow; memories: UserMemoryRow[] } | null> {
  const [userRows, memories] = await db.batch([
    db.select().from(users).where(eq(users.id, userId)),
    db
      .select()
      .from(userMemories)
      .where(eq(userMemories.userId, userId))
      .orderBy(desc(userMemories.updatedAt))
      .limit(MEMORY_LIMIT),
  ]);
  const user = userRows[0];
  if (!user) return null;
  return { user, memories };
}

/**
 * Everything a turn needs from the database, fetched in ONE round-trip.
 *
 * Neon's HTTP driver is stateless: every `await db.select()` is its own HTTPS
 * request (~135 ms). Five of them ran back-to-back before the model was even
 * called — and `Promise.all` does NOT help here (measured 677 ms parallel vs
 * 669 ms sequential; the driver serialises them anyway). `db.batch()` sends all
 * five statements in a single request: ~266 ms, so ~400 ms shaved off every
 * single turn before the tutor starts thinking.
 *
 * Returns null when the session doesn't exist or isn't owned by `userId` — the
 * ownership check lives in the WHERE clause, so batching stays safe.
 */
async function loadTurnInputs(sessionId: string, userId: string) {
  const [sessionRows, userRows, memories, recentDesc, tally] = await db.batch([
    db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId))),
    db.select().from(users).where(eq(users.id, userId)),
    db
      .select()
      .from(userMemories)
      .where(eq(userMemories.userId, userId))
      .orderBy(desc(userMemories.updatedAt))
      .limit(MEMORY_LIMIT),
    db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(desc(messages.createdAt))
      .limit(HISTORY_LIMIT),
    db.select().from(errorPatterns).where(eq(errorPatterns.sessionId, sessionId)),
  ]);

  const session = sessionRows[0];
  const user = userRows[0];
  if (!session || !user) return null;

  // The transcript comes back newest-first (so LIMIT keeps the RECENT window);
  // the model needs it chronological.
  const recentRows = [...recentDesc].reverse();

  return {
    session,
    user,
    memories,
    recentRows,
    tally,
    profile: toProfile(user),
    history: toHistory(recentRows),
    // Measured BEFORE this turn's message is appended, so it describes the
    // silence the learner is breaking right now.
    gap: gapSinceLastUserMessage(recentRows),
    errorTally: tally.map((t) => ({
      errorType: t.errorType,
      label: t.label,
      count: t.count,
    })),
  };
}

function toProfile(user: UserRow): LearnerProfile {
  return {
    name: user.name,
    selfLevel: user.englishLevel,
    // The human label ("Português (Brasil)"), not the ISO code — the tutor is
    // reading prose, and it also lets it anticipate L1 transfer errors.
    nativeLanguage: getLanguage(user.nativeLanguage).label,
  };
}

/**
 * How long since the learner last spoke, in plain English ("3 days"), or null
 * when it's just a normal back-and-forth pause. Drives the tutor's "hey, it's
 * been a while" — the cheapest, most human signal there is.
 */
function gapSinceLastUserMessage(rows: MessageRow[]): string | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].role === "user") return describeGap(rows[i].createdAt);
  }
  return null;
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
  /** The learner's LOCAL weekday, so the tutor can notice it's Friday. */
  weekday?: Weekday;
}

/** Create a brand new session (owned by `userId`) and generate the opening turn. */
export async function createSession(
  userId: string,
  options: CreateSessionOptions = {},
): Promise<{
  session: SessionRow;
  message: ClientMessage;
}> {
  const loaded = await loadUserWithMemories(userId);
  if (!loaded) throw new Error("User not found for new session.");
  const { user, memories } = loaded;

  // The learner's self-declared level is the starting point; the adaptive
  // engine drifts from there as the conversation progresses.
  const startingLevel = user.englishLevel;
  // A conversation opens on the chosen topic, or a random one for variety.
  const topicSlug = isTopicSlug(options.topic) ? options.topic : randomTopicSlug();

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
    weekday: options.weekday,
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
  /** The learner's LOCAL weekday, so the tutor can notice it's Friday. */
  weekday?: Weekday;
}

export interface AdvanceResult {
  turn: TeacherTurn;
  userMessage: ClientMessage | null;
  teacherMessage: ClientMessage | null;
  level: SessionRow["currentLevel"];
}

/**
 * Persist a completed teacher turn for a "reply" intent: writes the message,
 * updates error-pattern tallies, durable memories, the drilled-pattern
 * counter (if any), and the adaptive level / rolling error score / assessment
 * cadence on the session row.
 *
 * Shared by the non-streaming (`advanceConversation`) and the streaming
 * (`advanceConversationStream`) reply paths so both stay consistent.
 */
async function persistReplyTurn(args: {
  sessionId: string;
  session: SessionRow;
  userId: string;
  patternToDrill:
    | {
        errorType: string;
        label: string;
        count: number;
      }
    | null;
  turn: TeacherTurn;
}): Promise<{ teacherMessage: ClientMessage; level: SessionRow["currentLevel"] }> {
  const { sessionId, session, userId, patternToDrill, turn } = args;

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

  // Adaptive level + rolling error score. The model's per-turn suggestion is
  // only a vote: `applyLevelSignal` requires several consistent votes (and a
  // low error score to promote) before the level actually moves, so a single
  // good sentence can't strip the learner of their scaffolding mid-chat.
  const newScore = nextErrorScore(session.recentErrorScore, corrections.length);
  const { level: newLevel, drift: newDrift } = applyLevelSignal({
    level: session.currentLevel,
    drift: session.levelDrift,
    direction: turn.suggestedLevelChange,
    errorScore: newScore,
  });
  // Advance the assessment cadence; reset it whenever an assessment was produced.
  const newTurnsSinceAssessment = turn.assessment
    ? 0
    : session.turnsSinceAssessment + 1;

  const [updatedSession] = await db
    .update(sessions)
    .set({
      currentLevel: newLevel,
      levelDrift: newDrift,
      recentErrorScore: newScore,
      turnsSinceAssessment: newTurnsSinceAssessment,
      updatedAt: new Date(),
    })
    .where(eq(sessions.id, sessionId))
    .returning();

  return {
    teacherMessage: toClientMessage(teacherRow),
    level: updatedSession.currentLevel,
  };
}

/**
 * Advance the conversation: either the learner replied, or the learner asked
 * for escalating help (a hint). Hints are ephemeral (not stored); replies are
 * persisted and drive the adaptive engine + pattern tracking.
 *
 * This is the non-streaming path (one full JSON object, returned at once). For
 * streamed replies (text of the chat appears while the structured panels are
 * still being generated) see `advanceConversationStream`.
 */
export async function advanceConversation(
  args: AdvanceArgs,
): Promise< AdvanceResult | null> {
  const { sessionId, userId, intent } = args;

  const inputs = await loadTurnInputs(sessionId, userId);
  if (!inputs) return null;
  const { session, profile, memories, history, gap, tally, errorTally } = inputs;
  const topicLabel = topicEnLabel(session.topic);

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
        weekday: args.weekday,
        gap,
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
      weekday: args.weekday,
      gap,
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

  // Persist the teacher's structured turn + drive the adaptive engine.
  const persisted = await persistReplyTurn({
    sessionId,
    session,
    userId,
    patternToDrill,
    turn,
  });

  return {
    turn,
    userMessage: toClientMessage(userRow),
    teacherMessage: persisted.teacherMessage,
    level: persisted.level,
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

// ---------------------------------------------------------------------------
// Streaming reply path (NDJSON over POST /api/chat).
// ---------------------------------------------------------------------------
//
// A streamed "reply" returns a `Response` whose body is a newline-delimited
// JSON stream:
//
//   {"userMessage":{...}}\n                        ← the persisted learner
//                                                      message (id/createdAt)
//   {"partial":{"conversation":"..."}}\n           ← streamed repeatedly, the
//                                                      text growing token by
//                                                      token as Sam writes.
//   {"done":{"teacherMessage":...,"turn":...,"level":"..."}}\n
//                                                  ← final, after persistence.
//                                                      Replaces the optimistic
//                                                      teacher bubble with
//                                                      the real one + panels.
//
// Behind those events the turn is produced by TWO parallel model calls (see
// `advanceConversationStream`): free-text chat, which is what `partial`
// carries, and the structured panels, which only arrive with `done`. The chat
// therefore reaches the screen without waiting for any JSON to be decided —
// measured at ~2.3 s to first character, against ~40 s when a single
// `streamObject` call had to produce both at once.
const STREAM_DONE = "done" as const;
const STREAM_PARTIAL = "partial" as const;
const STREAM_ERROR = "error" as const;

export interface ChatStreamPartial {
  type: typeof STREAM_PARTIAL;
  partial: DeepPartial<TeacherTurn>;
}
export interface ChatStreamUserMessage {
  type: "userMessage";
  userMessage: ClientMessage;
}
export interface ChatStreamDone {
  type: typeof STREAM_DONE;
  turn: TeacherTurn;
  teacherMessage: ClientMessage;
  level: SessionRow["currentLevel"];
}
export interface ChatStreamError {
  type: typeof STREAM_ERROR;
  error: string;
}
export type ChatStreamMessage =
  | ChatStreamPartial
  | ChatStreamUserMessage
  | ChatStreamDone
  | ChatStreamError;

function ndjsonLine(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value) + "\n");
}

/**
 * An empty, harmless set of side panels.
 *
 * Used only when the panels half of a split reply fails. By then Sam's message
 * is already on the learner's screen, so the turn MUST still be persisted —
 * this keeps the transcript intact and simply renders no panels for that one
 * turn. `suggestedLevelChange: "same"` makes it a no-op for the adaptive
 * engine, and empty `corrections`/`memoryUpdates` mean nothing is wrongly
 * tallied or remembered.
 */
function neutralPanels(
  level: SessionRow["currentLevel"],
  topic: string,
): Panels {
  return {
    topic,
    level,
    toolkit: {
      usefulVerbs: [],
      usefulExpressions: [],
      usefulConnectors: [],
      grammarTip: null,
    },
    miniStructure: null,
    modelAnswer: null,
    feedback: null,
    detectedPattern: null,
    stuckHelp: null,
    suggestedLevelChange: "same",
    memoryUpdates: [],
    assessment: null,
  };
}

/**
 * Streamed reply path — the hot path of the whole app.
 *
 * Equivalent in side effects to `advanceConversation` for `intent === "reply"`,
 * but it streams Sam's text to the learner as it is written and builds the
 * structured panels alongside it, persisting the combined turn at the end.
 *
 * Returns a streamed `Response` (NDJSON). Returns `null` only for the
 * not-found / empty-message early-exit cases, in which case the caller should
 * produce a normal JSON 404/400 itself.
 */
export async function advanceConversationStream(
  args: AdvanceArgs,
): Promise<Response | null> {
  const { sessionId, userId } = args;

  const inputs = await loadTurnInputs(sessionId, userId);
  if (!inputs) return null;
  const { session, profile, memories, history, gap, tally, errorTally } = inputs;
  const topicLabel = topicEnLabel(session.topic);

  // intent === "reply"
  const text = (args.message ?? "").trim();
  if (!text) return null;

  // Persist the learner's message immediately so it is never lost.
  const [userRow] = await db
    .insert(messages)
    .values({ sessionId, role: "user", content: text })
    .returning();

  history.push({ role: "user", content: text });

  const patternToDrill =
    tally
      .filter((t) => t.count >= PATTERN_THRESHOLD)
      .sort((a, b) => b.count - a.count)[0] ?? null;

  const assessmentDue = session.turnsSinceAssessment + 1 >= ASSESSMENT_INTERVAL;

  const context: TurnContext = {
    intent: "reply",
    currentLevel: session.currentLevel,
    recentErrorScore: session.recentErrorScore,
    topic: topicLabel,
    daypart: args.daypart,
    weekday: args.weekday,
    gap,
    assessmentDue,
    errorTally,
    patternToDrill: patternToDrill
      ? {
          errorType: patternToDrill.errorType,
          label: patternToDrill.label,
          count: patternToDrill.count,
        }
      : null,
    // Name the message being corrected instead of leaving the model to infer
    // "the last one" from two dozen turns of history.
    learnerMessage: text,
  };

  const userMessage = toClientMessage(userRow);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(ndjsonLine({ type: "userMessage", userMessage }));

        // 1. Sam's reply, streamed. This is the only latency the learner feels.
        let conversation = "";
        await streamTeacherChat(
          { history, context, profile, memories },
          (delta) => {
            conversation += delta;
            controller.enqueue(
              ndjsonLine({ type: STREAM_PARTIAL, partial: { conversation } }),
            );
          },
        );

        // 2. The panels, once Sam's reply exists.
        //
        // This waits on purpose. The toolkit's whole job is to hand the learner
        // the words for answering the question Sam just asked, so it cannot be
        // written before that question exists — run in parallel it fell back to
        // the session's opening topic and offered vocabulary for a conversation
        // that had moved on turns ago.
        const panels = await generateTeacherPanels({
          history,
          context: { ...context, samReply: conversation },
          profile,
          memories,
        }).catch((error: unknown) => {
          // Non-fatal by design. The learner has already read Sam's reply on
          // screen; losing the side panels for one turn is a far smaller
          // failure than throwing away a message they just read.
          console.error("[chat stream] panels failed, degrading", error);
          return null;
        });

        const turn: TeacherTurn = {
          conversation,
          ...(panels ?? neutralPanels(session.currentLevel, topicLabel)),
        };

        const persisted = await persistReplyTurn({
          sessionId,
          session,
          userId,
          patternToDrill,
          turn,
        });

        controller.enqueue(
          ndjsonLine({
            type: STREAM_DONE,
            turn,
            teacherMessage: persisted.teacherMessage,
            level: persisted.level,
          }),
        );
        controller.close();
      } catch (error) {
        console.error("[chat stream]", error);
        try {
          controller.enqueue(
            ndjsonLine({
              type: STREAM_ERROR,
              error:
                "The tutor could not respond. Please try again.",
            }),
          );
        } finally {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
