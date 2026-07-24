"use client";

import { useState } from "react";
import type { Toolkit } from "@/lib/ai/schema";
import { TranslatableText } from "./TranslatableText";

interface Props {
  toolkit: Toolkit;
  miniStructure: string | null;
  modelAnswer: string | null;
  defaultOpen?: boolean;
  nativeLanguage: string;
}

function ChipRow({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SurvivalKit({
  toolkit,
  miniStructure,
  modelAnswer,
  defaultOpen = false,
  nativeLanguage,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const hasVerbs = toolkit.usefulVerbs.length > 0;
  const hasExpr = toolkit.usefulExpressions.length > 0;
  const hasConn = toolkit.usefulConnectors.length > 0;
  const hasTip = Boolean(toolkit.grammarTip);
  const hasAnything =
    hasVerbs || hasExpr || hasConn || hasTip || miniStructure || modelAnswer;

  if (!hasAnything) return null;

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-brand-200/80 bg-brand-50/40 dark:border-brand-800/50 dark:bg-slate-900/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition hover:bg-brand-100/50 dark:hover:bg-slate-800/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          <span
            aria-hidden
            className="grid h-5 w-5 place-items-center rounded-full bg-brand-500/15 text-[11px] dark:bg-brand-400/15"
          >
            🧰
          </span>
          Helpful Toolkit
        </span>
        <svg
          className={`h-4 w-4 text-brand-500 transition-transform dark:text-brand-400 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div className="space-y-3.5 border-t border-brand-200/60 px-4 pb-4 pt-3.5 dark:border-brand-800/50">
          <ChipRow title="Useful verbs" items={toolkit.usefulVerbs} />
          <ChipRow title="Useful expressions" items={toolkit.usefulExpressions} />
          <ChipRow title="Useful connectors" items={toolkit.usefulConnectors} />

          {hasTip && (
            <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
              <p>
                <span className="font-semibold">💡 Grammar tip: </span>
                {toolkit.grammarTip}
              </p>
              <TranslatableText
                text={toolkit.grammarTip ?? ""}
                targetLang={nativeLanguage}
                tone="amber"
                label="dica"
              />
            </div>
          )}

          {miniStructure && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                ✨ Mini structure
              </p>
              <p className="whitespace-pre-line rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                {miniStructure}
              </p>
            </div>
          )}

          {modelAnswer && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Suggested answer
              </p>
              <p className="rounded-lg bg-emerald-50/70 px-3 py-2 text-sm italic text-emerald-900 ring-1 ring-emerald-200/70 dark:bg-emerald-950/30 dark:text-emerald-100 dark:ring-emerald-800/50">
                &ldquo;{modelAnswer}&rdquo;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
