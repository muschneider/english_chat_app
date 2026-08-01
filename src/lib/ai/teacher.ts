import {
  NoObjectGeneratedError,
  generateObject,
  streamText,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import type { UserMemoryRow } from "@/lib/db/schema";
import { getTeacherModel } from "./provider";
import {
  panelsSchema,
  teacherTurnSchema,
  type Panels,
  type TeacherTurn,
} from "./schema";
import {
  TEACHER_SYSTEM_PROMPT,
  buildChatSystem,
  buildContextBlock,
  buildPanelsSystem,
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

/** One open `{` or `[`, and what has been written inside it since the last comma. */
interface Frame {
  open: "{" | "[";
  /** Offset in the output of the last comma at this depth, or -1 if none yet. */
  commaAt: number;
  /** Has a `:` been written at this depth since that comma? (objects) */
  sawColon: boolean;
  /** Has anything at all been written since that comma? (arrays) */
  sawValue: boolean;
}

/**
 * Last-resort repair for a structured response the JSON parser rejected.
 *
 * Models damage structured output in a small number of very repeatable ways,
 * and every one of them otherwise costs the learner an entire turn. All the
 * ones seen in production here are the same mistake — the model begins another
 * member, thinks better of it, and closes the container anyway:
 *
 *     …"grammarTip":"Use I usually + verb.","}          ← a bare quote
 *     …"encouragement":"Hi is natural.",""}             ← an empty string
 *
 * plus plain truncation, where the response simply ends a `}` short.
 *
 * So rather than pattern-matching each variant, this enforces the underlying
 * rule: **after a comma, an object owes you `"key": value` and an array owes
 * you a value. If the container closes before that arrives, everything from
 * the comma onward is junk.** Truncation is then just the same rule applied at
 * end-of-input, with the missing brackets appended.
 *
 * It only ever DELETES trailing punctuation and APPENDS closing brackets —
 * never rewrites a value — so it cannot turn a wrong answer into a plausible
 * one. The worst case is that it deletes a member the model half-wrote, which
 * is exactly what the schema defaults are there to absorb.
 *
 * The result is re-parsed before being handed back: if the repair didn't
 * actually produce valid JSON we return null and `generateObject` throws
 * exactly as it would have.
 *
 * Exported for testing.
 */
export function repairModelJson({ text }: { text: string }): Promise<string | null> {
  const original = text.trim();

  // ```json … ``` fences.
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(original);
  const src = fenced ? fenced[1].trim() : original;

  const stack: Frame[] = [];
  let out = "";
  let inString = false;
  let escaped = false;

  /** Mark that the innermost container now holds a value for its current member. */
  const noteValue = () => {
    const top = stack[stack.length - 1];
    if (top) top.sawValue = true;
  };

  /**
   * Cut `text` back to the last comma when the member it promised never
   * materialised. An object owes a `:`; an array just owes a value.
   */
  const dropIncompleteMember = (text: string, frame: Frame): string => {
    const complete = frame.open === "{" ? frame.sawColon : frame.sawValue;
    return frame.commaAt >= 0 && !complete ? text.slice(0, frame.commaAt) : text;
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      // A quote opening a key the model never finished, with the container
      // closing right after it (`,"}`). Left alone it would swallow the brace
      // into a string and corrupt everything downstream, so catch it here —
      // the general rule below can only see structure it can still parse.
      const rest = src.slice(i + 1).trimStart();
      if (
        (rest.startsWith("}") || rest.startsWith("]")) &&
        out.trimEnd().endsWith(",")
      ) {
        continue;
      }
      inString = true;
      noteValue();
      out += ch;
      continue;
    }

    if (ch === "{" || ch === "[") {
      noteValue();
      stack.push({ open: ch, commaAt: -1, sawColon: false, sawValue: false });
      out += ch;
      continue;
    }

    if (ch === "}" || ch === "]") {
      const frame = stack.pop();
      if (frame) out = dropIncompleteMember(out, frame);
      out += ch;
      noteValue();
      continue;
    }

    const top = stack[stack.length - 1];
    if (top) {
      if (ch === ",") {
        top.commaAt = out.length;
        top.sawColon = false;
        top.sawValue = false;
      } else if (ch === ":") {
        top.sawColon = true;
      } else if (!/\s/.test(ch)) {
        top.sawValue = true;
      }
    }
    out += ch;
  }

  // Whatever is still open was cut off mid-write: terminate the string, then
  // work outwards discarding each unfinished member and closing its container.
  let s = inString ? `${out}"` : out;
  while (stack.length > 0) {
    const frame = stack.pop()!;
    s = dropIncompleteMember(s, frame).replace(/,\s*$/, "");
    s += frame.open === "{" ? "}" : "]";
  }

  if (s === original) return Promise.resolve(null);
  try {
    JSON.parse(s);
  } catch {
    return Promise.resolve(null);
  }
  // Worth surfacing: a model that needs repairing often is a model about to
  // start failing outright, and it is completely invisible otherwise.
  console.warn("[teacher] repaired a malformed structured response");
  return Promise.resolve(s);
}

const CALL_OPTIONS = {
  // The structured turn can be large: on a single turn the model may emit
  // conversation + full A1 toolkit + feedback + a periodic assessment + a
  // detectedPattern. At 1800 the JSON was getting truncated (finishReason
  // 'length' → unparseable object). Give it comfortable headroom; the model
  // still stops as soon as the object is complete, so normal turns stay cheap
  // and are actually FASTER (they finish instead of running to the cap).
  maxOutputTokens: 4096,
  // NOTE: `maxRetries` only covers retryable transport/API errors. A response
  // that arrives intact but doesn't parse is NOT retried by the SDK — that's
  // what `experimental_repairText` and `withStructuredRetry` are for.
  maxRetries: 2,
  experimental_repairText: repairModelJson,
} as const;

/**
 * Run a structured call again if the model's output couldn't be turned into an
 * object.
 *
 * `repairModelJson` fixes the malformations we've actually seen, but the set of
 * ways a model can mangle JSON is open-ended — we found a second variant hours
 * after shipping the first fix. Sampling is the cheap, general answer: the same
 * prompt run twice almost never breaks the same way twice.
 *
 * Costs one extra round-trip, and only on the rare turn that failed. That is
 * always the better trade here: on `start` and `hint` the alternative is an
 * error in the learner's face, and on the panels it's a turn with no feedback.
 */
async function withStructuredRetry<T>(
  label: string,
  call: () => Promise<T>,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!NoObjectGeneratedError.isInstance(error)) throw error;
    console.warn(`[teacher] ${label}: unparseable object, retrying once`);
    return call();
  }
}

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

  return withStructuredRetry("turn", async () => {
    const { object } = await generateObject({
      model: getTeacherModel(),
      schema: teacherTurnSchema,
      system,
      messages,
      ...CALL_OPTIONS,
    });
    return object;
  });
}

// `streamTeacherTurn` used to live here: one `streamObject(teacherTurnSchema)`
// call that emitted the chat text and every panel together. It was removed
// because it made the tutor feel broken — the model has to commit to JSON
// structure from the very first token, so nothing reached the screen until the
// whole object was ready (measured at 39.5 s with a reasoning model, 2.9 s
// with a fast one). The reply path is now split; see below.

// ---------------------------------------------------------------------------
// Split reply: chat (streamed free text) + panels (one structured object),
// run in parallel by the service. See `buildChatSystem`/`buildPanelsSystem`
// for the rationale.
// ---------------------------------------------------------------------------

/**
 * Stream only the chat reply (the `conversation` text) as free text — no JSON
 * schema, no structured commitment. `onTextDelta` is invoked on every text
 * chunk the model emits, so the chat bubble grows immediately while the
 * side-panels call is still running. Resolves to the full text once finished.
 *
 * This is what makes a tutor "reply" feel instant with a reasoning model: the
 * model doesn't have to commit to JSON structure before writing Sam's line.
 */
export async function streamTeacherChat(
  args: GenerateTurnArgs,
  onTextDelta: (delta: string) => void,
): Promise<string> {
  const { history, context, profile, memories } = args;
  const system = buildChatSystem(profile, memories, context);

  // On the very first turn there is no learner message yet; seed a kickoff
  // instruction (mirrors `buildTurnInput` for the combined path).
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

  const result = streamText({
    model: getTeacherModel(),
    system,
    messages,
    // Chat text is short by design (1–5 sentences). Plenty of headroom; the
    // model stops as soon as Sam's line is naturally done.
    maxOutputTokens: 1024,
    maxRetries: 2,
  });

  let full = "";
  for await (const delta of result.textStream) {
    if (delta) {
      full += delta;
      onTextDelta(delta);
    }
  }
  return full;
}

/**
 * Generate only the structured side-panels (feedback / toolkit / assessment /
 * patterns / level vote / memory) as one JSON object. The chat text is
 * produced by a parallel `streamTeacherChat` call. Resolves to the validated
 * `Panels` object once the model finishes.
 */
export async function generateTeacherPanels(
  args: GenerateTurnArgs,
): Promise<Panels> {
  const { history, context, profile, memories } = args;
  const system = buildPanelsSystem(profile, memories, context);

  // The panels call receives the SAME history (with the new user message
  // appended) as the chat call — every panel field judges the learner's
  // PAST messages, never the reply about to be written.
  const messages: ModelMessage[] =
    history.length > 0
      ? history
      : [
          {
            role: "user",
            content:
              "[The chat window just opened. Nothing has been said yet. There is no previous message to correct; feedback=null, assessment=null.]",
          },
        ];

  return withStructuredRetry("panels", async () => {
    const { object } = await generateObject({
      model: getTeacherModel(),
      schema: panelsSchema,
      system,
      messages,
      ...CALL_OPTIONS,
    });
    return object;
  });
}