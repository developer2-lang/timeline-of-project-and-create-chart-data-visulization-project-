import { add, iso } from './dateUtils';
import type { Holiday } from '../types/timeline';

/**
 * Working calendar rules from timeline.html:
 *  - Sundays are always off.
 *  - If satRule is enabled, the 2nd and 4th Saturday of each month are off.
 *  - Declared public holidays are off.
 */

/** Which occurrence of the weekday within the month (1..5). */
function nthSat(d: Date): number {
  return Math.floor((d.getDate() - 1) / 7) + 1;
}

export function weekOff(d: Date): boolean {
  const g = d.getDay();
  if (g === 0) return true;
  if (g === 6) {
    const n = nthSat(d);
    return n === 2 || n === 4;
  }
  return false;
}

export function holidayMatch(d: Date, holidays: Holiday[]): Holiday | undefined {
  return holidays.find((h) => h.holidayDate === iso(d));
}

/** Is the given date a non-working day given the current rules and holidays? */
export function offDay(d: Date, satRule: boolean, holidays: Holiday[]): boolean {
  return (satRule ? weekOff(d) : d.getDay() === 0) || !!holidayMatch(d, holidays);
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
