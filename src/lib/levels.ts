import { CEFR_LEVELS, type CEFRLevel } from "@/lib/ai/schema";

export function levelIndex(level: CEFRLevel): number {
  return CEFR_LEVELS.indexOf(level);
}

export function shiftLevel(
  level: CEFRLevel,
  direction: "up" | "down" | "same",
): CEFRLevel {
  if (direction === "same") return level;
  const idx = levelIndex(level);
  const nextIdx =
    direction === "up"
      ? Math.min(idx + 1, CEFR_LEVELS.length - 1)
      : Math.max(idx - 1, 0);
  return CEFR_LEVELS[nextIdx];
}

/**
 * The learner's level should not swing wildly. We only actually move a level
 * after a couple of consistent signals, tracked via `recentErrorScore`:
 *  - each important correction bumps the score up (struggling),
 *  - a clean, praised turn lets it decay (improving).
 */
export function nextErrorScore(current: number, corrections: number): number {
  const decayed = Math.max(0, current - (corrections === 0 ? 2 : 0));
  return Math.min(10, decayed + corrections);
}
