//import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

//export const TEACHER_MODEL_ID = process.env.OPENCODE_MODEL ?? "claude-sonnet-5";
//export const TEACHER_MODEL_ID = "deepseek-v4-flash";
export const TEACHER_MODEL_ID = "deepseek-v4-pro";

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
