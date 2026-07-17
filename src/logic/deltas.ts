import type { Quest, Result, StatKey } from '../types';
import { computeStats } from './stats';

/**
 * Stat gains shown on the level-up panel: simply the difference between the
 * stat table before and after the XP landed — so level growth, seeds and
 * result counts can never disagree with what the panel claims.
 */
export function statDeltas(
  quests: Quest[],
  statSeeds: Record<StatKey, number>,
  before: { results: Result[]; level: number },
  after: { results: Result[]; level: number },
): Partial<Record<StatKey, number>> {
  const a = computeStats(quests, before.results, statSeeds, before.level);
  const b = computeStats(quests, after.results, statSeeds, after.level);
  const deltas: Partial<Record<StatKey, number>> = {};
  for (const key of Object.keys(b) as StatKey[]) {
    if (b[key] > a[key]) deltas[key] = b[key] - a[key];
  }
  return deltas;
}
