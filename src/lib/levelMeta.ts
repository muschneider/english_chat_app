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
    chip: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  A2: {
    level: "A2",
    label: "Elementary",
    help: "Verbs + expressions + structure",
    dot: "bg-orange-500",
    chip: "bg-orange-50 text-orange-700 ring-orange-200",
  },
  B1: {
    level: "B1",
    label: "Intermediate",
    help: "Light hints only",
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  B2: {
    level: "B2",
    label: "Upper-int.",
    help: "No prior help · corrections after",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  C1: {
    level: "C1",
    label: "Advanced",
    help: "Subtle corrections only",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-700 ring-sky-200",
  },
  C2: {
    level: "C2",
    label: "Proficient",
    help: "Feedback on request · style focus",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-700 ring-violet-200",
  },
};
