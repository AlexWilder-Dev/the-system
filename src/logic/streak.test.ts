import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeStreak, streakBonusPercent } from './streak';

const TODAY = '2026-07-16';
const d = (n: number) => addDays(TODAY, -n);

describe('computeStreak', () => {
  it('is 0 with no completions', () => {
    expect(computeStreak([], TODAY)).toEqual({ days: 0, restDayUsed: false });
  });

  it('counts today', () => {
    expect(computeStreak([TODAY], TODAY)).toEqual({ days: 1, restDayUsed: false });
  });

  it('counts consecutive days', () => {
    expect(computeStreak([TODAY, d(1), d(2), d(3), d(4)], TODAY).days).toBe(5);
  });

  it('treats an incomplete today as neutral — the day is not over', () => {
    expect(computeStreak([d(1), d(2), d(3)], TODAY)).toEqual({ days: 3, restDayUsed: false });
  });

  it('survives one missed day per rolling 7 (Rest Day)', () => {
    const result = computeStreak([TODAY, d(2), d(3), d(4)], TODAY);
    expect(result.days).toBe(4);
    expect(result.restDayUsed).toBe(true);
  });

  it('resets on a second miss within 7 days, keeping days after the newer miss', () => {
    // completed T, d2, d5 — missed d1 and d3
    expect(computeStreak([TODAY, d(2), d(5)], TODAY)).toEqual({ days: 1, restDayUsed: false });
  });

  it('resets to 0 after two consecutive missed days', () => {
    expect(computeStreak([d(3), d(4)], TODAY)).toEqual({ days: 0, restDayUsed: false });
  });

  it('tolerates two misses more than 7 days apart', () => {
    const dates = [];
    for (let n = 0; n <= 15; n++) if (n !== 3 && n !== 12) dates.push(d(n));
    // 16 days, misses at d3 and d12 (9 apart) — both forgiven
    expect(computeStreak(dates, TODAY)).toEqual({ days: 14, restDayUsed: false });
  });

  it('only flags restDayUsed when the miss is inside the last 7 days', () => {
    const dates = [];
    for (let n = 0; n <= 10; n++) if (n !== 9) dates.push(d(n));
    expect(computeStreak(dates, TODAY)).toEqual({ days: 10, restDayUsed: false });
  });
});

describe('streakBonusPercent', () => {
  it('steps at 7, 21 and 66 days, capped at 30%', () => {
    expect(streakBonusPercent(0)).toBe(0);
    expect(streakBonusPercent(6)).toBe(0);
    expect(streakBonusPercent(7)).toBe(10);
    expect(streakBonusPercent(20)).toBe(10);
    expect(streakBonusPercent(21)).toBe(20);
    expect(streakBonusPercent(65)).toBe(20);
    expect(streakBonusPercent(66)).toBe(30);
    expect(streakBonusPercent(500)).toBe(30);
  });
});
