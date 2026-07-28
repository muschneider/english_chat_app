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

export const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** The learner's LOCAL weekday — computed on the client, like the daypart. */
export function currentWeekday(date: Date = new Date()): Weekday {
  return WEEKDAYS[date.getDay()];
}

/** Narrow an unknown value to a valid Weekday (for request-body validation). */
export function isWeekday(value: unknown): value is Weekday {
  return typeof value === "string" && (WEEKDAYS as readonly string[]).includes(value);
}

/**
 * How long since the learner last wrote, in the words a person would use.
 *
 * This is what lets the tutor say "hey, it's been a while" instead of picking up
 * mid-sentence after four days of silence — one of the clearest signals that
 * you're talking to something that experiences time.
 *
 * Returns null for anything under ~10 minutes: a normal back-and-forth gap is
 * not worth mentioning, and prompting about it only invites noise.
 */
export function describeGap(since: Date, now: Date = new Date()): string | null {
  const minutes = Math.floor((now.getTime() - since.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 10) return null;

  if (minutes < 60) return `${minutes} minutes`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "about an hour" : `about ${hours} hours`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "a day";
  if (days < 7) return `${days} days`;

  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "a week";
  if (weeks < 5) return `${weeks} weeks`;

  const months = Math.floor(days / 30);
  return months === 1 ? "a month" : `${months} months`;
}
