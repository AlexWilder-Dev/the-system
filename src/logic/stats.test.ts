import { describe, expect, it } from 'vitest';
import type { Result, StatKey } from '../types';
import { computeStats } from './stats';

const SEEDS: Record<StatKey, number> = { STR: 6, VIT: 9, INT: 0, FOC: 3, WIL: 4 };

describe('computeStats', () => {
  it('starts at 10 + assessment seeds', () => {
    const stats = computeStats([], [], SEEDS, 1);
    expect(stats).toEqual({ STR: 16, VIT: 19, INT: 10, FOC: 13, WIL: 14 });
  });

  it('each level gained moves exactly one stat, rotating through all five', () => {
    const l1 = computeStats([], [], undefined, 1);
    const l2 = computeStats([], [], undefined, 2);
    const l6 = computeStats([], [], undefined, 6);
    expect(l2.STR - l1.STR).toBe(1); // level 2 lands on STR
    expect(l2.VIT - l1.VIT).toBe(0);
    // five levels distribute one point to every stat
    expect(l6).toEqual({ STR: 11, VIT: 11, INT: 11, FOC: 11, WIL: 11 });
  });

  it('results still count — effort trains the tagged stat', () => {
    const results: Result[] = [
      { questId: 'mp:sunlight', date: '2026-07-17', status: 'MET', xpEarned: 10 }, // VIT
      { questId: 'mp:wake', date: '2026-07-17', status: 'ATTEMPTED', xpEarned: 7 }, // WIL
    ];
    const stats = computeStats([], results, undefined, 1);
    expect(stats.VIT).toBe(11);
    expect(stats.WIL).toBe(11);
    expect(stats.STR).toBe(10);
  });
});
