import { describe, expect, it } from 'vitest';
import type { AppStateV1 } from '../types';
import { migrateV1 } from './migrate';

const v1: AppStateV1 = {
  version: 1,
  hunter: { name: 'Alex', awakenedAt: '2026-07-01T08:00:00.000Z' },
  xp: 340,
  quests: [
    { id: 'q1', title: 'Read — 20 pages', minimum: '1 page counts', trigger: 'After dinner', stat: 'INT', difficulty: 2, active: true },
    { id: 'q2', title: 'Old habit', minimum: 'x', trigger: 'y', stat: 'STR', difficulty: 1, active: false },
  ],
  log: [
    { questId: 'q1', date: '2026-07-14', xpEarned: 20 },
    { questId: 'q1', date: '2026-07-15', xpEarned: 20 },
  ],
  lastResetDate: '2026-07-15',
};

describe('v1 → v2 migration (AC3)', () => {
  it('preserves XP and hunter identity', () => {
    const s = migrateV1(v1);
    expect(s.version).toBe(2);
    expect(s.xp).toBe(340);
    expect(s.hunter.name).toBe('Alex');
  });

  it('routes old quests to PERSONAL unchanged, archived state intact', () => {
    const s = migrateV1(v1);
    expect(s.quests).toEqual(v1.quests);
  });

  it('converts the completion log to MET results with XP intact', () => {
    const s = migrateV1(v1);
    expect(s.results).toHaveLength(2);
    expect(s.results[0]).toMatchObject({ questId: 'q1', date: '2026-07-14', status: 'MET', xpEarned: 20 });
  });

  it('leaves the profile empty — the System must still measure the hunter', () => {
    const s = migrateV1(v1);
    expect(s.profile).toBeNull();
    expect(s.gatesPassed).toBe(0);
    expect(s.prescriptions).toEqual([]);
  });

  it('seeds the post-v2 fields empty', () => {
    const s = migrateV1(v1);
    expect(s.gateHistory).toEqual([]);
    expect(s.routineTicks).toEqual({});
  });
});
