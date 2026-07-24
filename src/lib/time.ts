/**
 * Time-of-day helpers so the tutor can greet the learner naturally
 * ("Morning!", "Evening 🙂"). The daypart is always computed from the
 * LEARNER'S LOCAL clock on the client and then passed to the server — the
 * server (Vercel) runs in UTC and would otherwise guess the wrong greeting.
 */

export const DAYPARTS = ["morning", "afternoon", "evening", "night"] as const;
export type Daypart = (typeof DAYPARTS)[number];

/** Map a 0–23 local hour to a friendly part of the day. */
export function daypartFromHour(hour: number): Daypart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

/** The current daypart from a Date (defaults to now, in local time). */
export function currentDaypart(date: Date = new Date()): Daypart {
  return daypartFromHour(date.getHours());
}

/** Narrow an unknown value to a valid Daypart (for request-body validation). */
export function isDaypart(value: unknown): value is Daypart {
  return typeof value === "string" && (DAYPARTS as readonly string[]).includes(value);
}
