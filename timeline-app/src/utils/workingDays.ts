import { add, iso } from './dateUtils';
import type { Holiday } from '../types/timeline';

/**
 * Working calendar rules:
 *  - Only Sundays are non-working days (Sunday = 0).
 *  - Monday through Saturday are always working days.
 *  - The 2nd and 4th Saturday are never excluded.
 *  - Public holidays never change a date's working-day status.
 *
 * `satRule` and `holidays` are accepted for API compatibility but ignored —
 * the working-day rule is centralized in `isWorkingDay`.
 */

/** The single, centralized working-day rule: only Sunday is non-working. */
export function isWorkingDay(d: Date): boolean {
  return d.getDay() !== 0;
}

/** Is the given date a Sunday? Sundays are the only weekly non-working day. */
export function weekOff(d: Date): boolean {
  return !isWorkingDay(d);
}

export function holidayMatch(d: Date, holidays: Holiday[]): Holiday | undefined {
  return holidays.find((h) => h.holidayDate === iso(d));
}

/** Is the given date a non-working day? Only Sundays (never public holidays). */
export function offDay(d: Date, _satRule: boolean, _holidays: Holiday[]): boolean {
  return !isWorkingDay(d);
}

/** Advance to the next working day at or after d. */
export function nextWork(
  d: Date | null,
  satRule: boolean,
  holidays: Holiday[]
): Date {
  let x = d ? new Date(d) : new Date();
  let g = 0;
  while (offDay(x, satRule, holidays) && g < 400) {
    x = add(x, 1);
    g++;
  }
  return x;
}

/**
 * n working days forward from start; start itself counts as 0.
 * Mirrors plusWork() in timeline.html.
 */
export function plusWork(
  start: Date,
  n: number,
  satRule: boolean,
  holidays: Holiday[]
): Date {
  let x = nextWork(start, satRule, holidays);
  let c = 0;
  let g = 0;
  while (c < n && g < 900) {
    x = add(x, 1);
    if (!offDay(x, satRule, holidays)) c++;
    g++;
  }
  return x;
}

/** Count of working days strictly between a (inclusive) and b (inclusive). */
export function workDays(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined,
  satRule: boolean,
  holidays: Holiday[]
): number {
  const s = typeof a === 'string' ? (a ? new Date(a) : null) : a;
  const e = typeof b === 'string' ? (b ? new Date(b) : null) : b;
  if (!s || !e || e < s) return 0;
  let n = 0;
  for (let d = new Date(s); d <= e; d = add(d, 1)) {
    if (!offDay(d, satRule, holidays)) n++;
  }
  return n;
}
