// Local-calendar-day date keys (YYYY-MM-DD) for the nutrition diary, computed
// against an explicit IANA timezone (the server's, fetched via /health and
// held in the store) rather than the device's own ambient timezone — a
// self-hosted single-user app should follow the server's day boundary
// consistently, not whatever timezone happens to be set on the phone.

export const DEFAULT_TIMEZONE = 'UTC';

function getDatePartsInTimeZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function getDateKey(timeZone: string, date: Date = new Date()): string {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  // Pure calendar-date arithmetic done entirely in UTC: no time-of-day is
  // ever attached, so there's no local-offset or DST ambiguity to round-trip
  // through — this needs no timezone parameter at all.
  const d = new Date(Date.UTC(year, month - 1, day + days));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
