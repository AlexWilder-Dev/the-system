import type { AppState, AppStateV1 } from '../types';
import { emptyGateProgress } from '../types';

/**
 * v1 → v2. XP and history are preserved: v1 completions become MET results
 * (v1 had no below-standard tier), and v1's user-defined quests become
 * PERSONAL quests unchanged. profile stays null — the System still has to
 * measure the hunter, so the app routes to the assessment (name kept).
 */
export function migrateV1(v1: AppStateV1): AppState {
  return {
    version: 2,
    hunter: v1.hunter,
    xp: v1.xp,
    gatesPassed: 0,
    letterXpStart: 0,
    profile: null,
    quests: v1.quests,
    results: v1.log.map((c) => ({
      questId: c.questId,
      date: c.date,
      status: 'MET' as const,
      xpEarned: c.xpEarned,
    })),
    prescriptions: [],
    gateProgress: emptyGateProgress(),
    trackLevels: [0, 0, 0],
    gateAttempt: null,
    gateHistory: [],
    dayOverrides: {},
    routineTicks: {},
    lastResetDate: v1.lastResetDate,
  };
}
