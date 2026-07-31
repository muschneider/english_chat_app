import {
  generateObject,
  streamObject,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import type { UserMemoryRow } from "@/lib/db/schema";
import { getTeacherModel } from "./provider";
import { teacherTurnSchema, type TeacherTurn } from "./schema";
import {
  TEACHER_SYSTEM_PROMPT,
  buildContextBlock,
  buildProfileBlock,
  type LearnerProfile,
  type TurnContext,
} from "./prompt";
import type { DeepPartial } from "./types";

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
 * Build the shared system prompt + message list passed to the model for a turn.
 * Used both by the non-streaming (`generateTeacherTurn`) and the streaming
 * (`streamTeacherTurn`) paths, so the two stay byte-for-byte equivalent.
 */
function buildTurnInput({
  history,
  context,
  profile,
  memories,
}: GenerateTurnArgs) {
  const system = [
    TEACHER_SYSTEM_PROMPT,
    buildProfileBlock(profile, memories),
    buildContextBlock(context),
    outputFormatBlock, // ← necessary: the schema word + the JSON Schema
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

  return { system, messages };
}

const CALL_OPTIONS = {
  // The structured turn can be large: on a single turn the model may emit
  // conversation + full A1 toolkit + feedback + a periodic assessment + a
  // detectedPattern. At 1800 the JSON was getting truncated (finishReason
  // 'length' → unparseable object). Give it comfortable headroom; the model
  // still stops as soon as the object is complete, so normal turns stay cheap
  // and are actually FASTER (they finish instead of running to the cap).
  maxOutputTokens: 4096,
  maxRetries: 2,
} as const;

/**
 * Calls the teacher model (via opencode Zen) and returns the structured
 * teacher turn. The learner's identity + long-term memory and the dynamic tutor
 * state are merged into the system prompt so they never leak into the visible
 * conversation text.
 */
export async function generateTeacherTurn(
  args: GenerateTurnArgs,
): Promise<TeacherTurn> {
  const { system, messages } = buildTurnInput(args);

  const { object } = await generateObject({
    model: getTeacherModel(),
    schema: teacherTurnSchema,
    system,
    messages,
    ...CALL_OPTIONS,
  });

  return object;
}

/**
 * Streams the structured teacher turn, yielding partial objects as the JSON
 * fills in. `onPartial` is invoked on every emitted partial (the tutor's
 * `conversation` field is the first to grow, so the chat bubble starts
 * rendering before the whole structured turn is ready). Resolves to the final,
 * schema-validated `TeacherTurn` once the stream finishes.
 */
export async function streamTeacherTurn(
  args: GenerateTurnArgs,
  onPartial: (partial: DeepPartial<TeacherTurn>) => void,
): Promise<TeacherTurn> {
  const { system, messages } = buildTurnInput(args);

  const result = streamObject({
    model: getTeacherModel(),
    schema: teacherTurnSchema,
    system,
    messages,
    ...CALL_OPTIONS,
  });

  for await (const partial of result.partialObjectStream) {
    // The SDK's `PartialObject` is structurally close to `DeepPartial<TeacherTurn>`
    // but represents still-growing array elements as `T | undefined`, which our
    // hand-rolled `DeepPartial` does not. The runtime shape is fine for the
    // client (it only reads `conversation` during streaming); cast once here.
    onPartial(partial as unknown as DeepPartial<TeacherTurn>);
  }

  const object = await result.object;
  if (!object) {
    throw new Error(
      "Teacher stream finished without a valid object. The model output may not have matched the schema.",
    );
  }
  return object;
}