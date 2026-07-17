import { describe, expect, it } from 'vitest';
import type { AppState, Result, DayPrescription } from '../types';
import { emptyGateProgress } from '../types';
import { addDays } from './dates';
import { GATES } from '../data/gates';
import {
  attemptShortfalls,
  bestsFromReport,
  evaluateGateReport,
  gateAvailable,
  nextChallengeDay,
  trackedRequirements,
} from './gatecheck';

const T = '2026-07-16';
const d = (n: number) => addDays(T, -n);

/** A hunter with `metDays` fully-logged days out of the trailing 21, at the given xp (tier entry at 0). */
function makeState(opts: { xp: number; metDays: number; windowDays?: number }): AppState {
  const windowDays = opts.windowDays ?? 21;
  const quests = ['mp:sunlight', 'mp:wake', 'mp:hydrate', 'steps', 'rest'];
  const prescriptions: DayPrescription[] = [];
  const results: Result[] = [];
  for (let n = 0; n < windowDays; n++) {
    prescriptions.push({ date: d(n), questIds: quests });
    if (n < opts.metDays) {
      for (const q of quests) results.push({ questId: q, date: d(n), status: 'MET', xpEarned: 10 });
    }
  }
  return {
    version: 2,
    hunter: { name: 'Test', awakenedAt: '2026-06-01T00:00:00.000Z' },
    xp: opts.xp,
    gatesPassed: 0,
    letterXpStart: 0,
    statSeeds: { STR: 0, VIT: 0, INT: 0, FOC: 0, WIL: 0 },
    profile: { sex: 'M', wakeWindowStart: '06:30', track: 'builder5k', assessedAt: '2026-06-01T00:00:00.000Z' },
    quests: [],
    results,
    prescriptions,
    gateProgress: emptyGateProgress(),
    trackLevels: [0, 0, 0],
    gateAttempt: null,
    gateHistory: [],
    dayOverrides: {},
    routineTicks: {},
    lastResetDate: T,
  };
}

describe('gate availability (E→D scenario, AC5)', () => {
  it('materialises when tier mastery + consistency + wake window are all met', () => {
    // 17/21 days = 81% ≥ 75%; wake MET 17 ≥ 15; 2700 XP in-letter ≥ 1600 → E-I
    const state = makeState({ xp: 2700, metDays: 17 });
    expect(gateAvailable(state, T)).toBe(true);
  });

  it('stays sealed until the tier is mastered (E-I)', () => {
    const state = makeState({ xp: 1000, metDays: 17 }); // E-II — 600 short of mastery
    expect(gateAvailable(state, T)).toBe(false);
    const rows = trackedRequirements(state, T);
    expect(rows.find((r) => r.id === 'subrank')?.met).toBe(false);
    expect(rows.find((r) => r.id === 'subrank')?.current).toBe('E-II');
  });

  it('stays sealed below the consistency bar, with live progress visible', () => {
    const state = makeState({ xp: 2700, metDays: 14 }); // 66%
    expect(gateAvailable(state, T)).toBe(false);
    const cons = trackedRequirements(state, T).find((r) => r.id === 'cons21');
    expect(cons?.met).toBe(false);
    expect(cons?.current).toBe('66%');
  });

  it('an all-ATTEMPTED hunter keeps consistency but cannot satisfy the wake standard', () => {
    const state = makeState({ xp: 2700, metDays: 0 });
    for (let n = 0; n < 17; n++) {
      for (const q of ['mp:sunlight', 'mp:wake', 'mp:hydrate', 'steps', 'rest']) {
        state.results.push({ questId: q, date: d(n), status: 'ATTEMPTED', xpEarned: 7 });
      }
    }
    const rows = trackedRequirements(state, T);
    expect(rows.find((r) => r.id === 'cons21')?.met).toBe(true); // effort counts
    expect(rows.find((r) => r.id === 'wake21')?.met).toBe(false); // standards do not bend
    expect(gateAvailable(state, T)).toBe(false);
  });
});

describe('gate debrief evaluation', () => {
  const gate = GATES[0]; // E→D: run 2km, push-ups 10M/5F, squats 25

  it('promotes when every test meets the standard', () => {
    const { pass, failed } = evaluateGateReport(gate, 'M', { run2k: 2.4, pushups: 12, squats: 30 });
    expect(pass).toBe(true);
    expect(failed).toEqual([]);
  });

  it('holds the gate when any test is below standard', () => {
    const { pass, failed } = evaluateGateReport(gate, 'M', { run2k: 2.4, pushups: 8, squats: 30 });
    expect(pass).toBe(false);
    expect(failed).toHaveLength(1);
  });

  it('applies sex-specific standards', () => {
    expect(evaluateGateReport(gate, 'F', { run2k: 2, pushups: 5, squats: 25 }).pass).toBe(true);
    expect(evaluateGateReport(gate, 'M', { run2k: 2, pushups: 5, squats: 25 }).pass).toBe(false);
  });

  it('either-tests pass on any satisfied option (pull-ups OR rows)', () => {
    const fourth = GATES[3];
    const base = { run10kt: 55, pushups: 45 }; // 55:00 ≤ 60:00
    expect(evaluateGateReport(fourth, 'M', { ...base, pullups: 5 }).pass).toBe(true);
    expect(evaluateGateReport(fourth, 'M', { ...base, rows: 12 }).pass).toBe(true);
    expect(evaluateGateReport(fourth, 'M', { ...base, pullups: 3, rows: 5 }).pass).toBe(false);
  });

  it('a failed attempt still records bests — effort is never wasted', () => {
    const gp = bestsFromReport(emptyGateProgress(), gate, { run2k: 1.6, pushups: 8, squats: 30 });
    expect(gp.bestRun_km).toBe(1.6);
    expect(gp.bestPushups).toBe(8);
    expect(gp.bestSquats).toBe(30);
  });

  it('timed runs record both the time and the distance', () => {
    const third = GATES[2];
    const gp = bestsFromReport(emptyGateProgress(), third, { run5kt: 29.5, pushups: 30, squats: 40, plank: 90 });
    expect(gp.bestRunTimes['5k']).toBe(1770);
    expect(gp.bestRun_km).toBe(5);
  });

  it('a failed attempt leaves honest shortfall lines — reported / standard', () => {
    const lines = attemptShortfalls(gate, 'M', { run2k: 1.5, pushups: 8, squats: 30 });
    expect(lines).toEqual([
      'RUN 2 KM CONTINUOUS — ANY PACE — 1.5 / 2 KM',
      'PUSH-UPS, STRICT — 8 / 10 REPS',
    ]);
  });

  it('shortfall lines are empty on a pass', () => {
    expect(attemptShortfalls(gate, 'M', { run2k: 2.4, pushups: 12, squats: 30 })).toEqual([]);
  });
});

describe('challenge rationing — one forced attempt per rolling 7 days', () => {
  const attempt = (date: string, forced: boolean) => ({ date, from: 0, pass: false, shortfalls: [], forced });

  it('a first challenge is always free', () => {
    expect(nextChallengeDay([], T)).toBeNull();
  });

  it('a forced attempt 3 days ago locks the challenge until day 7', () => {
    expect(nextChallengeDay([attempt(d(3), true)], T)).toBe(addDays(d(3), 7));
  });

  it('unlocks once 7 days have passed', () => {
    expect(nextChallengeDay([attempt(d(7), true)], T)).toBeNull();
  });

  it('earned attempts never consume the challenge', () => {
    expect(nextChallengeDay([attempt(d(1), false), attempt(T, false)], T)).toBeNull();
  });

  it('only the most recent forced attempt matters', () => {
    const history = [attempt(d(20), true), attempt(d(2), true)];
    expect(nextChallengeDay(history, T)).toBe(addDays(d(2), 7));
  });
});
