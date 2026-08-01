import { z } from "zod";

/**
 * "This field may be null — and the model is allowed to just leave it out."
 *
 * Language models routinely omit a key entirely instead of writing `"x": null`,
 * especially deep inside a nested object. A bare `.nullable()` treats that as a
 * schema violation and throws away the whole turn — we measured a ~50% failure
 * rate on hint turns purely because `stuckHelp.sampleAnswers` went missing.
 *
 * `.default(null)` makes an absent key mean exactly what a written `null` means.
 * The parsed type is unchanged (`T | null`), so nothing downstream has to care.
 */
const maybe = <T extends z.ZodTypeAny>(schema: T) => schema.nullable().default(null);

/** Same idea for list fields: an omitted array means an empty one, not a failure. */
const maybeList = <T extends z.ZodTypeAny>(item: T) => z.array(item).default([]);

/** CEFR proficiency levels the adaptive engine moves between. */
export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const cefrLevelSchema = z.enum(CEFR_LEVELS);
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

/** Categories used to file the durable facts the tutor remembers about a learner. */
export const MEMORY_CATEGORIES = [
  "personal",
  "family",
  "work",
  "education",
  "preferences",
  "goals",
  "health",
  "other",
] as const;

/** A durable fact about the learner to remember across sessions. */
export const memoryUpdateSchema = z.object({
  key: z
    .string()
    .describe(
      "A stable snake_case slug identifying this durable fact, e.g. 'spouse', 'children', 'job', 'employer', 'city', 'hometown', 'pet', 'english_goal'. REUSE the same key to overwrite a fact that changed (e.g. moved city).",
    ),
  fact: z
    .string()
    .describe(
      "A short third-person statement of the fact, e.g. 'Is married to Maria', 'Works as a nurse', 'Lives in São Paulo', 'Has a dog named Rex'.",
    ),
  category: z.enum(MEMORY_CATEGORIES).describe("Which bucket this fact belongs to."),
});
export type MemoryUpdate = z.infer<typeof memoryUpdateSchema>;

/** A periodic, honest estimate of the learner's CEFR level. */
export const assessmentSchema = maybe(
  z.object({
    estimatedLevel: cefrLevelSchema.describe(
      "Your honest overall CEFR estimate of the learner based on the whole conversation so far.",
    ),
    summary: z
      .string()
      .describe(
        "2-3 warm, encouraging sentences explaining the estimate in simple English.",
      ),
    strengths: maybeList(z.string()).describe(
      "2-3 concrete things the learner already does well.",
    ),
    focusAreas: maybeList(z.string()).describe(
      "2-3 concrete, actionable things to improve next.",
    ),
  }),
);
export type Assessment = z.infer<typeof assessmentSchema>;

/** A single grammar/vocabulary correction of the learner's previous message. */
export const correctionSchema = z.object({
  errorType: z
    .string()
    .describe(
      "A short stable slug for the error category, e.g. 'present_perfect', 'third_person_s', 'article_a_an', 'preposition', 'word_order'. Reuse the SAME slug for the same kind of mistake so patterns can be tracked.",
    ),
  original: z.string().describe("The exact wrong fragment the learner wrote."),
  corrected: z.string().describe("The corrected fragment."),
  explanation: z
    .string()
    .describe("Why it was wrong. Max 2 short lines. Simple, friendly."),
});
export type Correction = z.infer<typeof correctionSchema>;

/** Post-answer feedback about the learner's previous message. */
export const feedbackSchema = z.object({
  // Nothing reads this — the panel derives "are there errors?" from
  // `corrections.length`. Defaulted so its absence can't discard a turn.
  hasErrors: z.boolean().default(false),
  corrections: maybeList(correctionSchema).describe(
    "Only the MOST IMPORTANT mistakes (max 3). Do not overwhelm the learner. Empty if the message was good.",
  ),
  nativeVersion: maybe(z.string()).describe(
    "How a native speaker would naturally say the learner's whole idea. Null if the learner was already natural.",
  ),
  // The panel already renders this conditionally, so an empty string just means
  // "no encouragement this turn" — much cheaper than losing the feedback.
  encouragement: z
    .string()
    .default("")
    .describe(
      "One short, specific note about what they got RIGHT in the language (a tense they nailed, a natural-sounding phrase). Concrete, not cheerleading — never 'Great job!' or 'You're doing great!'.",
    ),
});
export type Feedback = z.infer<typeof feedbackSchema>;

/** The 'survival kit' shown BEFORE the learner answers. */
export const toolkitSchema = z.object({
  usefulVerbs: maybeList(z.string()).describe("Relevant verbs for the answer."),
  usefulExpressions: maybeList(z.string()).describe(
    "Common expressions/sentence frames the learner can reuse.",
  ),
  usefulConnectors: maybeList(z.string()).describe(
    "Connectors like because, but, although, so, however.",
  ),
  grammarTip: maybe(z.string()).describe(
    "One quick, applicable grammar tip. Null when not needed.",
  ),
});
export type Toolkit = z.infer<typeof toolkitSchema>;

/** Escalating help when the learner is stuck (requested explicitly). */
export const stuckHelpSchema = maybe(
  z.object({
    level: z
      .number()
      .int()
      .min(1)
      .max(3)
      .describe("1 = keywords, 2 = sentence starter, 3 = three model answers."),
    keywords: maybeList(z.string()).describe("Level 1: a few key words only."),
    sentenceStarter: maybe(z.string()).describe(
      "Level 2: the beginning of a sentence, e.g. 'I usually...'.",
    ),
    sampleAnswers: maybe(
      z.object({
        simple: z.string(),
        natural: z.string(),
        advanced: z.string(),
      }),
    ).describe("Level 3: three complete answers of increasing richness."),
  }),
);
export type StuckHelp = z.infer<typeof stuckHelpSchema>;

/** Triggered when the same error type reaches 3 occurrences. */
export const detectedPatternSchema = maybe(
  z.object({
    errorType: z.string(),
    message: z
      .string()
      .describe(
        "Friendly 'I noticed a pattern' explanation of the recurring mistake. Shown in its OWN panel — never inside 'conversation'.",
      ),
    drills: maybeList(z.string()).describe(
      "2-3 quick practice prompts targeting exactly this point. Shown in the pattern panel, not the chat.",
    ),
  }),
);
export type DetectedPattern = z.infer<typeof detectedPatternSchema>;

/** The full structured teacher turn returned by the model. */
export const teacherTurnSchema = z.object({
  conversation: z
    .string()
    .describe(
      "Sam texting his friend, in English. Usually 1-2 sentences; sometimes four words; occasionally four or five sentences when there's a real story. React to what they actually said BEFORE anything else, add something of your own (an opinion, a small complaint, what your cat just did), and about three times out of four end with ONE genuine question. Plain text only — no markdown, no lists, no bold, at most a rare emoji. NEVER restate their message back, never praise them for writing, never say 'That's fascinating' / 'I'd love to hear more' / 'thank you for sharing'. NEVER put corrections, tips, vocabulary, sentence frames, model answers or any teaching here — all of that goes in the feedback/toolkit fields. Vary your opening and your length from the previous message. Never wrap up or end the conversation.",
    ),
  // `topic` and `level` are write-only: the model states them, nothing reads
  // them back (the UI uses the session's own topic slug and adaptive level).
  // They earn their place as scaffolding — naming the level before filling the
  // toolkit keeps the help calibrated. The defaults are therefore arbitrary and
  // exist for one reason: a missing key must never cost the learner the turn.
  topic: z
    .string()
    .default("")
    .describe("Short label of the current topic, e.g. 'Travel'."),
  level: cefrLevelSchema
    .default("B1")
    .describe(
      "The adaptive level you are teaching at THIS turn, based on the learner's demonstrated ability.",
    ),
  toolkit: toolkitSchema.describe(
    "The survival kit shown in the HELPFUL TOOLKIT panel (never in the chat). Fill richly for A1-A2, lighter for B1, and mostly empty arrays for B2+.",
  ),
  miniStructure: maybe(z.string()).describe(
    "A simple answer template like 'I usually + verb...'. Provide for A1-A2, null for B1+.",
  ),
  modelAnswer: maybe(z.string()).describe(
    "A suggested full answer. ONLY for A1. Null for A2 and above.",
  ),
  feedback: maybe(feedbackSchema).describe(
    "Correction of the learner's PREVIOUS message, shown in the FEEDBACK panel (never inside 'conversation'). Null on the very first turn (no message yet) and when the turn is a stuck-help response.",
  ),
  detectedPattern: detectedPatternSchema.describe(
    "Set only when the same error type has now happened 3 times. Otherwise null.",
  ),
  stuckHelp: stuckHelpSchema.describe(
    "Set ONLY when the learner asked for help / is stuck. When set, do NOT ask a new question; keep the same current question.",
  ),
  // "same" is the adaptive engine's no-op, so an omitted vote simply means
  // "no evidence this turn" instead of throwing the whole turn away.
  suggestedLevelChange: z
    .enum(["up", "down", "same"])
    .default("same")
    .describe(
      "Whether the learner's level should nudge up (doing well), down (struggling), or stay.",
    ),
  memoryUpdates: maybeList(memoryUpdateSchema).describe(
    "Durable personal facts about the LEARNER revealed in their latest message that must be remembered across sessions (spouse, children, job, employer, city, pets, goals, strong likes/dislikes…). Empty array when nothing durable was revealed. Do NOT store transient small talk or facts about other people unrelated to the learner.",
  ),
  assessment: assessmentSchema.describe(
    "A fresh CEFR level assessment. Fill this ONLY when the tutor state says it is assessment time; otherwise null. Never mention the assessment inside 'conversation'.",
  ),
});
export type TeacherTurn = z.infer<typeof teacherTurnSchema>;

/**
 * The structured side-panels of a teacher turn, WITHOUT the chat text.
 *
 * Why this exists: a tutor "reply" used to be a single `generateObject` call
 * emitting `conversation` + all the panels at once. With a reasoning model
 * that made the chat text invisible until the whole JSON was done, because the
 * model has to commit to JSON structure from the first token. So the reply is
 * now split into two parallel calls:
 *
 *   1. `streamText` — produces `conversation` (free text, streams immediately).
 *   2. `generateObject(panelsSchema)` — produces everything else (the side
 *      panels: toolkit, feedback, assessment, patterns, level vote, memory).
 *
 * Each panel field judges the learner's PAST messages (already in `history`),
 * never the new reply text, so it's safe to generate them in parallel with the
 * chat. `hint` and new-session `start` turns keep the original single-call
 * `teacherTurnSchema` path — they're not the hot path, and `start` has no
 * previous message to correct while still needing the toolkit.
 */
export const panelsSchema = teacherTurnSchema.omit({ conversation: true });
export type Panels = z.infer<typeof panelsSchema>;
