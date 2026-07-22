import type { CEFRLevel } from "@/lib/ai/schema";
import { LEVEL_META } from "@/lib/levelMeta";

export function LevelBadge({ level }: { level: CEFRLevel }) {
  const meta = LEVEL_META[level];
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${meta.chip}`}
      title={`${meta.label} — ${meta.help}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
      <span>{meta.level}</span>
      <span className="hidden font-medium opacity-70 sm:inline">
        · {meta.help}
      </span>
    </div>
  );
}
