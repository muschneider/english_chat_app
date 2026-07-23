"use client";

import { useState } from "react";
import { getLanguage } from "@/lib/languages";
import { useTranslate } from "@/lib/hooks/useTranslate";

/**
 * The on-demand translator: a small "translate" button and, when opened, a
 * translation panel.
 *
 * IMPORTANT: this component does NOT render the original text — that's the
 * caller's job (the text sits in a different DOM node, usually inside the
 * message bubble or the feedback card). The component only owns the
 * trigger button + the translation panel that appears below it.
 *
 * The button is hidden entirely when the learner's native language is
 * English — there's nothing to translate to.
 *
 * Use this ONLY for the EXPLANATORY text (grammar tip, correction
 * explanation, encouragement, the teacher's spoken line). The actual
 * English vocabulary / verbs / expressions the learner is supposed to learn
 * must stay in English and should NOT be wrapped in this component.
 */
export function TranslatableText({
  text,
  targetLang,
  /** Visual tone for the translation panel. */
  tone = "neutral",
  /** Optional label shown next to the button (e.g. "tutor", "feedback"). */
  label,
}: {
  text: string;
  targetLang: string;
  tone?: "neutral" | "amber" | "emerald" | "sky" | "violet";
  label?: string;
}) {
  const lang = getLanguage(targetLang);
  const isEnglishTarget = targetLang.startsWith("en");
  const { translate } = useTranslate();

  const [open, setOpen] = useState(false);
  const [translation, setTranslation] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);

  if (isEnglishTarget) return null;

  const onToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (translation || busy) return;
    setBusy(true);
    setErrored(false);
    const t = await translate(text, targetLang);
    setBusy(false);
    if (t == null) {
      setErrored(true);
    } else {
      setTranslation(t);
    }
  };

  const toneClasses: Record<NonNullable<typeof tone>, string> = {
    neutral:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
    amber:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-100",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-100",
    sky:
      "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-100",
    violet:
      "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-100",
  };

  return (
    <span className="block">
      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 align-middle">
        <button
          type="button"
          onClick={onToggle}
          aria-label={
            open
              ? `Ocultar tradução em ${lang.label}`
              : `Traduzir para ${lang.label}`
          }
          title={open ? "Ocultar tradução" : `Traduzir para ${lang.label}`}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:border-brand-500 dark:hover:text-brand-300"
        >
          <span aria-hidden>🌐</span>
          {label ? `${lang.flag} ${label}` : `${lang.flag} ${lang.code}`}
        </button>

        {open && busy && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-200 border-t-brand-500"
            />
            traduzindo…
          </span>
        )}

        {open && errored && !busy && (
          <button
            type="button"
            onClick={onToggle}
            className="text-[11px] font-semibold text-rose-600 hover:underline dark:text-rose-400"
          >
            falhou — tentar de novo
          </button>
        )}
      </span>

      {open && (
        <span
          className={`mt-1.5 block rounded-lg border px-3 py-2 text-sm leading-relaxed shadow-sm ${toneClasses[tone]}`}
        >
          {translation ? (
            <span className="whitespace-pre-wrap break-words">
              {translation}
            </span>
          ) : busy ? (
            <span className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-500"
              />
              traduzindo…
            </span>
          ) : errored ? (
            <span className="text-rose-600 dark:text-rose-400">
              não foi possível traduzir agora.
            </span>
          ) : null}
        </span>
      )}
    </span>
  );
}
