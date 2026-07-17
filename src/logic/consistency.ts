import type { DayPrescription, Result } from '../types';
import { performanceCredit } from './credit';
import { addDays } from './dates';
import { parseCardioId } from './quests';

// Trailing-window math for Gate requirements. All windows INCLUDE endDate and
// reach back windowDays-1 more days. Dates are local YYYY-MM-DD strings, so
// ISO string comparison is a correct date comparison and midnight/timezone
// drift cannot split a day.

function windowStart(endDate: string, windowDays: number): string {
  return addDays(endDate, -(windowDays - 1));
}

function inWindow(date: string, endDate: string, windowDays: number): boolean {
  return date >= windowStart(endDate, windowDays) && date <= endDate;
}

/**
 * Consistency = (prescribed quests with a MET or ATTEMPTED result) / (all
 * prescribed quests) over the trailing window, as a 0–100 percent. Days
 * before install have no prescriptions and simply aren't in the denominator —
 * the Gate's level prerequisite supplies the history requirement.
 * No prescriptions in the window → 0.
 */
export function consistencyPercent(
  prescriptions: DayPrescription[],
  results: Result[],
  endDate: string,
  windowDays: number,
): number {
  let prescribed = 0;
  let done = 0;
  const logged = new Set(results.map((r) => `${r.date}|${r.questId}`));
  for (const day of prescriptions) {
    if (!inWindow(day.date, endDate, windowDays)) continue;
    for (const id of day.questIds) {
      prescribed++;
      if (logged.has(`${day.date}|${id}`)) done++;
    }
  }
  if (prescribed === 0) return 0;
  return (done / prescribed) * 100;
}

/** Days in the trailing window where the wake-window protocol was MET or better (late = ATTEMPTED, no hit). */
export function wakeWindowHits(results: Result[], endDate: string, windowDays: number): number {
  const days = new Set<string>();
  for (const r of results) {
    if (r.questId === 'mp:wake' && performanceCredit(r.status) && inWindow(r.date, endDate, windowDays)) {
      days.add(r.date);
    }
  }
  return days.size;
}

/**
 * Average easy-aerobic minutes per week over the trailing weeks. Performance
 * requirement: MET-or-better sessions only — ATTEMPTED never advances
 * performance. Credit comes from walk-run, z2 and long sessions — everything
 * the System itself prescribes as easy aerobic work counts toward what it
 * demands (intervals and tests are quality work and don't).
 */
export function zone2WeeklyAverage(results: Result[], endDate: string, weeks: number): number {
  let minutes = 0;
  for (const r of results) {
    if (!performanceCredit(r.status) || !inWindow(r.date, endDate, weeks * 7)) continue;
    const cardio = parseCardioId(r.questId);
    if (cardio && (cardio.kind === 'wr' || cardio.kind === 'z2' || cardio.kind === 'long')) minutes += cardio.minutes;
  }
  return minutes / weeks;
}

/**
 * How many of the trailing `weeks` consecutive 7-day blocks (ending endDate)
 * contain ≥2 MET-or-better strength sessions on distinct days.
 */
export function strengthWeeksSatisfied(results: Result[], endDate: string, weeks: number): number {
  let satisfied = 0;
  for (let w = 0; w < weeks; w++) {
    const blockEnd = addDays(endDate, -7 * w);
    const days = new Set<string>();
    for (const r of results) {
      if (performanceCredit(r.status) && r.questId.startsWith('str:') && inWindow(r.date, blockEnd, 7)) {
        days.add(r.date);
      }
    }
    if (days.size >= 2) satisfied++;
  }
  return satisfied;
}
