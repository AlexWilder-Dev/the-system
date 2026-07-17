import type { Quest, Result, StatKey } from '../types';
import { questMeta } from './quests';

export const STAT_KEYS: StatKey[] = ['STR', 'VIT', 'INT', 'FOC', 'WIL'];

/** Each stat = 10 + total results (MET or ATTEMPTED — effort counts) on quests tagged with it. */
export function computeStats(quests: Quest[], results: Result[]): Record<StatKey, number> {
  const stats = { STR: 10, VIT: 10, INT: 10, FOC: 10, WIL: 10 } as Record<StatKey, number>;
  for (const r of results) {
    const meta = questMeta(r.questId, quests);
    if (meta) stats[meta.stat]++;
  }
  return stats;
}
