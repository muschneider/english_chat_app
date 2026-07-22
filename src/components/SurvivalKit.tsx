"use client";

import { useState } from "react";
import type { Toolkit } from "@/lib/ai/schema";

interface Props {
  toolkit: Toolkit;
  miniStructure: string | null;
  modelAnswer: string | null;
  defaultOpen?: boolean;
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
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
    <div className="mt-2 overflow-hidden rounded-2xl border border-brand-100 bg-brand-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left transition hover:bg-brand-100/50"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-brand-800">
          <span aria-hidden>🧰</span> Helpful Toolkit
        </span>
        <svg
          className={`h-4 w-4 text-brand-600 transition-transform ${open ? "rotate-180" : ""}`}
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
        <div className="space-y-3 px-4 pb-4 pt-1">
          <ChipRow
            title="Useful verbs"
            items={toolkit.usefulVerbs}
            tone="bg-white text-slate-700 ring-slate-200"
          />
          <ChipRow
            title="Useful expressions"
            items={toolkit.usefulExpressions}
            tone="bg-white text-brand-700 ring-brand-200"
          />
          <ChipRow
            title="Useful connectors"
            items={toolkit.usefulConnectors}
            tone="bg-white text-emerald-700 ring-emerald-200"
          />

          {hasTip && (
            <div className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
              <span className="font-semibold">💡 Grammar tip: </span>
              {toolkit.grammarTip}
            </div>
          )}

          {miniStructure && (
            <div className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                ✨ Mini structure
              </p>
              <p className="whitespace-pre-line font-medium">{miniStructure}</p>
            </div>
          )}

          {modelAnswer && (
            <div className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900 ring-1 ring-emerald-200">
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
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
