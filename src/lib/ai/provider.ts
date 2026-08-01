//import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * The model behind the tutor.
 *
 * Chosen by measurement, not by reputation. The tutor's hot path is "learner
 * sends a message → Sam's first characters hit the screen", so the metric that
 * matters is time-to-first-visible-token, and right behind it, whether the
 * model can reliably emit the side-panels JSON.
 *
 * Measured on the app's real prompts (opencode Go, reply turn, ~15 memories):
 *
 *   model              chat visible   panels JSON
 *   deepseek-v4-pro       39.5 s       (reasoning model: burns thousands of
 *                                       thinking tokens before the 1st char)
 *   deepseek-v4-flash     13.2 s        31.9 s
 *   grok-4.5               6.5 s        19.2 s
 *   minimax-m3             1.0 s        FAILS  (+ leaks <think> into the chat)
 *   glm-5.2                0.9 s        FAILS  (invalid JSON)
 *   gpt-5.6-luna           1.7–3.1 s     4.2–6.0 s   ← both fast AND reliable
 *
 * The sub-second models are disqualified on output quality, not speed: they
 * echo the prompt's few-shot examples back verbatim, and minimax leaks its
 * reasoning block into the visible message.
 */
export const TEACHER_MODEL_ID = "gpt-5.6-luna";

let cached: LanguageModel | null = null;

/**
 * Lazily build the opencode Zen model. Zen exposes Anthropic models through an
 * Anthropic-compatible endpoint at https://opencode.ai/zen/v1 (the provider
 * appends `/messages`) and authenticates with the standard `x-api-key` header,
 * which the AI SDK sets from `apiKey`.
 *
 * Kept lazy so importing this module during `next build` never throws.
 */
//export function getTeacherModel(): LanguageModel {
//  if (cached) return cached;
//
//  const apiKey = process.env.OPENCODE_GO_API_KEY;
//  if (!apiKey) {
//    throw new Error(
//      "OPENCODE_GO_API_KEY is not set. Copy .env.example to .env.local and add your opencode Zen key.",
//    );
//  }
//
//  const opencode = createAnthropic({
//    //baseURL: "https://opencode.ai/zen/v1",
//    baseURL: "https://opencode.ai/zen/go/v1",
//    apiKey,
//  });
//
//  cached = opencode(TEACHER_MODEL_ID);
//  return cached;
//}

export function getTeacherModel(): LanguageModel {
  if (cached) return cached;

  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENCODE_GO_API_KEY is not set. Copy .env.example to .env.local and add your opencode Go key (https://opencode.ai/auth).",
    );
  }

  const opencode = createOpenAICompatible({
    name: "opencode-go",
    baseURL: "https://opencode.ai/zen/go/v1",
    apiKey,
  });

  cached = opencode(TEACHER_MODEL_ID);
  return cached;
}
