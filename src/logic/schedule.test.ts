import { describe, expect, it } from 'vitest';
import type { TrackId } from '../types';
import { advanceOnResult, cardioRxFor, isDeloadWeek, weeklyVolume, weekNumberFor } from './schedule';

describe('deload cadence', () => {
  it('every 4th week is a deload', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(isDeloadWeek)).toEqual([
      false, false, false, true, false, false, false, true,
    ]);
  });

  it('weekNumberFor counts whole weeks since assessment', () => {
    expect(weekNumberFor('2026-07-01', '2026-07-01')).toBe(0);
    expect(weekNumberFor('2026-07-01', '2026-07-07')).toBe(0);
    expect(weekNumberFor('2026-07-01', '2026-07-08')).toBe(1);
    expect(weekNumberFor('2026-07-01', '2026-07-29')).toBe(4);
  });
});

describe('progression rules', () => {
  it('MET advances the slot; ATTEMPTED repeats the level', () => {
    expect(advanceOnResult('builder5k', [2, 2, 2], 0, 'MET', false).slotLevels).toEqual([3, 2, 2]);
    expect(advanceOnResult('builder5k', [2, 2, 2], 0, 'ATTEMPTED', false).slotLevels).toEqual([2, 2, 2]);
  });

  it('EXCEEDED advances like MET — over-achieving never stalls the plan', () => {
    expect(advanceOnResult('builder5k', [2, 2, 2], 0, 'EXCEEDED', false).slotLevels).toEqual([3, 2, 2]);
  });

  it('deload weeks freeze progression even on MET', () => {
    expect(advanceOnResult('builder5k', [2, 2, 2], 1, 'MET', true).slotLevels).toEqual([2, 2, 2]);
  });

  it('finishing every slot of a track auto-advances to the next track', () => {
    const len = 8; // builder5k weeks
    let s = { trackId: 'builder5k' as TrackId, slotLevels: [len - 1, len, len] };
    s = advanceOnResult(s.trackId, s.slotLevels, 0, 'MET', false);
    expect(s.trackId).toBe('bridge10k');
    expect(s.slotLevels).toEqual([0, 0, 0]);
  });

  it('the performance track repeats its final block instead of ending', () => {
    const s = advanceOnResult('performance', [3, 4, 4], 0, 'MET', false);
    expect(s.trackId).toBe('performance');
    expect(s.slotLevels).toEqual([3, 3, 3]);
  });
});

describe('quality session swap from D rank', () => {
  it('slot 1 becomes intervals at D+, same minutes', () => {
    const atE = cardioRxFor('builder5k', [5, 5, 5], 1, 0, false);
    const atD = cardioRxFor('builder5k', [5, 5, 5], 1, 1, false);
    expect(atE.kind).toBe('z2');
    expect(atD.kind).toBe('iv');
    expect(atD.minutes).toBe(atE.minutes);
  });

  it('never doubles quality: the performance track keeps its Z2 slot', () => {
    // slot 0 is already intervals every performance week — slot 1 must stay z2
    expect(cardioRxFor('performance', [0, 0, 0], 1, 2, false).kind).toBe('z2');
    expect(cardioRxFor('performance', [3, 3, 3], 1, 5, false).kind).toBe('z2');
  });

  it('never doubles quality: test weeks suppress the swap', () => {
    // builder5k final week has the 5K test in slot 2
    expect(cardioRxFor('builder5k', [7, 7, 7], 1, 1, false).kind).toBe('z2');
    // bridge10k final week has the 10K test in slot 2
    expect(cardioRxFor('bridge10k', [5, 5, 5], 1, 1, false).kind).toBe('z2');
  });
});

describe('12-week simulation — volume guardrails (AC6)', () => {
  it('never increases >10% week-over-week, deloads dip visibly, and spans a track handoff', () => {
    let trackId: TrackId = 'builder5k';
    let slotLevels = [0, 0, 0];
    const volumes: number[] = [];
    const deloads: boolean[] = [];
    const tracks: TrackId[] = [];

    for (let week = 0; week < 12; week++) {
      const deload = isDeloadWeek(week);
      volumes.push(weeklyVolume(trackId, slotLevels, 0, deload));
      deloads.push(deload);
      tracks.push(trackId);
      for (let slot = 0; slot < 3; slot++) {
        const next = advanceOnResult(trackId, slotLevels, slot, 'MET', deload);
        trackId = next.trackId;
        slotLevels = next.slotLevels;
      }
    }

    // 10% cap between consecutive non-deload training weeks
    let prevTraining = volumes[0];
    for (let w = 1; w < 12; w++) {
      if (deloads[w]) continue;
      expect(volumes[w]).toBeLessThanOrEqual(prevTraining * 1.1 + 1e-9);
      prevTraining = volumes[w];
    }

    // Deload weeks are visibly reduced against the surrounding training load
    for (let w = 0; w < 12; w++) {
      if (deloads[w]) expect(volumes[w]).toBeLessThan(volumes[w - 1] * 0.75);
    }
    expect(deloads.filter(Boolean).length).toBe(3); // weeks 3, 7, 11

    // The simulation crosses the builder5k → bridge10k handoff under the cap
    expect(tracks[0]).toBe('builder5k');
    expect(tracks[11]).toBe('bridge10k');
  });

  it('an ATTEMPTED session holds weekly volume flat for that slot', () => {
    const before = weeklyVolume('builder5k', [2, 2, 2], 0, false);
    const after = advanceOnResult('builder5k', [2, 2, 2], 0, 'ATTEMPTED', false);
    expect(weeklyVolume('builder5k', after.slotLevels, 0, false)).toBe(before);
  });
});
