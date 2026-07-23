"use client";

import { useState, useTransition } from "react";
import { CEFR_LEVELS, type CEFRLevel } from "@/lib/ai/schema";
import { LEVEL_META } from "@/lib/levelMeta";
import { updateEnglishLevelAction } from "@/lib/auth/actions";

/**
 * Controlled level picker for the settings page. Uncontrolled <select>s don't
 * reliably reflect a new value after a server-action revalidation, so we keep
 * the selection in React state — it always shows exactly what the learner chose
 * and stays put after saving.
 */
export function LevelSettingsForm({ initialLevel }: { initialLevel: CEFRLevel }) {
  const [savedLevel, setSavedLevel] = useState<CEFRLevel>(initialLevel);
  const [level, setLevel] = useState<CEFRLevel>(initialLevel);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const meta = LEVEL_META[savedLevel];
  const dirty = level !== savedLevel;

  const save = () => {
    setSaved(false);
    startTransition(async () => {
      const res = await updateEnglishLevelAction(level);
      if (res.ok) {
        setSavedLevel(res.level);
        setSaved(true);
      }
    });
  };

  return (
    <div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Seu nível atual é{" "}
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {savedLevel} · {meta.label}
        </span>
        . Novas conversas começam a partir dele.
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Seu nível de inglês
          </span>
          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value as CEFRLevel);
              setSaved(false);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/60"
          >
            {CEFR_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l} · {LEVEL_META[l].label}
              </option>
            ))}
          </select>
          <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">
            A dificuldade ainda se adapta sozinha durante a conversa.
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Salvar nível"}
          </button>
          {saved && !dirty && (
            <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              ✓ Nível salvo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
