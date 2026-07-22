import type { StuckHelp as StuckHelpType } from "@/lib/ai/schema";

export function StuckHelp({ help }: { help: NonNullable<StuckHelpType> }) {
  return (
    <div className="ml-11 max-w-[85%] rounded-2xl border border-sky-200 bg-sky-50 p-3.5 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-bold text-sky-800">
        <span aria-hidden>🪜</span> Step-by-step help
        <span className="ml-1 rounded-full bg-sky-200 px-2 py-0.5 text-[11px] font-semibold text-sky-800">
          Level {help.level}
        </span>
      </p>

      {help.keywords.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-sky-600">
            Keywords
          </p>
          <div className="flex flex-wrap gap-1.5">
            {help.keywords.map((k, i) => (
              <span
                key={i}
                className="rounded-lg bg-white px-2 py-1 text-sm font-medium text-sky-700 ring-1 ring-sky-200"
              >
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {help.sentenceStarter && (
        <div className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-slate-700 ring-1 ring-sky-200">
          <span className="font-semibold text-sky-700">Try starting with: </span>
          <span className="italic">&ldquo;{help.sentenceStarter}&rdquo;</span>
        </div>
      )}

      {help.sampleAnswers && (
        <div className="mt-2 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">
            Three ways to answer
          </p>
          {(
            [
              ["Simple", help.sampleAnswers.simple],
              ["Natural", help.sampleAnswers.natural],
              ["Advanced", help.sampleAnswers.advanced],
            ] as const
          ).map(([label, text]) => (
            <div
              key={label}
              className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-sky-200"
            >
              <span className="mr-1.5 rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">
                {label}
              </span>
              <span className="italic text-slate-700">{text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
