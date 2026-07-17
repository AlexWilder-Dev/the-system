/** Local calendar date as YYYY-MM-DD (never UTC — days roll at the user's midnight). */
export function localDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Local calendar date of an ISO timestamp. Never slice(0, 10) an ISO string
 * for scheduling — that yields the UTC date and can anchor week cadence to
 * the wrong day for anyone assessed in the evening west of UTC.
 */
export function localDateOfISO(iso: string): string {
  return localDateStr(new Date(iso));
}

/** Add n days (n may be negative) to a YYYY-MM-DD string. */
export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12); // noon dodges DST edges
  dt.setDate(dt.getDate() + n);
  return localDateStr(dt);
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** "2026-07-16" → "16 JUL 2026" */
export function formatDisplayDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return `${String(d).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
}
