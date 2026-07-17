import type { Difficulty } from '../types';
import { streakBonusPercent } from './streak';

/**
 * Lifetime XP required to hold level L: 50·L·(L+1)/2 − 50.
 * Level 1 = 0 XP; each level-up costs 50 more than the last (100, 150, 200, …).
 * e.g. LV2 at 100, LV3 at 250, LV4 at 450.
 */
export function xpRequiredForLevel(level: number): number {
  return (50 * level * (level + 1)) / 2 - 50;
}

/** Largest level whose cumulative XP requirement is ≤ xp. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= xp) level++;
  return level;
}

export const BASE_XP: Record<Difficulty, number> = { 1: 10, 2: 20, 3: 35 };

/** XP for one completion: base by difficulty, boosted by the current streak bonus. */
export function xpForCompletion(difficulty: Difficulty, streakDays: number): number {
  return Math.round(BASE_XP[difficulty] * (1 + streakBonusPercent(streakDays) / 100));
}
