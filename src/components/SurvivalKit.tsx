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

function ChipRow({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
        {title}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className={`rounded-lg px-2 py-1 text-sm font-medium ring-1 ${tone}`}
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
    <div className="relative mt-3 overflow-hidden rounded-2xl border-2 border-brand-300 bg-brand-50 shadow-md ring-1 ring-brand-200/70 dark:border-brand-600/70 dark:bg-slate-900 dark:shadow-none dark:ring-brand-800/60">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-500 via-brand-600 to-brand-700 dark:from-brand-400 dark:via-brand-500 dark:to-brand-600"
      />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 pl-5 text-left transition hover:bg-brand-100/80 dark:hover:bg-slate-800/80"
      >
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-800 dark:text-white">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-xs text-white shadow-sm"
          >
            🧰
          </span>
          Helpful Toolkit
        </span>
        <svg
          className={`h-4 w-4 text-brand-700 transition-transform dark:text-brand-300 ${open ? "rotate-180" : ""}`}
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
        <div className="space-y-3.5 border-t border-brand-200 bg-white/70 px-4 pb-4 pt-3 dark:border-brand-800/70 dark:bg-slate-950/70">
          <ChipRow
            title="Useful verbs"
            items={toolkit.usefulVerbs}
            tone="bg-white text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
          />
          <ChipRow
            title="Useful expressions"
            items={toolkit.usefulExpressions}
            tone="bg-white text-brand-700 ring-brand-300 dark:bg-slate-800 dark:text-indigo-300 dark:ring-indigo-700/70"
          />
          <ChipRow
            title="Useful connectors"
            items={toolkit.usefulConnectors}
            tone="bg-white text-emerald-700 ring-emerald-300 dark:bg-slate-800 dark:text-emerald-300 dark:ring-emerald-700/70"
          />

          {hasTip && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm dark:border-amber-600/70 dark:bg-amber-950/60 dark:text-amber-100">
              <p>
                <span className="font-bold">💡 Grammar tip: </span>
                {/* Translate only the EXPLANATORY tip. The vocabulary below */}
                {/* (verbs, expressions, connectors) stays in English by */}
                {/* design — it's what the learner is here to learn. */}
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
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                ✨ Mini structure
              </p>
              <p className="whitespace-pre-line font-medium">{miniStructure}</p>
            </div>
          )}

          {modelAnswer && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 shadow-sm dark:border-emerald-600/70 dark:bg-emerald-950/60 dark:text-emerald-100">
              <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                Suggested answer
              </p>
              <p className="italic">&ldquo;{modelAnswer}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
