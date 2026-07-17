import { describe, expect, it } from 'vitest';
import type { AppState } from '../types';
import { emptyGateProgress } from '../types';
import { applyDailyReset, needsDailyReset } from './reset';

const base: AppState = {
  version: 2,
  hunter: { name: 'Test', awakenedAt: '2026-07-01T00:00:00.000Z' },
  xp: 120,
  gatesPassed: 0,
  letterXpStart: 0,
  statSeeds: { STR: 0, VIT: 0, INT: 0, FOC: 0, WIL: 0 },
  profile: { sex: 'M', wakeWindowStart: '06:30', track: 'foundation', assessedAt: '2026-07-01T00:00:00.000Z' },
  quests: [],
  results: [{ questId: 'mp:sunlight', date: '2026-07-15', status: 'MET', xpEarned: 10 }],
  prescriptions: [{ date: '2026-07-15', questIds: ['mp:sunlight', 'steps', 'rest'] }],
  gateProgress: emptyGateProgress(),
  trackLevels: [0, 0, 0],
  gateAttempt: null,
  gateHistory: [],
  dayOverrides: {},
  routineTicks: {},
  lastResetDate: '2026-07-15',
};

describe('needsDailyReset', () => {
  it('fires when the local date moved forward', () => {
    expect(needsDailyReset('2026-07-15', '2026-07-16')).toBe(true);
    expect(needsDailyReset('2026-06-30', '2026-07-01')).toBe(true);
  });

  it('does not fire on the same day', () => {
    expect(needsDailyReset('2026-07-16', '2026-07-16')).toBe(false);
  });

  it('does not fire when the clock appears to move backwards', () => {
    expect(needsDailyReset('2026-07-17', '2026-07-16')).toBe(false);
  });
});

describe('applyDailyReset', () => {
  it('moves the marker and preserves everything else', () => {
    const next = applyDailyReset(base, '2026-07-16');
    expect(next.lastResetDate).toBe('2026-07-16');
    expect(next.xp).toBe(base.xp);
    expect(next.results).toEqual(base.results); // history preserved
    expect(next.prescriptions).toEqual(base.prescriptions);
  });

  it('returns the same state when no reset is due', () => {
    expect(applyDailyReset(base, '2026-07-15')).toBe(base);
  });
});
