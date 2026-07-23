import type { Feedback } from "@/lib/ai/schema";

export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const hasCorrections = feedback.corrections.length > 0;
  const showCard =
    hasCorrections || feedback.nativeVersion || feedback.encouragement;
  if (!showCard) return null;

  return (
    <div className="relative ml-11 max-w-[85%] overflow-hidden rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 pl-4 shadow-md ring-1 ring-emerald-100/80 dark:border-emerald-700/70 dark:bg-emerald-950/50 dark:shadow-none dark:ring-emerald-900/60">
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-500 via-emerald-600 to-teal-700 dark:from-emerald-400 dark:via-emerald-500 dark:to-teal-600"
      />

      <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-200">
        <span
          aria-hidden
          className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-700 text-xs text-white shadow-sm"
        >
          ✅
        </span>
        Feedback
      </p>

      {hasCorrections && (
        <ul className="space-y-2">
          {feedback.corrections.map((c, i) => (
            <li
              key={i}
              className="rounded-xl border border-emerald-200/80 bg-white p-2.5 shadow-sm dark:border-emerald-800/60 dark:bg-slate-900/70"
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700 line-through decoration-rose-400 dark:bg-rose-950/70 dark:text-rose-200 dark:decoration-rose-500">
                  {c.original}
                </span>
                <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                  →
                </span>
                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-100">
                  {c.corrected}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {c.explanation}
              </p>
            </li>
          ))}
        </ul>
      )}

      {feedback.nativeVersion && (
        <div className="mt-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 shadow-sm dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-100">
          <span className="font-bold">🗣️ Like a native: </span>
          <span className="italic">{feedback.nativeVersion}</span>
        </div>
      )}

      {feedback.encouragement && (
        <p className="mt-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
          {feedback.encouragement}
        </p>
      )}
    </div>
  );
}
