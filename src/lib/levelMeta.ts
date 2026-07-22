import type { CEFRLevel } from "@/lib/ai/schema";

export interface LevelMeta {
  level: CEFRLevel;
  label: string;
  help: string;
  dot: string;
  chip: string;
}

export const LEVEL_META: Record<CEFRLevel, LevelMeta> = {
  A1: {
    level: "A1",
    label: "Beginner",
    help: "Full kit + model answer",
    dot: "bg-rose-500",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-900/60",
  },
  A2: {
    level: "A2",
    label: "Elementary",
    help: "Verbs + expressions + structure",
    dot: "bg-orange-500",
    chip: "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-900/60",
  },
  B1: {
    level: "B1",
    label: "Intermediate",
    help: "Light hints only",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-900/60",
  },
  B2: {
    level: "B2",
    label: "Upper-int.",
    help: "No prior help · corrections after",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60",
  },
  C1: {
    level: "C1",
    label: "Advanced",
    help: "Subtle corrections only",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:ring-sky-900/60",
  },
  C2: {
    level: "C2",
    label: "Proficient",
    help: "Feedback on request · style focus",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900/60",
  },
};
