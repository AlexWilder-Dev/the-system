// Gate standards — calibration informed by population norms (Cooper test,
// ACSM percentiles). The training methods are the science; these exact
// thresholds are tunable design data, kept here and nowhere else.

export interface RepStandard {
  M: number;
  F: number;
}

export type GateTest =
  | { id: string; kind: 'run_distance'; km: number; label: string }
  | { id: string; kind: 'run_time'; distanceKm: number; timeKey: '5k' | '10k'; maxSec: RepStandard; label: string }
  | { id: string; kind: 'reps'; metric: 'pushups' | 'squats' | 'pullups' | 'rows'; std: RepStandard; label: string }
  | { id: string; kind: 'hold'; metric: 'plank'; sec: number; label: string }
  | { id: string; kind: 'either'; label: string; options: GateTest[] };

export type TrackedReq =
  | { id: string; kind: 'consistency'; windowDays: number; pct: number; label: string }
  | { id: string; kind: 'wake'; hits: number; windowDays: number; label: string }
  | { id: string; kind: 'zone2'; avgMin: number; weeks: number; label: string }
  | { id: string; kind: 'strengthweeks'; weeks: number; label: string }
  | { id: string; kind: 'bestrun'; km: number; label: string };

export interface GateDef {
  from: number; // letter index this gate promotes out of (0 = E→D)
  name: string;
  tests: GateTest[];
  tracked: TrackedReq[];
}

export const GATES: GateDef[] = [
  {
    from: 0,
    name: 'FIRST GATE',
    tests: [
      { id: 'run2k', kind: 'run_distance', km: 2, label: 'RUN 2 KM CONTINUOUS — ANY PACE' },
      { id: 'pushups', kind: 'reps', metric: 'pushups', std: { M: 10, F: 5 }, label: 'PUSH-UPS, STRICT' },
      { id: 'squats', kind: 'reps', metric: 'squats', std: { M: 25, F: 25 }, label: 'BODYWEIGHT SQUATS, CONTINUOUS' },
    ],
    tracked: [
      { id: 'cons21', kind: 'consistency', windowDays: 21, pct: 75, label: '21-DAY CONSISTENCY ≥75%' },
      { id: 'wake21', kind: 'wake', hits: 15, windowDays: 21, label: 'WAKE WINDOW — 15 OF LAST 21 DAYS' },
    ],
  },
  {
    from: 1,
    name: 'SECOND GATE',
    tests: [
      { id: 'run5k', kind: 'run_distance', km: 5, label: 'RUN 5 KM CONTINUOUS — ANY PACE' },
      { id: 'pushups', kind: 'reps', metric: 'pushups', std: { M: 20, F: 10 }, label: 'PUSH-UPS, STRICT' },
      { id: 'plank', kind: 'hold', metric: 'plank', sec: 60, label: 'PLANK HOLD' },
    ],
    tracked: [
      { id: 'z2', kind: 'zone2', avgMin: 90, weeks: 4, label: 'ZONE 2 ≥90 MIN/WEEK — 4-WEEK AVERAGE' },
      { id: 'cons28', kind: 'consistency', windowDays: 28, pct: 80, label: '28-DAY CONSISTENCY ≥80%' },
    ],
  },
  {
    from: 2,
    name: 'THIRD GATE',
    tests: [
      { id: 'run5kt', kind: 'run_time', distanceKm: 5, timeKey: '5k', maxSec: { M: 1800, F: 1980 }, label: '5 KM TIMED' },
      { id: 'pushups', kind: 'reps', metric: 'pushups', std: { M: 30, F: 15 }, label: 'PUSH-UPS, STRICT' },
      { id: 'squats', kind: 'reps', metric: 'squats', std: { M: 40, F: 40 }, label: 'BODYWEIGHT SQUATS, CONTINUOUS' },
      { id: 'plank', kind: 'hold', metric: 'plank', sec: 90, label: 'PLANK HOLD' },
    ],
    tracked: [
      { id: 'run10k', kind: 'bestrun', km: 10, label: '10 KM CONTINUOUS — COMPLETED ONCE' },
      { id: 'str8', kind: 'strengthweeks', weeks: 8, label: 'STRENGTH 2×/WEEK — EVERY WEEK, LAST 8' },
      { id: 'cons56', kind: 'consistency', windowDays: 56, pct: 80, label: '56-DAY CONSISTENCY ≥80%' },
    ],
  },
  {
    from: 3,
    name: 'FOURTH GATE',
    tests: [
      { id: 'run10kt', kind: 'run_time', distanceKm: 10, timeKey: '10k', maxSec: { M: 3600, F: 3960 }, label: '10 KM TIMED' },
      { id: 'pushups', kind: 'reps', metric: 'pushups', std: { M: 40, F: 20 }, label: 'PUSH-UPS, STRICT' },
      {
        id: 'pull',
        kind: 'either',
        label: 'PULL-UPS — OR 12 INVERTED ROWS IF NO BAR',
        options: [
          { id: 'pullups', kind: 'reps', metric: 'pullups', std: { M: 5, F: 1 }, label: 'PULL-UPS' },
          { id: 'rows', kind: 'reps', metric: 'rows', std: { M: 12, F: 12 }, label: 'INVERTED ROWS' },
        ],
      },
    ],
    tracked: [
      { id: 'z2', kind: 'zone2', avgMin: 150, weeks: 8, label: 'ZONE 2 ≥150 MIN/WEEK — 8-WEEK AVERAGE' },
      { id: 'cons180', kind: 'consistency', windowDays: 180, pct: 80, label: '180-DAY CONSISTENCY ≥80%' },
      { id: 'wake180', kind: 'wake', hits: 140, windowDays: 180, label: 'WAKE WINDOW — 140 OF LAST 180 DAYS' },
    ],
  },
  {
    from: 4,
    name: 'FINAL GATE',
    tests: [
      {
        id: 'endurance',
        kind: 'either',
        label: 'HALF MARATHON CONTINUOUS — OR 10 KM TIMED',
        options: [
          { id: 'hm', kind: 'run_distance', km: 21.1, label: 'HALF MARATHON CONTINUOUS' },
          { id: 'run10kt', kind: 'run_time', distanceKm: 10, timeKey: '10k', maxSec: { M: 3000, F: 3300 }, label: '10 KM TIMED' },
        ],
      },
      { id: 'pushups', kind: 'reps', metric: 'pushups', std: { M: 50, F: 25 }, label: 'PUSH-UPS, STRICT' },
    ],
    tracked: [
      { id: 'cons365', kind: 'consistency', windowDays: 365, pct: 80, label: '365-DAY CONSISTENCY ≥80%' },
      { id: 'wake365', kind: 'wake', hits: 300, windowDays: 365, label: 'WAKE WINDOW — 300 OF LAST 365 DAYS' },
    ],
  },
];
