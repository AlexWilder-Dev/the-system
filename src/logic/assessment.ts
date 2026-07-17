import type { GateProgress, Sex, TrackId } from '../types';
import { xpRequiredForLevel } from './xp';
import { letterStartLevel } from './rank';

// The baseline assessment. The System measures; the user does not configure.

export interface AssessmentAnswers {
  sex: Sex;
  run: 0 | 1 | 2 | 3; // can't run 1km / 1–2km / 5k / 10k+
  pushups: 0 | 1 | 2 | 3; // 0–4 / 5–14 / 15–29 / 30+
  wake: 0 | 1 | 2; // varies wildly / ~1h / ~30min
  exercise: 0 | 1 | 2 | 3; // 0 / 1–2 / 3–4 / 5+ days per week
  wakeTime: string; // HH:MM window start
}

export interface Placement {
  letterIndex: 0 | 1 | 2; // E-III, D-III or C-III
  track: TrackId;
  seedXp: number;
  seeds: Partial<GateProgress>;
}

const TRACK_BY_RUN: TrackId[] = ['foundation', 'builder5k', 'bridge10k', 'performance'];
const RUN_KM_SEED = [0.5, 1.5, 5, 10];
const PUSHUP_SEED = [2, 9, 20, 30];

export function placeHunter(a: AssessmentAnswers): Placement {
  let letterIndex: 0 | 1 | 2 = 0;
  if (a.run >= 3 && a.pushups >= 3) {
    letterIndex = 2; // can run 10k+ and 30 push-ups → C-III
  } else if (a.run >= 2 && a.pushups >= 2 && (a.wake >= 1 || a.exercise >= 2)) {
    letterIndex = 1; // 5k + 15 push-ups + some consistency → D-III
  }
  return {
    letterIndex,
    track: TRACK_BY_RUN[a.run],
    // Placement seats the hunter at the START of the letter band so sub-rank
    // progression is uniform with the native path (D-III = level 10, etc.).
    seedXp: xpRequiredForLevel(letterStartLevel(letterIndex)),
    seeds: { bestRun_km: RUN_KM_SEED[a.run], bestPushups: PUSHUP_SEED[a.pushups] },
  };
}
