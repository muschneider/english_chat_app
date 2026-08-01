/** Does the panels call actually need 24 messages of history, latency-wise? */
import { generateTeacherPanels } from "@/lib/ai/teacher";
import type { ModelMessage } from "ai";

const turn = (i: number): ModelMessage[] => [
  { role: "assistant", content: `So what happened with the ${i % 2 ? "trip" : "course"} in the end?` },
  { role: "user", content: `I think is fine. I go there last week and was ok, but my wife she dont like` },
];
const long: ModelMessage[] = Array.from({ length: 12 }, (_, i) => turn(i)).flat();
const learnerMessage = "I think I will cook a chicken. My wife she like it very much";
const samReply = "Nice, roast or fried? I burn chicken about half the time, so I'm taking notes here.";
long.push({ role: "user", content: learnerMessage });

const ctx = {
  intent: "reply" as const, currentLevel: "A2" as const, recentErrorScore: 2, topic: "Money",
  errorTally: [{ errorType: "verb_tense", label: "past simple", count: 2 }],
  learnerMessage, samReply,
};
const profile = { name: "Mauro", selfLevel: "A2" as const, nativeLanguage: "Português (Brasil)" };

for (const n of [24, 8, 4]) {
  const history = long.slice(-n);
  const times: number[] = [];
  let corrOk = 0;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    const p = await generateTeacherPanels({ history, context: ctx, profile, memories: [] });
    times.push(performance.now() - t0);
    const corr = p.feedback?.corrections ?? [];
    if (corr.length > 0 && corr.every((c) => learnerMessage.toLowerCase().includes(c.original.toLowerCase()))) corrOk++;
  }
  const avg = Math.round(times.reduce((a, b) => a + b) / times.length);
  console.log(`  history=${String(n).padStart(2)} msgs  avg=${String(avg).padStart(6)}ms  [${times.map((t) => Math.round(t)).join(", ")}]  feedback correto: ${corrOk}/3`);
}
