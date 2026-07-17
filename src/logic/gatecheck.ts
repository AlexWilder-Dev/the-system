import type { AppState, GateAttemptRecord, GateProgress, Sex } from '../types';
import { GATES, type GateDef, type GateTest } from '../data/gates';
import { addDays } from './dates';
import { LETTERS, subProgress } from './rank';
import {
  consistencyPercent,
  strengthWeeksSatisfied,
  wakeWindowHits,
  zone2WeeklyAverage,
} from './consistency';

export interface ReqRow {
  id: string;
  label: string;
  current: string;
  met: boolean;
  /** True for physical tests — proven inside the Gate, shown with best-so-far. */
  atGate: boolean;
}

export function nextGate(gatesPassed: number): GateDef | null {
  return GATES[gatesPassed] ?? null;
}

function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Tracked (non-test) requirements with live progress. Includes the tier-mastery prerequisite. */
export function trackedRequirements(state: AppState, today: string): ReqRow[] {
  const gate = nextGate(state.gatesPassed);
  if (!gate) return [];
  const letter = LETTERS[state.gatesPassed];
  const { sub } = subProgress(state.gatesPassed, state.xp - state.letterXpStart);
  const rows: ReqRow[] = [
    {
      id: 'subrank',
      label: `MASTER THE TIER — REACH ${letter}-I`,
      current: `${letter}-${sub}`,
      met: sub === 'I',
      atGate: false,
    },
  ];
  for (const req of gate.tracked) {
    switch (req.kind) {
      case 'consistency': {
        const pct = consistencyPercent(state.prescriptions, state.results, today, req.windowDays);
        rows.push({ id: req.id, label: req.label, current: `${Math.floor(pct)}%`, met: pct >= req.pct, atGate: false });
        break;
      }
      case 'wake': {
        const hits = wakeWindowHits(state.results, today, req.windowDays);
        rows.push({ id: req.id, label: req.label, current: `${hits} / ${req.windowDays} DAYS`, met: hits >= req.hits, atGate: false });
        break;
      }
      case 'zone2': {
        const avg = zone2WeeklyAverage(state.results, today, req.weeks);
        rows.push({ id: req.id, label: req.label, current: `${Math.round(avg)} MIN/WK`, met: avg >= req.avgMin, atGate: false });
        break;
      }
      case 'strengthweeks': {
        const n = strengthWeeksSatisfied(state.results, today, req.weeks);
        rows.push({ id: req.id, label: req.label, current: `${n} / ${req.weeks} WEEKS`, met: n >= req.weeks, atGate: false });
        break;
      }
      case 'bestrun': {
        const best = state.gateProgress.bestRun_km;
        rows.push({ id: req.id, label: req.label, current: `BEST: ${best.toFixed(1)} KM`, met: best >= req.km, atGate: false });
        break;
      }
    }
  }
  return rows;
}

function testStandardLabel(test: GateTest, sex: Sex): string {
  switch (test.kind) {
    case 'run_distance':
      return `${test.km} KM`;
    case 'run_time':
      return `≤ ${fmtSec(test.maxSec[sex])}`;
    case 'reps':
      return `${test.std[sex]} REPS`;
    case 'hold':
      return `${test.sec} S`;
    case 'either':
      return test.options.map((o) => testStandardLabel(o, sex)).join(' OR ');
  }
}

function testBest(test: GateTest, gp: GateProgress): string | null {
  switch (test.kind) {
    case 'run_distance':
      return gp.bestRun_km > 0 ? `BEST: ${gp.bestRun_km.toFixed(1)} KM` : null;
    case 'run_time': {
      const t = gp.bestRunTimes[test.timeKey];
      return t ? `BEST: ${fmtSec(t)}` : null;
    }
    case 'reps': {
      const map = { pushups: gp.bestPushups, squats: gp.bestSquats, pullups: gp.bestPullups, rows: gp.bestRows };
      const v = map[test.metric];
      return v > 0 ? `BEST: ${v}` : null;
    }
    case 'hold':
      return gp.bestPlankSec > 0 ? `BEST: ${gp.bestPlankSec} S` : null;
    case 'either': {
      for (const o of test.options) {
        const b = testBest(o, gp);
        if (b) return b;
      }
      return null;
    }
  }
}

function testMetByBest(test: GateTest, sex: Sex, gp: GateProgress): boolean {
  switch (test.kind) {
    case 'run_distance':
      return gp.bestRun_km >= test.km;
    case 'run_time': {
      const t = gp.bestRunTimes[test.timeKey];
      return t !== undefined && t > 0 && t <= test.maxSec[sex];
    }
    case 'reps': {
      const map = { pushups: gp.bestPushups, squats: gp.bestSquats, pullups: gp.bestPullups, rows: gp.bestRows };
      return map[test.metric] >= test.std[sex];
    }
    case 'hold':
      return gp.bestPlankSec >= test.sec;
    case 'either':
      return test.options.some((o) => testMetByBest(o, sex, gp));
  }
}

/** Physical tests with standards and best-so-far — informational until the Gate. */
export function testRows(gate: GateDef, sex: Sex, gp: GateProgress): ReqRow[] {
  return gate.tests.map((test) => ({
    id: test.id,
    label: `${test.label} — ${testStandardLabel(test, sex)}`,
    current: testBest(test, gp) ?? 'TESTED AT GATE',
    met: testMetByBest(test, sex, gp),
    atGate: true,
  }));
}

/** The Gate materialises when every tracked requirement (incl. tier mastery) is met. */
export function gateAvailable(state: AppState, today: string): boolean {
  if (!state.profile || !nextGate(state.gatesPassed)) return false;
  return trackedRequirements(state, today).every((r) => r.met);
}

/**
 * The challenge path: a hunter who believes their placement was wrong may
 * FORCE the Gate — skip the tracked requirements and face the physical
 * standards directly. Rationed to one forced attempt per rolling 7 days
 * (earned attempts are never rationed). Returns the date the next challenge
 * unlocks, or null if one is free now.
 */
export function nextChallengeDay(history: GateAttemptRecord[], today: string): string | null {
  const last = [...history].reverse().find((a) => a.forced);
  if (!last) return null;
  const unlock = addDays(last.date, 7);
  return unlock > today ? unlock : null;
}

// ---------------------------------------------------------------------------
// Gate debrief evaluation. Report keys are test ids (option ids for 'either');
// values are what the input captured: km, decimal minutes, reps, or seconds.
// ---------------------------------------------------------------------------

export type GateReport = Record<string, number>;

function testPasses(test: GateTest, sex: Sex, report: GateReport): boolean {
  switch (test.kind) {
    case 'run_distance':
      return (report[test.id] ?? 0) >= test.km;
    case 'run_time': {
      const sec = (report[test.id] ?? 0) * 60; // input is decimal minutes
      return sec > 0 && sec <= test.maxSec[sex];
    }
    case 'reps':
      return (report[test.id] ?? 0) >= test.std[sex];
    case 'hold':
      return (report[test.id] ?? 0) >= test.sec;
    case 'either':
      return test.options.some((o) => testPasses(o, sex, report));
  }
}

export function evaluateGateReport(
  gate: GateDef,
  sex: Sex,
  report: GateReport,
): { pass: boolean; failed: string[] } {
  const failed = gate.tests.filter((t) => !testPasses(t, sex, report)).map((t) => t.label);
  return { pass: failed.length === 0, failed };
}

/** "reported / standard" for one test — the honest line an attempt leaves behind. */
function shortfallLine(test: GateTest, sex: Sex, report: GateReport): string {
  switch (test.kind) {
    case 'run_distance':
      return `${test.label} — ${(report[test.id] ?? 0).toFixed(1)} / ${test.km} KM`;
    case 'run_time': {
      const sec = (report[test.id] ?? 0) * 60;
      return `${test.label} — ${sec > 0 ? fmtSec(sec) : 'NOT ATTEMPTED'} / ≤ ${fmtSec(test.maxSec[sex])}`;
    }
    case 'reps':
      return `${test.label} — ${report[test.id] ?? 0} / ${test.std[sex]} REPS`;
    case 'hold':
      return `${test.label} — ${report[test.id] ?? 0} / ${test.sec} S`;
    case 'either': {
      const attempted = test.options.find((o) => (report[o.id] ?? 0) > 0) ?? test.options[0];
      return shortfallLine(attempted, sex, report);
    }
  }
}

/** The failed tests of an attempt as display lines, e.g. "RUN 2 KM — 1.5 / 2.0 KM". */
export function attemptShortfalls(gate: GateDef, sex: Sex, report: GateReport): string[] {
  return gate.tests.filter((t) => !testPasses(t, sex, report)).map((t) => shortfallLine(t, sex, report));
}

/** Effort at a Gate is never wasted: reported numbers update bests, pass or fail. */
export function bestsFromReport(gp: GateProgress, gate: GateDef, report: GateReport): GateProgress {
  const next: GateProgress = { ...gp, bestRunTimes: { ...gp.bestRunTimes } };
  const apply = (test: GateTest) => {
    switch (test.kind) {
      case 'run_distance': {
        const km = report[test.id] ?? 0;
        if (km > next.bestRun_km) next.bestRun_km = km;
        break;
      }
      case 'run_time': {
        const sec = (report[test.id] ?? 0) * 60;
        const prev = next.bestRunTimes[test.timeKey];
        if (sec > 0 && (prev === undefined || sec < prev)) next.bestRunTimes[test.timeKey] = sec;
        if (test.distanceKm > next.bestRun_km && sec > 0) next.bestRun_km = test.distanceKm;
        break;
      }
      case 'reps': {
        const v = report[test.id] ?? 0;
        if (test.metric === 'pushups' && v > next.bestPushups) next.bestPushups = v;
        if (test.metric === 'squats' && v > next.bestSquats) next.bestSquats = v;
        if (test.metric === 'pullups' && v > next.bestPullups) next.bestPullups = v;
        if (test.metric === 'rows' && v > next.bestRows) next.bestRows = v;
        break;
      }
      case 'hold': {
        const v = report[test.id] ?? 0;
        if (v > next.bestPlankSec) next.bestPlankSec = v;
        break;
      }
      case 'either':
        test.options.forEach(apply);
        break;
    }
  };
  gate.tests.forEach(apply);
  return next;
}
