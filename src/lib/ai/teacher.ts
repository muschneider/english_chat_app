import { generateObject, type ModelMessage } from "ai";
import type { UserMemoryRow } from "@/lib/db/schema";
import { getTeacherModel } from "./provider";
import { teacherTurnSchema, type TeacherTurn } from "./schema";
import { z } from "zod";
import {
  TEACHER_SYSTEM_PROMPT,
  buildContextBlock,
  buildProfileBlock,
  type LearnerProfile,
  type TurnContext,
} from "./prompt";

const outputFormatBlock = [
  "=== OUTPUT FORMAT ===",
  "Always respond with a single json object (no markdown fences, no prose around it) " +
    "matching this JSON Schema:",
  JSON.stringify(z.toJSONSchema(teacherTurnSchema)),
].join("\n");

export interface GenerateTurnArgs {
  history: ModelMessage[];
  context: TurnContext;
  /** Who the learner is — always known, so the tutor never loses their identity. */
  profile: LearnerProfile;
  /** Durable, cross-session facts the tutor already knows about the learner. */
  memories: UserMemoryRow[];
}

/**
 * Calls Claude Sonnet 5 (via opencode Zen) and returns the structured
 * teacher turn. The learner's identity + long-term memory and the dynamic tutor
 * state are merged into the system prompt so they never leak into the visible
 * conversation text.
 */
export async function generateTeacherTurn({
  history,
  context,
  profile,
  memories,
}: GenerateTurnArgs): Promise<TeacherTurn> {
  //const system = [
  //  TEACHER_SYSTEM_PROMPT,
  //  buildProfileBlock(profile, memories),
  // buildContextBlock(context),
  //].join("\n\n");
  const system = [
    TEACHER_SYSTEM_PROMPT,
    buildProfileBlock(profile, memories),
    buildContextBlock(context),
    outputFormatBlock, // ← novo: contém a palavra "json" + o schema
  ].join("\n\n");

  // The AI SDK requires at least one message. On the very first turn there is
  // no learner message yet, so we seed a kickoff instruction. It is phrased as
  // a stage direction rather than a fake learner line ("let's begin our
  // lesson") — a seed that sounds like a student asking for class pulls the
  // model straight back into teacher mode, which is exactly what this app is
  // trying to avoid.
  const messages: ModelMessage[] =
    history.length > 0
      ? history
      : [
          {
            role: "user",
            content:
              "[The chat window just opened. Nothing has been said yet. Send the first message.]",
          },
        ];

  const { object } = await generateObject({
    model: getTeacherModel(),
    schema: teacherTurnSchema,
    system,
    messages,
    // Note: claude-sonnet-5 ignores `temperature`, so we omit it.
    // The structured turn can be large: on a single turn the model may emit
    // conversation + full A1 toolkit + feedback + a periodic assessment + a
    // detectedPattern. At 1800 the JSON was getting truncated (finishReason
    // 'length' → unparseable object). Give it comfortable headroom; the model
    // still stops as soon as the object is complete, so normal turns stay cheap
    // and are actually FASTER (they finish instead of running to the cap).
    maxOutputTokens: 4096,
    maxRetries: 2,
  });

  return object;
}
