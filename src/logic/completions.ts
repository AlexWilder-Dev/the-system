import type { Result } from '../types';

export function resultOn(results: Result[], questId: string, date: string): Result | undefined {
  return results.find((r) => r.questId === questId && r.date === date);
}

export function isLoggedOn(results: Result[], questId: string, date: string): boolean {
  return resultOn(results, questId, date) !== undefined;
}

/** Distinct dates with at least one result — MET or ATTEMPTED both count for streaks. */
export function resultDates(results: Result[]): Set<string> {
  return new Set(results.map((r) => r.date));
}
