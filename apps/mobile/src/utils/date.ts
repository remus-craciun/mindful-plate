// Local-calendar-day date keys (YYYY-MM-DD) for the nutrition diary — a
// day's log should follow the user's own wall-clock day, not UTC's.
//
// `Date.toISOString()` converts to UTC first, so in any timezone ahead of
// UTC, calling it on a local midnight can report the previous calendar day
// (and shifting a date by ±1 via that round-trip silently cancels out or
// doubles, depending on direction). Everything here stays in local time —
// no `toISOString()` involved — so date-only arithmetic can't drift.

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  // JS normalizes an out-of-range day (e.g. day 32) into the next month,
  // so this correctly rolls across month/year boundaries.
  return getLocalDateKey(new Date(year, month - 1, day + days));
}
