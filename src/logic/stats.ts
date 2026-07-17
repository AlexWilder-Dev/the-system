import type { Quest, Result, StatKey } from '../types';
import { questMeta } from './quests';

export const STAT_KEYS: StatKey[] = ['STR', 'VIT', 'INT', 'FOC', 'WIL'];

const NO_SEEDS: Record<StatKey, number> = { STR: 0, VIT: 0, INT: 0, FOC: 0, WIL: 0 };

/**
 * Each stat = 10 base
 *   + what the assessment measured (statSeeds — a B hunter never starts flat)
 *   + one point per level gained, rotating STR→VIT→INT→FOC→WIL so every
 *     level-up visibly moves a stat
 *   + one point per result (MET or ATTEMPTED — effort counts) on quests
 *     tagged with it.
 */
export function computeStats(
  quests: Quest[],
  results: Result[],
  statSeeds: Record<StatKey, number> = NO_SEEDS,
  level = 1,
): Record<StatKey, number> {
  const stats = {} as Record<StatKey, number>;
  for (const key of STAT_KEYS) stats[key] = 10 + (statSeeds[key] ?? 0);
  for (let l = 0; l < level - 1; l++) stats[STAT_KEYS[l % STAT_KEYS.length]]++;
  for (const r of results) {
    const meta = questMeta(r.questId, quests);
    if (meta) stats[meta.stat]++;
  }
  return stats;
}
