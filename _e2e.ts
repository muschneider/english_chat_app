/**
 * End-to-end check of the real reply path: DB load -> split model call ->
 * NDJSON stream -> persistence. Measures what the learner actually experiences.
 * Rolls back everything it writes.
 */
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions, messages, users, userMemories, errorPatterns } from "@/lib/db/schema";
import { advanceConversationStream } from "@/lib/services/conversation";
import { readChatStream } from "@/lib/ai/chat-stream";

const [session] = await db.select().from(sessions).orderBy(desc(sessions.updatedAt)).limit(1);
if (!session) { console.log("no session to test with"); process.exit(0); }
const before = new Date();

console.log(`session=${session.id.slice(0, 8)} level=${session.currentLevel} topic=${session.topic}`);

const t0 = performance.now();
let tUserMsg: number | null = null;
let tFirstText: number | null = null;
let tDone: number | null = null;
let text = "";
let doneMsg: any = null;

const res = await advanceConversationStream({
  sessionId: session.id,
  userId: session.userId,
  intent: "reply",
  message: "yesterday I go to the park with my wife and we eat a very good pizza",
  daypart: "morning",
  weekday: "Friday",
});
if (!res) { console.log("stream returned null"); process.exit(1); }

await readChatStream(res, (m) => {
  if (m.type === "userMessage") tUserMsg ??= performance.now() - t0;
  else if (m.type === "partial") {
    if (m.partial.conversation) { tFirstText ??= performance.now() - t0; text = m.partial.conversation as string; }
  } else if (m.type === "done") { tDone = performance.now() - t0; doneMsg = m; }
  else if (m.type === "error") console.log("STREAM ERROR:", m.error);
});

const ms = (n: number | null) => (n == null ? "n/a" : `${Math.round(n)}ms`);
console.log(`\n  userMessage eco : ${ms(tUserMsg)}   (DB batch + insert)`);
console.log(`  1º caractere    : ${ms(tFirstText)}   <-- o que o usuário percebe`);
console.log(`  done (painéis)  : ${ms(tDone)}`);
console.log(`\n  Sam: ${text}`);

const turn = doneMsg?.turn;
console.log(`\n  painéis: feedback=${turn?.feedback ? `${turn.feedback.corrections.length} correções` : "null"}` +
  ` toolkit=${turn?.toolkit ? `${turn.toolkit.usefulVerbs.length}v/${turn.toolkit.usefulExpressions.length}e` : "null"}` +
  ` level=${turn?.level} levelVote=${turn?.suggestedLevelChange} memórias=${turn?.memoryUpdates?.length ?? 0}` +
  ` assessment=${turn?.assessment ? "sim" : "null"}`);
if (turn?.feedback?.corrections?.length) {
  for (const c of turn.feedback.corrections) console.log(`    - [${c.errorType}] "${c.original}" -> "${c.corrected}"`);
}
console.log(`  conversation limpo (sem <think>/JSON): ${!/<think>|^\s*[{[]/.test(text)}`);

// ---- rollback ----
await db.delete(messages).where(and(eq(messages.sessionId, session.id), gt(messages.createdAt, before)));
await db.delete(userMemories).where(and(eq(userMemories.userId, session.userId), gt(userMemories.updatedAt, before)));
await db.delete(errorPatterns).where(and(eq(errorPatterns.sessionId, session.id), gt(errorPatterns.lastSeenAt, before)));
await db.update(sessions).set({
  currentLevel: session.currentLevel, levelDrift: session.levelDrift,
  recentErrorScore: session.recentErrorScore, turnsSinceAssessment: session.turnsSinceAssessment,
  updatedAt: session.updatedAt,
}).where(eq(sessions.id, session.id));
console.log("\n  (rollback feito)");
