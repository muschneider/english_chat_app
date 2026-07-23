/**
 * The learner's native language. Used by the in-app translator so the learner
 * can see an on-demand translation of the tutor's words, the feedback, and the
 * grammar tip in their own language — without us having to embed bilingual
 * prompts in the main teacher call.
 *
 * - `code`    : ISO 639-1 (with optional region) — the stable identifier
 *               stored in `users.native_language`. Never translated.
 * - `label`   : the language name shown in the UI, in that language itself
 *               (Português, Español, Français, …). Helps the learner spot
 *               their own language at a glance.
 * - `flag`    : a small emoji flag used as a visual cue in pickers.
 */
export interface Language {
  code: string;
  label: string;
  flag: string;
}

export const LANGUAGES: readonly Language[] = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "pt-PT", label: "Português (Portugal)", flag: "🇵🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "uk", label: "Українська", flag: "🇺🇦" },
  { code: "el", label: "Ελληνικά", flag: "🇬🇷" },
  { code: "cs", label: "Čeština", flag: "🇨🇿" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "hu", label: "Magyar", flag: "🇭🇺" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "da", label: "Dansk", flag: "🇩🇰" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
  { code: "fi", label: "Suomi", flag: "🇫🇮" },
  { code: "zh", label: "中文 (普通话)", flag: "🇨🇳" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
  { code: "he", label: "עברית", flag: "🇮🇱" },
  { code: "fa", label: "فارسی", flag: "🇮🇷" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  { code: "ur", label: "اردو", flag: "🇵🇰" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "tl", label: "Filipino", flag: "🇵🇭" },
] as const;

/** Valid language codes, handy for request validation. */
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);

/** The default native language used when none is chosen. */
export const DEFAULT_LANGUAGE = "pt-BR";

/** True when `code` is one of the supported language codes. */
export function isLanguageCode(value: unknown): value is string {
  return typeof value === "string" && LANGUAGE_CODES.includes(value as string);
}

/** Resolve a Language by code, falling back to DEFAULT_LANGUAGE. */
export function getLanguage(code: string | null | undefined): Language {
  if (!code) return getLanguage(DEFAULT_LANGUAGE);
  return LANGUAGES.find((l) => l.code === code) ?? getLanguage(DEFAULT_LANGUAGE);
}
