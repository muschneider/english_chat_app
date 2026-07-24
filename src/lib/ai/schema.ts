import { z } from "zod";

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
export const assessmentSchema = z
  .object({
    estimatedLevel: cefrLevelSchema.describe(
      "Your honest overall CEFR estimate of the learner based on the whole conversation so far.",
    ),
    summary: z
      .string()
      .describe(
        "2-3 warm, encouraging sentences explaining the estimate in simple English.",
      ),
    strengths: z
      .array(z.string())
      .describe("2-3 concrete things the learner already does well."),
    focusAreas: z
      .array(z.string())
      .describe("2-3 concrete, actionable things to improve next."),
  })
  .nullable();
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
  hasErrors: z.boolean(),
  corrections: z
    .array(correctionSchema)
    .describe(
      "Only the MOST IMPORTANT mistakes (max 3). Do not overwhelm the learner. Empty if the message was good.",
    ),
  nativeVersion: z
    .string()
    .nullable()
    .describe(
      "How a native speaker would naturally say the learner's whole idea. Null if the learner was already natural.",
    ),
  encouragement: z
    .string()
    .describe("One short, warm, genuine positive note about what went well."),
});
export type Feedback = z.infer<typeof feedbackSchema>;

/** The 'survival kit' shown BEFORE the learner answers. */
export const toolkitSchema = z.object({
  usefulVerbs: z.array(z.string()).describe("Relevant verbs for the answer."),
  usefulExpressions: z
    .array(z.string())
    .describe("Common expressions/sentence frames the learner can reuse."),
  usefulConnectors: z
    .array(z.string())
    .describe("Connectors like because, but, although, so, however."),
  grammarTip: z
    .string()
    .nullable()
    .describe("One quick, applicable grammar tip. Null when not needed."),
});
export type Toolkit = z.infer<typeof toolkitSchema>;

/** Escalating help when the learner is stuck (requested explicitly). */
export const stuckHelpSchema = z
  .object({
    level: z
      .number()
      .int()
      .min(1)
      .max(3)
      .describe("1 = keywords, 2 = sentence starter, 3 = three model answers."),
    keywords: z.array(z.string()).describe("Level 1: a few key words only."),
    sentenceStarter: z
      .string()
      .nullable()
      .describe("Level 2: the beginning of a sentence, e.g. 'I usually...'."),
    sampleAnswers: z
      .object({
        simple: z.string(),
        natural: z.string(),
        advanced: z.string(),
      })
      .nullable()
      .describe("Level 3: three complete answers of increasing richness."),
  })
  .nullable();
export type StuckHelp = z.infer<typeof stuckHelpSchema>;

/** Triggered when the same error type reaches 3 occurrences. */
export const detectedPatternSchema = z
  .object({
    errorType: z.string(),
    message: z
      .string()
      .describe(
        "Friendly 'I noticed a pattern' explanation of the recurring mistake. Shown in its OWN panel — never inside 'conversation'.",
      ),
    drills: z
      .array(z.string())
      .describe(
        "2-3 quick practice prompts targeting exactly this point. Shown in the pattern panel, not the chat.",
      ),
  })
  .nullable();
export type DetectedPattern = z.infer<typeof detectedPatternSchema>;

/** The full structured teacher turn returned by the model. */
export const teacherTurnSchema = z.object({
  conversation: z
    .string()
    .describe(
      "PURE friendly chat IN ENGLISH, like texting a warm, funny friend: react to what the learner said, then ask ONE contextual follow-up question. Match their tone and length, show empathy, use light humor when it fits. NEVER put corrections, tips, vocabulary, sentence frames, model answers or any teaching here — all of that goes in the feedback/toolkit fields. Never generic, never end the conversation.",
    ),
  topic: z.string().describe("Short label of the current topic, e.g. 'Travel'."),
  level: cefrLevelSchema.describe(
    "The adaptive level you are teaching at THIS turn, based on the learner's demonstrated ability.",
  ),
  toolkit: toolkitSchema.describe(
    "The survival kit shown in the HELPFUL TOOLKIT panel (never in the chat). Fill richly for A1-A2, lighter for B1, and mostly empty arrays for B2+.",
  ),
  miniStructure: z
    .string()
    .nullable()
    .describe(
      "A simple answer template like 'I usually + verb...'. Provide for A1-A2, null for B1+.",
    ),
  modelAnswer: z
    .string()
    .nullable()
    .describe("A suggested full answer. ONLY for A1. Null for A2 and above."),
  feedback: feedbackSchema
    .nullable()
    .describe(
      "Correction of the learner's PREVIOUS message, shown in the FEEDBACK panel (never inside 'conversation'). Null on the very first turn (no message yet) and when the turn is a stuck-help response.",
    ),
  detectedPattern: detectedPatternSchema.describe(
    "Set only when the same error type has now happened 3 times. Otherwise null.",
  ),
  stuckHelp: stuckHelpSchema.describe(
    "Set ONLY when the learner asked for help / is stuck. When set, do NOT ask a new question; keep the same current question.",
  ),
  suggestedLevelChange: z
    .enum(["up", "down", "same"])
    .describe(
      "Whether the learner's level should nudge up (doing well), down (struggling), or stay.",
    ),
  memoryUpdates: z
    .array(memoryUpdateSchema)
    .describe(
      "Durable personal facts about the LEARNER revealed in their latest message that must be remembered across sessions (spouse, children, job, employer, city, pets, goals, strong likes/dislikes…). Empty array when nothing durable was revealed. Do NOT store transient small talk or facts about other people unrelated to the learner.",
    ),
  assessment: assessmentSchema.describe(
    "A fresh CEFR level assessment. Fill this ONLY when the tutor state says it is assessment time; otherwise null. Never mention the assessment inside 'conversation'.",
  ),
});
export type TeacherTurn = z.infer<typeof teacherTurnSchema>;
