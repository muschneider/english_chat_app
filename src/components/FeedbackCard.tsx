import type { Feedback } from "@/lib/ai/schema";

export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const hasCorrections = feedback.corrections.length > 0;
  const showCard =
    hasCorrections || feedback.nativeVersion || feedback.encouragement;
  if (!showCard) return null;

  return (
    <div className="ml-11 max-w-[85%] rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <span aria-hidden>✅</span> Feedback
      </p>

      {hasCorrections && (
        <ul className="space-y-2">
          {feedback.corrections.map((c, i) => (
            <li
              key={i}
              className="rounded-xl bg-slate-50 p-2.5 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-700"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700 line-through decoration-rose-300 dark:bg-rose-950/50 dark:text-rose-300">
                  {c.original}
                </span>
                <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                  →
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  {c.corrected}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {c.explanation}
              </p>
            </li>
          ))}
        </ul>
      )}

      {feedback.nativeVersion && (
        <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900 ring-1 ring-brand-100 dark:bg-brand-950/40 dark:text-brand-200 dark:ring-brand-900/60">
          <span className="font-semibold">🗣️ Like a native: </span>
          <span className="italic">{feedback.nativeVersion}</span>
        </div>
      )}

      {feedback.encouragement && (
        <p className="mt-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {feedback.encouragement}
        </p>
      )}
    </div>
  );
}
