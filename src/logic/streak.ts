import { addDays } from './dates';

export interface StreakResult {
  days: number;
  /** A tolerated miss sits inside the last 7 days — surfaced neutrally as "Rest Day". */
  restDayUsed: boolean;
}

/**
 * Streak = consecutive days with ≥1 completion, walking back from today.
 * Forgiveness: one missed day per rolling 7 is a Rest Day and does not break
 * the run. A second miss within 7 days of the previous one resets the streak
 * to whatever was earned after the more recent miss — quietly, no penalty.
 * An incomplete *today* is neutral: the day is not over yet.
 */
export function computeStreak(completedDates: Iterable<string>, today: string): StreakResult {
  const set = new Set(completedDates);
  if (set.size === 0) return { days: 0, restDayUsed: false };

  let earliest = '';
  for (const d of set) if (!earliest || d < earliest) earliest = d;

  let days = set.has(today) ? 1 : 0;
  let lastMissOffset: number | null = null;
  let daysAtLastMiss = 0;

  for (let offset = 1; ; offset++) {
    const date = addDays(today, -offset);
    if (date < earliest) break;
    if (set.has(date)) {
      days++;
      continue;
    }
    if (lastMissOffset !== null && offset - lastMissOffset <= 6) {
      // Second miss inside a rolling 7-day window: the streak restarted at the
      // more recent miss. Keep only the days counted after it.
      return { days: daysAtLastMiss, restDayUsed: false };
    }
    lastMissOffset = offset;
    daysAtLastMiss = days;
  }

  const restDayUsed = days > 0 && lastMissOffset !== null && lastMissOffset <= 7;
  return { days, restDayUsed };
}

/**
 * +10% at 7+, +20% at 21+, +30% at 66+ days (research-average point of habit
 * automation). Capped at 30%.
 */
export function streakBonusPercent(days: number): number {
  if (days >= 66) return 30;
  if (days >= 21) return 20;
  if (days >= 7) return 10;
  return 0;
}
