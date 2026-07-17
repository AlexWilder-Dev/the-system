import type { GateProgress, Sex, TrackId } from '../types';
import { xpRequiredForLevel } from './xp';
import { letterStartLevel } from './rank';

// The baseline assessment. The System measures; the user does not configure.
//
// The LETTER is an identity, so placement must be able to name it correctly:
// capability (how far you can run today) proposes the tier, then strength,
// body composition and structure must each HOLD it — any that can't drops
// the tier. A and S are never assigned; they are earned at Gates.

export interface AssessmentAnswers {
  sex: Sex;
  run: 0 | 1 | 2 | 3 | 4; // can't run 1km / 1–2km / 5k / 10k / 15k+
  pushups: 0 | 1 | 2 | 3 | 4; // 0–4 / 5–14 / 15–29 / 30–49 / 50+
  build: 0 | 1 | 2 | 3; // significant excess / carrying extra / about average / lean-athletic
  exercise: 0 | 1 | 2 | 3; // 0 / 1–2 / 3–4 / 5+ days per week
  wake: 0 | 1 | 2; // varies wildly / ~1h / ~30min
  routine: 0 | 1 | 2; // no routine / loosely / solid
  wakeTime: string; // HH:MM window start
}

export interface Placement {
  letterIndex: 0 | 1 | 2 | 3; // E-III … B-III; A/S only through Gates
  track: TrackId;
  seedXp: number;
  seeds: Partial<GateProgress>;
}

const TRACK_BY_RUN: TrackId[] = ['foundation', 'builder5k', 'bridge10k', 'performance', 'performance'];
const RUN_KM_SEED = [0.5, 1.5, 5, 10, 15];
const PUSHUP_SEED = [2, 9, 20, 35, 50];

/** Capability proposes the letter: E / D / C / B / B (A is earned, never assigned). */
const LETTER_BY_RUN = [0, 1, 2, 3, 3] as const;

export function placeHunter(a: AssessmentAnswers): Placement {
  let letter: number = LETTER_BY_RUN[a.run];
  // Strength must hold the tier (aligned with the Gates' push-up ladder).
  if (letter >= 3 && a.pushups < 3) letter = 2;
  if (letter >= 2 && a.pushups < 2) letter = 1;
  if (letter >= 1 && a.pushups < 1) letter = 0;
  // C and above is a healthy-composition identity — waistline over the
  // half-height mark caps the tier no matter how far the legs go.
  if (letter >= 2 && a.build < 2) letter = 1;
  // C needs at least one consistency signal; B needs real structure.
  if (letter >= 2 && a.exercise < 2 && a.wake < 1 && a.routine < 1) letter = 1;
  if (letter >= 3 && (a.exercise < 2 || (a.wake < 1 && a.routine < 2))) letter = 2;

  const letterIndex = letter as Placement['letterIndex'];
  return {
    letterIndex,
    track: TRACK_BY_RUN[a.run],
    // Seat the cosmetic LEVEL at the letter's band start (B-III reads LV 28,
    // not LV 1). Tier progress itself starts at zero — letterXpStart = seedXp.
    seedXp: xpRequiredForLevel(letterStartLevel(letterIndex)),
    seeds: { bestRun_km: RUN_KM_SEED[a.run], bestPushups: PUSHUP_SEED[a.pushups] },
  };
}
