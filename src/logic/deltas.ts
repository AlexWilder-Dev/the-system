import type { Quest, Result, StatKey } from '../types';
import { questMeta } from './quests';
import { xpRequiredForLevel } from './xp';

/**
 * Stat gains earned since the hunter reached `sinceLevel` — shown on the
 * level-up panel. Walks the results backwards through the XP earned inside
 * the level that was just cleared.
 */
export function statDeltasSinceLevel(
  quests: Quest[],
  results: Result[],
  totalXp: number,
  sinceLevel: number,
): Partial<Record<StatKey, number>> {
  const deltas: Partial<Record<StatKey, number>> = {};
  let remaining = totalXp - xpRequiredForLevel(sinceLevel);
  for (let i = results.length - 1; i >= 0 && remaining > 0; i--) {
    const meta = questMeta(results[i].questId, quests);
    if (meta) deltas[meta.stat] = (deltas[meta.stat] ?? 0) + 1;
    remaining -= results[i].xpEarned;
  }
  return deltas;
}
