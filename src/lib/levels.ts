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
 * The learner's level must not swing on a single turn. The model emits
 * `suggestedLevelChange` every reply, and one good sentence is not evidence of
 * a whole CEFR level — acting on it directly used to let someone jump A1 → B1
 * in two messages and lose all their scaffolding mid-conversation.
 *
 * So the signal accumulates in `levelDrift` and only cashes out once it has
 * been consistent for a few turns. Two deliberate asymmetries:
 *  - Promoting takes MORE evidence than demoting (3 vs 2). Being under-helped
 *    is discouraging; being over-helped is merely redundant.
 *  - A reversal cancels momentum instead of merely decrementing it, so
 *    up/down/up/down noise never reaches a threshold.
 */
export const LEVEL_UP_THRESHOLD = 3;
export const LEVEL_DOWN_THRESHOLD = 2;

/**
 * Above this rolling error score the learner is visibly struggling, so an "up"
 * signal is treated as noise no matter how confident the model sounds.
 */
export const PROMOTION_ERROR_CEILING = 3;

export interface LevelSignal {
  level: CEFRLevel;
  /** Running, signed evidence counter persisted on the session. */
  drift: number;
  direction: "up" | "down" | "same";
  /** Rolling error score AFTER this turn's corrections. */
  errorScore: number;
}

export interface LevelSignalResult {
  level: CEFRLevel;
  drift: number;
  /** True when the level actually moved this turn (useful for logging/UI). */
  changed: boolean;
}

/** Decay an evidence counter one step toward zero. */
function decay(drift: number): number {
  if (drift > 0) return drift - 1;
  if (drift < 0) return drift + 1;
  return 0;
}

/**
 * Fold this turn's `suggestedLevelChange` into the running evidence and move
 * the level only when the evidence is strong enough.
 */
export function applyLevelSignal({
  level,
  drift,
  direction,
  errorScore,
}: LevelSignal): LevelSignalResult {
  // No signal, or an "up" while they are clearly struggling: let the evidence
  // fade rather than letting stale momentum tip a threshold later.
  if (direction === "same") {
    return { level, drift: decay(drift), changed: false };
  }

  if (direction === "up") {
    if (errorScore > PROMOTION_ERROR_CEILING) {
      return { level, drift: decay(drift), changed: false };
    }
    // A reversal resets momentum instead of just stepping it down.
    const next = drift <= 0 ? 1 : drift + 1;
    if (next >= LEVEL_UP_THRESHOLD) {
      const promoted = shiftLevel(level, "up");
      // At C2 there is nowhere to go — don't let evidence pile up forever.
      return {
        level: promoted,
        drift: 0,
        changed: promoted !== level,
      };
    }
    return { level, drift: next, changed: false };
  }

  const next = drift >= 0 ? -1 : drift - 1;
  if (next <= -LEVEL_DOWN_THRESHOLD) {
    const demoted = shiftLevel(level, "down");
    return { level: demoted, drift: 0, changed: demoted !== level };
  }
  return { level, drift: next, changed: false };
}

/**
 * Rolling measure of how much the learner is struggling:
 *  - each important correction bumps it up,
 *  - a clean turn lets it decay.
 * Feeds both the prompt (so the tutor can see the trend) and the promotion gate
 * above.
 */
export function nextErrorScore(current: number, corrections: number): number {
  const decayed = Math.max(0, current - (corrections === 0 ? 2 : 0));
  return Math.min(10, decayed + corrections);
}
