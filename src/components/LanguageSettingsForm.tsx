"use client";

import { useState, useTransition } from "react";
import { LANGUAGES } from "@/lib/languages";
import { updateNativeLanguageAction } from "@/lib/auth/actions";

/**
 * Controlled native-language picker for the settings page. Uncontrolled
 * <select>s don't reliably reflect a new value after a server-action
 * revalidation, so we keep the selection in React state — it always shows
 * exactly what the learner chose and stays put after saving.
 */
export function LanguageSettingsForm({ initialLanguage }: { initialLanguage: string }) {
  const [savedLanguage, setSavedLanguage] = useState<string>(initialLanguage);
  const [language, setLanguage] = useState<string>(initialLanguage);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = language !== savedLanguage;
  const savedMeta = LANGUAGES.find((l) => l.code === savedLanguage);

  const save = () => {
    setSaved(false);
    startTransition(async () => {
      const res = await updateNativeLanguageAction(language);
      if (res.ok) {
        setSavedLanguage(res.nativeLanguage);
        setSaved(true);
      }
    });
  };

  return (
    <div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Sua língua nativa atual é{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {savedMeta ? `${savedMeta.flag} ${savedMeta.label}` : savedLanguage}
        </span>
        . A resposta do tutor, o feedback e a dica de gramática podem ser
        traduzidos para ela a qualquer momento.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Sua língua nativa
          </span>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              setSaved(false);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/60"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.flag} {l.label}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">
            Você pode mudar quando quiser.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar língua"}
          </button>
          {saved && !dirty && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Língua salva
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
