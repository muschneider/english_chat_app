import type { Feedback } from "@/lib/ai/schema";
import { TranslatableText } from "./TranslatableText";

export function FeedbackCard({
  feedback,
  nativeLanguage,
}: {
  feedback: Feedback;
  nativeLanguage: string;
}) {
  const hasCorrections = feedback.corrections.length > 0;
  const showCard =
    hasCorrections || feedback.nativeVersion || feedback.encouragement;
  if (!showCard) return null;

  const divider =
    "border-t border-emerald-200/60 pt-3 dark:border-emerald-900/50";

  return (
    <div className="ml-11 max-w-[85%] rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
        <span
          aria-hidden
          className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-300"
        >
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 010 1.4l-7.8 7.8a1 1 0 01-1.4 0l-3.8-3.8a1 1 0 011.4-1.4l3.1 3.1 7.1-7.1a1 1 0 011.4 0z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        Feedback
      </p>

      {hasCorrections && (
        <ul className="divide-y divide-emerald-200/50 dark:divide-emerald-900/40">
          {feedback.corrections.map((c, i) => (
            <li key={i} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium text-rose-500 line-through decoration-rose-400/50 dark:text-rose-300">
                  {c.original}
                </span>
                <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                  →
                </span>
                <span className="rounded-md bg-emerald-100/70 px-1.5 py-0.5 font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-100">
                  {c.corrected}
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {c.explanation}
              </p>
              <TranslatableText
                text={c.explanation}
                targetLang={nativeLanguage}
                tone="emerald"
                label="explicação"
              />
            </li>
          ))}
        </ul>
      )}

      {feedback.nativeVersion && (
        <div className={`mt-3 ${hasCorrections ? divider : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            🗣️ Like a native
          </p>
          <p className="mt-1 text-sm italic text-slate-700 dark:text-slate-200">
            {feedback.nativeVersion}
          </p>
        </div>
      )}

      {feedback.encouragement && (
        <div
          className={`mt-3 ${
            hasCorrections || feedback.nativeVersion ? divider : ""
          }`}
        >
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            {feedback.encouragement}
          </p>
          <TranslatableText
            text={feedback.encouragement}
            targetLang={nativeLanguage}
            tone="emerald"
            label="feedback"
          />
        </div>
      )}
    </div>
  );
}
