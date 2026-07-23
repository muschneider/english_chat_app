"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TOPICS } from "@/lib/topics";

interface Props {
  /** Start a new conversation. `undefined` topic means "random / surprise me". */
  onStart: (topic?: string) => void;
  disabled?: boolean;
}

/**
 * The "New conversation" control. Opens a centered modal so the learner can
 * start a fresh chat on a random subject (default) or pick any specific topic.
 *
 * The modal is rendered through a portal on document.body so it escapes the
 * header's stacking/`backdrop-filter` context (which would otherwise trap and
 * clip the overlay behind the chat).
 */
export function TopicPicker({ onStart, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Lock body scroll and close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const choose = (topic?: string) => {
    setOpen(false);
    onStart(topic);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Nova conversa"
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        + Nova
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Escolher assunto da conversa"
          >
            {/* Backdrop */}
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Card */}
            <div className="animate-bubble-in relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Nova conversa
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sobre o que você quer conversar?
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>

              <button
                type="button"
                onClick={() => choose(undefined)}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 px-3 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-brand-600 hover:to-brand-800"
              >
                <span aria-hidden className="text-base">🎲</span>
                Surpreenda-me (assunto aleatório)
              </button>

              <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-3">
                {TOPICS.map((t) => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => choose(t.slug)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-brand-950/40"
                  >
                    <span aria-hidden className="text-base">{t.emoji}</span>
                    <span className="truncate">{t.pt}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
