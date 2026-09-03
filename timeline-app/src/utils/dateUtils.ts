export const MON = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const DAY = 86400000;

/** Convert a Date to an iso 'YYYY-MM-DD' string. */
export function iso(d: Date | null | undefined): string {
  const x = d instanceof Date ? d : new Date(d ?? 0);
  return (
    x.getFullYear() +
    '-' +
    String(x.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(x.getDate()).padStart(2, '0')
  );
}

/** Parse an 'YYYY-MM-DD' string into a local Date. */
export function pd(s: string | null | undefined): Date | null {
  if (!s) return null;
  const parts = s.split('-').map(Number);
  if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

/** Format a date as 'DD-Mon-YYYY'. */
export function fmt(s: string | Date): string {
  const d = typeof s === 'string' ? pd(s) : s;
  return d
    ? String(d.getDate()).padStart(2, '0') + '-' + MON[d.getMonth()] + '-' + d.getFullYear()
    : '—';
}

/** Format a date as 'DD Mon'. */
export function fmtS(s: string | Date): string {
  const d = typeof s === 'string' ? pd(s) : s;
  return d ? String(d.getDate()).padStart(2, '0') + ' ' + MON[d.getMonth()] : '—';
}

/** Add n calendar days to a Date. */
export function add(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Difference in whole days (b - a), using calendar dates. */
export function diff(a: Date, b: Date): number {
  return Math.round((pd(iso(b)) as Date).getTime() - (pd(iso(a)) as Date).getTime()) / DAY;
}

/** Today at midnight local. */
export function today(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

/** Generate a UUID v4 (suitable for Supabase `uuid` primary key columns). */
export function uid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** The Monday of the week containing d. */
export function monday(d: Date): Date {
  return add(d, -((d.getDay() + 6) % 7));
}
