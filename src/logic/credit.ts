import type { Difficulty, ResultStatus } from '../types';
import { xpForCompletion } from './xp';

/**
 * Graded credit. MET = full XP (with streak bonus, as v1). EXCEEDED — went
 * beyond the standard — earns a 20% bonus and counts everywhere MET does.
 * ATTEMPTED — showed up but below standard — earns 70%, and counts toward
 * consistency requirements but never toward performance requirements.
 * MISSED earns nothing and records nothing.
 */
export const ATTEMPTED_FACTOR = 0.7;
export const EXCEEDED_FACTOR = 1.2;

export function xpForResult(status: ResultStatus, difficulty: Difficulty, streakDays: number): number {
  const met = xpForCompletion(difficulty, streakDays);
  if (status === 'ATTEMPTED') return Math.round(met * ATTEMPTED_FACTOR);
  if (status === 'EXCEEDED') return Math.round(met * EXCEEDED_FACTOR);
  return met;
}

/** MET-or-better — the statuses that count toward performance requirements. */
export function performanceCredit(status: ResultStatus): boolean {
  return status !== 'ATTEMPTED';
}
