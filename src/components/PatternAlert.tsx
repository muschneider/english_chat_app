import type { DetectedPattern } from "@/lib/ai/schema";

export function PatternAlert({ pattern }: { pattern: NonNullable<DetectedPattern> }) {
  return (
    <div className="ml-11 max-w-[85%] rounded-2xl border border-amber-300 bg-amber-50 p-3.5 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
        <span aria-hidden>🔎</span> I noticed a pattern
      </p>
      <p className="mt-1 text-sm leading-relaxed text-amber-900">
        {pattern.message}
      </p>
      {pattern.drills.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-600">
            Quick practice
          </p>
          <ul className="space-y-1">
            {pattern.drills.map((drill, i) => (
              <li
                key={i}
                className="rounded-lg bg-white/70 px-2.5 py-1.5 text-sm text-amber-900 ring-1 ring-amber-200"
              >
                {drill}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
