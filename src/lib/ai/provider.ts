import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * Recommended model for this app: Claude Sonnet 5.
 * - Best-in-class instruction following for the adaptive A1–C2 logic.
 * - Highly reliable structured (tool) output for the toolkit + feedback panels.
 * - Strong grammar/nuance understanding, essential for an English tutor.
 * - Great cost/quality balance ($2 in / $10 out per 1M) for a chatty app.
 *
 * Override with OPENCODE_MODEL (e.g. `claude-haiku-4-5` for a cheaper tutor).
 */
export const TEACHER_MODEL_ID = process.env.OPENCODE_MODEL ?? "claude-sonnet-5";

let cached: LanguageModel | null = null;

/**
 * Lazily build the opencode Zen model. Zen exposes Anthropic models through an
 * Anthropic-compatible endpoint at https://opencode.ai/zen/v1 (the provider
 * appends `/messages`) and authenticates with the standard `x-api-key` header,
 * which the AI SDK sets from `apiKey`.
 *
 * Kept lazy so importing this module during `next build` never throws.
 */
export function getTeacherModel(): LanguageModel {
  if (cached) return cached;

  const apiKey = process.env.OPENCODE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENCODE_API_KEY is not set. Copy .env.example to .env.local and add your opencode Zen key.",
    );
  }

  const opencode = createAnthropic({
    baseURL: "https://opencode.ai/zen/v1",
    apiKey,
  });

  cached = opencode(TEACHER_MODEL_ID);
  return cached;
}
