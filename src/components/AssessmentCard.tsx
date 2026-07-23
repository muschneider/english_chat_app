"use client";

import { useState, useTransition } from "react";
import type { Assessment, CEFRLevel } from "@/lib/ai/schema";
import { updateEnglishLevelAction } from "@/lib/auth/actions";
import { LEVEL_META } from "@/lib/levelMeta";

interface Props {
  assessment: NonNullable<Assessment>;
  /** The learner's current self-declared level, to compare with the suggestion. */
  currentLevel: CEFRLevel;
  sessionId: string | null;
  /** Called after the suggested level is applied, to sync the app's badge. */
  onLevelAccepted?: (level: CEFRLevel) => void;
}

function LevelPill({ level }: { level: CEFRLevel }) {
  const meta = LEVEL_META[level];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${meta.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {level} · {meta.label}
    </span>
  );
}

export function AssessmentCard({
  assessment,
  currentLevel,
  sessionId,
  onLevelAccepted,
}: Props) {
  const [applied, setApplied] = useState(false);
  const [pending, startTransition] = useTransition();

  const suggested = assessment.estimatedLevel;
  const sameLevel = suggested === currentLevel;

  const apply = () => {
    startTransition(async () => {
      const result = await updateEnglishLevelAction(
        suggested,
        sessionId ?? undefined,
      );
      if (result.ok) {
        setApplied(true);
        onLevelAccepted?.(suggested);
      }
    });
  };

  return (
    <div className="ml-11 max-w-[90%] rounded-2xl border border-violet-200 bg-violet-50 p-3.5 shadow-sm dark:border-violet-900/60 dark:bg-violet-950/40">
      <p className="flex items-center gap-1.5 text-sm font-bold text-violet-800 dark:text-violet-300">
        <span aria-hidden>📊</span> Avaliação do seu nível
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-violet-900/80 dark:text-violet-200/80">
        <span>Sugestão do tutor:</span>
        <LevelPill level={suggested} />
        {!sameLevel && (
          <>
            <span aria-hidden>·</span>
            <span>
              atual: <strong>{currentLevel}</strong>
            </span>
          </>
        )}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-violet-900 dark:text-violet-100">
        {assessment.summary}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {assessment.strengths.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              💪 Pontos fortes
            </p>
            <ul className="space-y-1">
              {assessment.strengths.map((s, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-white/70 px-2.5 py-1.5 text-sm text-slate-700 ring-1 ring-emerald-100 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-emerald-900/50"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {assessment.focusAreas.length > 0 && (
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              🎯 Focar em
            </p>
            <ul className="space-y-1">
              {assessment.focusAreas.map((f, i) => (
                <li
                  key={i}
                  className="rounded-lg bg-white/70 px-2.5 py-1.5 text-sm text-slate-700 ring-1 ring-amber-100 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-amber-900/50"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="mt-3">
        {applied ? (
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            ✓ Nível atualizado para {suggested}.
          </p>
        ) : sameLevel ? (
          <p className="text-sm text-violet-700 dark:text-violet-300">
            Seu nível <strong>{currentLevel}</strong> está confirmado. Continue
            assim! 🎉
          </p>
        ) : (
          <button
            type="button"
            onClick={apply}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Aplicando…" : `Ajustar meu nível para ${suggested}`}
          </button>
        )}
      </div>
    </div>
  );
}
