import { describe, expect, it } from 'vitest';
import type { DayPrescription, Result } from '../types';
import { addDays } from './dates';
import {
  consistencyPercent,
  strengthWeeksSatisfied,
  wakeWindowHits,
  zone2WeeklyAverage,
} from './consistency';

const T = '2026-07-16';
const d = (n: number) => addDays(T, -n);

const met = (questId: string, date: string): Result => ({ questId, date, status: 'MET', xpEarned: 10 });
const att = (questId: string, date: string): Result => ({ questId, date, status: 'ATTEMPTED', xpEarned: 7 });

describe('consistencyPercent', () => {
  it('is 0 with no prescriptions in the window', () => {
    expect(consistencyPercent([], [], T, 21)).toBe(0);
  });

  it('counts MET and ATTEMPTED alike — showing up is consistency', () => {
    const rx: DayPrescription[] = [
      { date: T, questIds: ['a', 'b'] },
      { date: d(1), questIds: ['a', 'b'] },
    ];
    const results = [met('a', T), att('b', T), att('a', d(1))];
    expect(consistencyPercent(rx, results, T, 21)).toBe(75);
  });

  it('ignores results for quests that were not prescribed that day', () => {
    const rx: DayPrescription[] = [{ date: T, questIds: ['a'] }];
    expect(consistencyPercent(rx, [met('b', T)], T, 21)).toBe(0);
  });

  it('window includes endDate and exactly windowDays-1 days back', () => {
    const rx: DayPrescription[] = [
      { date: d(20), questIds: ['a'] }, // inside a 21-day window
      { date: d(21), questIds: ['a'] }, // outside
    ];
    const results = [met('a', d(20))];
    expect(consistencyPercent(rx, results, T, 21)).toBe(100);
    // widen the window: the missed d(21) day now drags it to 50%
    expect(consistencyPercent(rx, results, T, 22)).toBe(50);
  });

  it('a missed morning window lowers consistency quietly (prescribed, no result)', () => {
    const rx: DayPrescription[] = [{ date: T, questIds: ['mp:sunlight', 'mp:wake', 'steps', 'rest'] }];
    const results = [met('steps', T), met('rest', T)];
    expect(consistencyPercent(rx, results, T, 21)).toBe(50);
  });
});

describe('wakeWindowHits', () => {
  it('counts only MET wake results, one per day, inside the window', () => {
    const results = [
      met('mp:wake', T),
      met('mp:wake', T), // duplicate same day — still one hit
      att('mp:wake', d(1)), // attempted is not a hit
      met('mp:wake', d(20)), // inside 21-day window
      met('mp:wake', d(21)), // outside
      met('mp:sunlight', d(2)), // wrong quest
    ];
    expect(wakeWindowHits(results, T, 21)).toBe(2);
  });
});

describe('zone2WeeklyAverage', () => {
  it('averages MET z2 and long minutes; intervals and ATTEMPTED never count', () => {
    const results = [
      met('run:z2:30:s0', T),
      met('run:z2:30:s0', d(7)),
      met('run:long:60:s2', d(10)),
      met('run:iv:30:s1', d(3)), // quality work is not zone 2
      att('run:z2:45:s0', d(4)), // ATTEMPTED does not advance performance
      met('run:z2:30:s0', d(28)), // outside 4-week window
    ];
    expect(zone2WeeklyAverage(results, T, 4)).toBe(30); // (30+30+60)/4
  });

  it('walk-run minutes count — the System credits the easy aerobic work it prescribes', () => {
    const results = [met('run:wr:20:s0', T), met('run:wr:20:s1', d(2))];
    expect(zone2WeeklyAverage(results, T, 1)).toBe(40);
  });

  it('EXCEEDED counts like MET', () => {
    const results: Result[] = [{ questId: 'run:z2:40:s0', date: T, status: 'EXCEEDED', xpEarned: 24 }];
    expect(zone2WeeklyAverage(results, T, 1)).toBe(40);
  });
});

describe('strengthWeeksSatisfied', () => {
  it('needs 2 MET strength sessions on distinct days per 7-day block', () => {
    const results: Result[] = [];
    // weeks 0..3 (blocks ending T, T-7, T-14, T-21): two sessions each
    for (let w = 0; w < 4; w++) {
      results.push(met('str:0', d(w * 7)), met('str:0', d(w * 7 + 3)));
    }
    // week 4: only one session
    results.push(met('str:0', d(28)));
    expect(strengthWeeksSatisfied(results, T, 4)).toBe(4);
    expect(strengthWeeksSatisfied(results, T, 5)).toBe(4);
  });

  it('two sessions on the same day count once; ATTEMPTED does not count', () => {
    const results = [met('str:1', T), met('str:1', T), att('str:1', d(2))];
    expect(strengthWeeksSatisfied(results, T, 1)).toBe(0);
  });
});
