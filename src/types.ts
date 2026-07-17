export type StatKey = 'STR' | 'VIT' | 'INT' | 'FOC' | 'WIL';
export type Difficulty = 1 | 2 | 3;
export type Sex = 'M' | 'F';
export type TrackId = 'foundation' | 'builder5k' | 'bridge10k' | 'performance';
export type ResultStatus = 'MET' | 'ATTEMPTED' | 'EXCEEDED';

/** A PERSONAL quest — user-defined, unchanged from v1. System quests are static data. */
export interface Quest {
  id: string;
  title: string;
  minimum: string; // the tiny-habit floor
  trigger: string; // implementation intention
  stat: StatKey;
  difficulty: Difficulty;
  active: boolean;
}

/**
 * Graded credit: MET = full XP, counts toward consistency AND performance.
 * EXCEEDED = over-achieved, 120% XP, performance credit like MET.
 * ATTEMPTED = 70% XP, counts toward consistency only. MISSED = no record at all.
 */
export interface Result {
  questId: string;
  date: string; // YYYY-MM-DD local
  status: ResultStatus;
  xpEarned: number;
  detail?: string;
  /** State this log changed beyond XP — so a long-press undo can restore it. */
  revert?: { track: TrackId; trackLevels: number[]; bestRun_km: number };
}

/** What the System assigned on a given day — the denominator for consistency math. */
export interface DayPrescription {
  date: string;
  questIds: string[];
}

export interface Profile {
  sex: Sex; // used only to select standards tables
  wakeWindowStart: string; // HH:MM — 30-min window starts here
  track: TrackId; // current running track (assigned at assessment, auto-advances)
  assessedAt: string; // ISO date
}

/** Self-reported physical bests — fed by gate debriefs and logged runs. */
export interface GateProgress {
  bestRun_km: number;
  bestRunTimes: Record<string, number>; // distance key ('5k' | '10k') -> seconds
  bestPushups: number;
  bestSquats: number;
  bestPlankSec: number;
  bestPullups: number;
  bestRows: number;
}

/** One resolved Gate trial — kept so a failed attempt leaves an honest trace. */
export interface GateAttemptRecord {
  date: string;
  from: number; // letter index the gate promotes out of
  pass: boolean;
  shortfalls: string[]; // failed tests as "LABEL — reported / standard"
}

export interface AppState {
  version: 2;
  hunter: { name: string; awakenedAt: string };
  xp: number; // lifetime total — drives LEVEL and stats
  gatesPassed: number; // 0=E … 5=S; the letter IS this — promotion ONLY via Gates
  letterXpStart: number; // lifetime XP when the current letter was entered; xp − this = tier progress
  profile: Profile | null; // null = assessment pending (fresh, migrated, or re-measuring)
  quests: Quest[]; // PERSONAL quests only
  results: Result[];
  prescriptions: DayPrescription[];
  gateProgress: GateProgress;
  trackLevels: number[]; // per cardio slot [0..2]; advance on MET/EXCEEDED only
  gateAttempt: { date: string } | null; // declared trial awaiting a debrief
  gateHistory: GateAttemptRecord[];
  dayOverrides: Record<string, number>; // date -> day-of-week template to use (session shifting)
  /** Morning structure steps ticked per date — no XP, no consistency weight. */
  routineTicks: Record<string, string[]>;
  lastResetDate: string;
}

/** v1 shape, kept for migration. */
export interface AppStateV1 {
  version: 1;
  hunter: { name: string; awakenedAt: string };
  xp: number;
  quests: Quest[];
  log: Array<{ questId: string; date: string; xpEarned: number }>;
  lastResetDate: string;
}

export function emptyGateProgress(): GateProgress {
  return {
    bestRun_km: 0,
    bestRunTimes: {},
    bestPushups: 0,
    bestSquats: 0,
    bestPlankSec: 0,
    bestPullups: 0,
    bestRows: 0,
  };
}
