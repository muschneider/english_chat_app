import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { getCurrentUser } from "@/lib/auth/session";
import { getTeacherModel } from "@/lib/ai/provider";
import { buildTranslatePrompt } from "@/lib/ai/translatePrompt";
import { getLanguage, isLanguageCode } from "@/lib/languages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  targetLang: z.string().min(2).max(8),
});

/**
 * POST /api/translate -> translate a short English string into the learner's
 * native language. Used on demand by the FEEDBACK, HELPFUL TOOLKIT and tutor
 * response panels.
 *
 * NOTE: the learner's own `nativeLanguage` from the session is the source of
 * truth — the client passes it back in `targetLang` so we never persist a
 * stale value. Authentication is required so anonymous callers can't burn
 * the API key.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isLanguageCode(parsed.targetLang)) {
    return NextResponse.json(
      { error: "Unsupported target language." },
      { status: 400 },
    );
  }

  // English is the source language; nothing to translate to.
  if (parsed.targetLang.startsWith("en")) {
    return NextResponse.json({ translation: parsed.text });
  }

  const lang = getLanguage(parsed.targetLang);

  try {
    const { text } = await generateText({
      model: getTeacherModel(),
      system: buildTranslatePrompt(lang.label),
      prompt: parsed.text,
      maxOutputTokens: 600,
      maxRetries: 2,
    });

    return NextResponse.json({ translation: text.trim() });
  } catch (error) {
    console.error("[api/translate POST]", error);
    return NextResponse.json(
      { error: "Translation failed. Please try again." },
      { status: 500 },
    );
  }
}
