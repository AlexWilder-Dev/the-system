import type { Difficulty, StatKey, TrackId } from '../types';

// The protocol library — static, shipped with the app. The training methods
// are the science; exact prescriptions are tunable design data.

export type EvidenceTier = 'STRONG' | 'MODERATE-STRONG' | 'MODERATE' | 'EMERGING';

export interface MorningProtocol {
  id: string; // questId, 'mp:' prefix
  title: string;
  short: string; // one-glance prescription shown on the card
  rx: string; // full prescription — behind LEARN MORE
  why: string;
  tier: EvidenceTier;
  unlock: number; // letter index: 0=E, 1=D, 2=C, 3=B
  stat: StatKey;
  difficulty: Difficulty;
}

export const MORNING_PROTOCOLS: MorningProtocol[] = [
  {
    id: 'mp:sunlight',
    title: 'SUNLIGHT EXPOSURE',
    short: '5–10 MIN OUTDOOR LIGHT',
    rx: '5–10 MIN OUTDOOR LIGHT WITHIN 60 MIN OF WAKING. 10–20 IF OVERCAST. NO SUNGLASSES.',
    why: 'CIRCADIAN PHASE-SETTING IS AMONG THE BEST-REPLICATED FINDINGS IN CHRONOBIOLOGY.',
    tier: 'STRONG',
    unlock: 0,
    stat: 'VIT',
    difficulty: 1,
  },
  {
    id: 'mp:wake',
    title: 'WAKE ON TIME',
    short: 'WAKE WITHIN YOUR 30-MIN WINDOW',
    rx: 'WAKE WITHIN YOUR 30-MIN WINDOW. 7 DAYS / WEEK.',
    why: 'SLEEP REGULARITY PREDICTS HEALTH OUTCOMES MORE STRONGLY THAN DURATION IN LARGE COHORTS.',
    tier: 'STRONG',
    unlock: 0,
    stat: 'WIL',
    difficulty: 1,
  },
  {
    id: 'mp:hydrate',
    title: 'WATER',
    short: '~500 ML BEFORE ANYTHING ELSE',
    rx: '~500 ML WATER BEFORE ANYTHING ELSE.',
    why: 'SENSIBLE AND LOW-COST. MODEST DIRECT EVIDENCE.',
    tier: 'MODERATE',
    unlock: 0,
    stat: 'VIT',
    difficulty: 1,
  },
  {
    id: 'mp:caffeine',
    title: 'DELAY CAFFEINE',
    short: 'COFFEE 90 MIN AFTER WAKING',
    rx: 'FIRST CAFFEINE 90–120 MIN AFTER WAKING.',
    why: 'MECHANISTIC (ADENOSINE CLEARANCE); LIMITED DIRECT TRIALS. CONTESTED.',
    tier: 'EMERGING',
    unlock: 1,
    stat: 'FOC',
    difficulty: 1,
  },
  {
    id: 'mp:nsdr',
    title: 'NSDR / MINDFULNESS',
    short: '10 MIN NSDR OR MEDITATION',
    rx: '10 MIN NSDR, YOGA NIDRA, OR BREATH-FOCUSED MEDITATION.',
    why: 'RCT SUPPORT FOR ATTENTION AND MOOD — PARTICULARLY RELEVANT FOR ADHD.',
    tier: 'MODERATE-STRONG',
    unlock: 2,
    stat: 'FOC',
    difficulty: 1,
  },
  {
    id: 'mp:cold',
    title: 'DELIBERATE COLD',
    short: '1–3 MIN COLD FINISH',
    rx: '1–3 MIN COLD SHOWER FINISH.',
    why: 'CATECHOLAMINE AND MOOD STUDIES ARE REAL BUT SMALL.',
    tier: 'MODERATE',
    unlock: 3,
    stat: 'WIL',
    difficulty: 1,
  },
];

// ---------------------------------------------------------------------------
// Morning structure steps — scaffolding, not quests. They give the morning a
// fixed order to walk through (valuable structure with ADHD), carry no XP and
// no consistency weight, and completing the FULL routine (every step + every
// prescribed protocol) earns a one-time daily bonus.
// ---------------------------------------------------------------------------

export interface RoutineStep {
  id: string; // 'rt:' prefix — never a questId
  title: string;
  short: string;
}

export const ROUTINE_STEPS: RoutineStep[] = [
  { id: 'rt:bathroom', title: 'BATHROOM', short: 'TEETH · FACE · READY' },
  { id: 'rt:breakfast', title: 'BREAKFAST', short: 'EAT SOMETHING REAL' },
  { id: 'rt:groom', title: 'APPEARANCE & HYGIENE', short: 'DRESSED LIKE IT MATTERS' },
  { id: 'rt:plan', title: 'DAY PLAN', short: 'THREE LINES — TODAY’S TARGETS' },
];

/**
 * Display order of the full morning routine: protocol ids (mp:) and structure
 * step ids (rt:) interleaved as the morning actually runs. Locked protocols
 * simply don't render.
 */
export const MORNING_ROUTINE_ORDER: string[] = [
  'mp:wake',
  'mp:hydrate',
  'rt:bathroom',
  'mp:sunlight',
  'mp:cold',
  'rt:breakfast',
  'rt:groom',
  'rt:plan',
  'mp:nsdr',
  'mp:caffeine',
];

export const ROUTINE_BONUS_XP = 15;
export const ROUTINE_BONUS_ID = 'routine-bonus';

// ---------------------------------------------------------------------------
// Running tracks. Weekly volume steps are built ≤10% by design; the generator
// enforces the cap besides. weeks[w] = [slot0, slot1, slot2] prescriptions.
// ---------------------------------------------------------------------------

export type CardioKind = 'wr' | 'z2' | 'iv' | 'long' | 'test';

export interface CardioRx {
  kind: CardioKind;
  minutes: number;
  desc: string;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  weeks: CardioRx[][];
}

const wr = (minutes: number, desc: string): CardioRx => ({ kind: 'wr', minutes, desc });
const z2 = (minutes: number, desc: string): CardioRx => ({ kind: 'z2', minutes, desc });
const long = (minutes: number, desc: string): CardioRx => ({ kind: 'long', minutes, desc });
const iv = (minutes: number, desc: string): CardioRx => ({ kind: 'iv', minutes, desc });
const test = (minutes: number, desc: string): CardioRx => ({ kind: 'test', minutes, desc });

export const TRACKS: Record<TrackId, TrackDef> = {
  // Gentle tendon and bone loading before impact volume.
  foundation: {
    id: 'foundation',
    name: 'FOUNDATION',
    weeks: [
      [wr(20, 'JOG 1 MIN / WALK 2 MIN × 7'), wr(20, 'JOG 1 MIN / WALK 2 MIN × 7'), wr(20, 'JOG 1 MIN / WALK 2 MIN × 7')],
      [wr(22, 'JOG 90 S / WALK 90 S × 7'), wr(22, 'JOG 90 S / WALK 90 S × 7'), wr(22, 'JOG 90 S / WALK 90 S × 7')],
      [wr(24, 'JOG 2 MIN / WALK 1 MIN × 8'), wr(24, 'JOG 2 MIN / WALK 1 MIN × 8'), wr(24, 'JOG 2 MIN / WALK 1 MIN × 8')],
      [wr(26, 'JOG 3 MIN / WALK 1 MIN × 6'), wr(26, 'JOG 3 MIN / WALK 1 MIN × 6'), wr(26, 'JOG 3 MIN / WALK 1 MIN × 6')],
    ],
  },
  builder5k: {
    id: 'builder5k',
    name: '5K BUILDER',
    weeks: [
      [wr(20, 'JOG 5 MIN / WALK 1 MIN × 3 — CONVERSATIONAL'), wr(20, 'JOG 5 MIN / WALK 1 MIN × 3'), wr(20, 'JOG 5 MIN / WALK 1 MIN × 3')],
      [wr(22, 'JOG 7 MIN / WALK 1 MIN × 3'), wr(22, 'JOG 7 MIN / WALK 1 MIN × 3'), wr(22, 'JOG 7 MIN / WALK 1 MIN × 3')],
      [wr(24, 'JOG 10 MIN / WALK 1 MIN × 2'), wr(24, 'JOG 10 MIN / WALK 1 MIN × 2'), wr(24, 'JOG 10 MIN / WALK 1 MIN × 2')],
      [z2(26, 'RUN 12 MIN / WALK 1 MIN × 2 — CONVERSATIONAL PACE'), z2(26, 'RUN 12 MIN / WALK 1 MIN × 2'), z2(26, 'RUN 12 MIN / WALK 1 MIN × 2')],
      [z2(28, 'RUN 15 MIN / WALK 1 MIN / RUN 12 MIN'), z2(28, 'RUN 15 MIN / WALK 1 MIN / RUN 12 MIN'), z2(28, 'RUN 15 MIN / WALK 1 MIN / RUN 12 MIN')],
      [z2(30, 'RUN 20 MIN CONTINUOUS + EASY 10'), z2(28, 'RUN 18 MIN CONTINUOUS + EASY 10'), z2(30, 'RUN 20 MIN CONTINUOUS + EASY 10')],
      [z2(32, 'RUN 25 MIN CONTINUOUS + EASY 7'), z2(30, 'RUN 22 MIN CONTINUOUS + EASY 8'), z2(32, 'RUN 25 MIN CONTINUOUS + EASY 7')],
      [z2(30, 'RUN 28 MIN CONTINUOUS'), z2(25, 'EASY 25 MIN'), test(35, '5K TEST — CONTINUOUS, ANY PACE')],
    ],
  },
  // w1 volume (98) sits within +10% of the 5K builder's final week (90) so the
  // track handoff itself respects the volume guardrail.
  bridge10k: {
    id: 'bridge10k',
    name: '10K BRIDGE',
    weeks: [
      [z2(28, 'ZONE 2 — 28 MIN CONVERSATIONAL'), z2(28, 'ZONE 2 — 28 MIN'), long(42, 'LONG RUN — 42 MIN EASY')],
      [z2(30, 'ZONE 2 — 30 MIN'), z2(30, 'ZONE 2 — 30 MIN'), long(46, 'LONG RUN — 46 MIN EASY')],
      [z2(32, 'ZONE 2 — 32 MIN'), z2(32, 'ZONE 2 — 32 MIN'), long(52, 'LONG RUN — 52 MIN EASY')],
      [z2(35, 'ZONE 2 — 35 MIN'), z2(35, 'ZONE 2 — 35 MIN'), long(57, 'LONG RUN — 57 MIN EASY')],
      [z2(38, 'ZONE 2 — 38 MIN'), z2(38, 'ZONE 2 — 38 MIN'), long(63, 'LONG RUN — 63 MIN EASY')],
      [z2(35, 'ZONE 2 — 35 MIN'), z2(35, 'EASY 35 MIN'), test(70, '10K TEST — CONTINUOUS, ANY PACE')],
    ],
  },
  performance: {
    id: 'performance',
    name: 'PERFORMANCE',
    weeks: [
      [iv(30, 'INTERVALS — 6 × 2 MIN HARD / 2 MIN EASY'), z2(40, 'ZONE 2 — 40 MIN'), long(60, 'LONG RUN — 60 MIN')],
      [iv(32, 'INTERVALS — 5 × 3 MIN HARD / 2 MIN EASY'), z2(45, 'ZONE 2 — 45 MIN'), long(65, 'LONG RUN — 65 MIN')],
      [iv(35, 'THRESHOLD — 3 × 8 MIN COMFORTABLY HARD'), z2(45, 'ZONE 2 — 45 MIN'), long(70, 'LONG RUN — 70 MIN')],
      [iv(38, 'INTERVALS — 8 × 90 S HARD / 90 S EASY'), z2(48, 'ZONE 2 — 48 MIN'), long(75, 'LONG RUN — 75 MIN')],
    ],
  },
};

export const TRACK_ORDER: TrackId[] = ['foundation', 'builder5k', 'bridge10k', 'performance'];

/** From D rank one weekly session becomes quality work, replacing a Z2 slot. */
export const INTERVAL_SWAP_DESC = 'INTERVALS — 6 × 2 MIN HARD / 2 MIN EASY';

export const CARDIO_WHY =
  'AEROBIC VOLUME AND VO2MAX ARE AMONG THE STRONGEST KNOWN PREDICTORS OF ALL-CAUSE MORTALITY.';

// ---------------------------------------------------------------------------
// Strength, movement floor, rest
// ---------------------------------------------------------------------------

export interface StrengthRx {
  minutes: number;
  desc: string;
}

/** Full-body, progressive overload; bodyweight by default. Indexed by letter (0=E). */
export const STRENGTH_RX: StrengthRx[] = [
  { minutes: 25, desc: '3 ROUNDS: 10 INCLINE PUSH-UPS · 15 SQUATS · 10 ROWS OR HINGES · 15 CALF RAISES · 30 S BALANCE EACH SIDE' },
  { minutes: 30, desc: '3 ROUNDS: 8–12 PUSH-UPS · 20 SQUATS · 12 ROWS · 15 CALF RAISES · 45 S PLANK' },
  { minutes: 35, desc: '4 ROUNDS: PUSH-UP PROGRESSION · SPLIT SQUATS · ROWS · HINGES · 60 S PLANK' },
  { minutes: 40, desc: '4 ROUNDS: HARD PUSH VARIATION · REAR-FOOT SPLIT SQUATS · LOADED ROWS AND HINGES · PLANK COMPLEX' },
  { minutes: 40, desc: '4 ROUNDS: HARD PUSH VARIATION · REAR-FOOT SPLIT SQUATS · LOADED ROWS AND HINGES · PLANK COMPLEX' },
  { minutes: 40, desc: '4 ROUNDS: HARD PUSH VARIATION · REAR-FOOT SPLIT SQUATS · LOADED ROWS AND HINGES · PLANK COMPLEX' },
];

export const STRENGTH_WHY =
  'RESISTANCE TRAINING ≥2×/WEEK IS INDEPENDENTLY ASSOCIATED WITH REDUCED MORTALITY; LOADING DRIVES TENDON AND BONE ADAPTATION.';

export const STRENGTH_NOTE = 'PROGRESS LOAD OR REPS EACH SESSION. LOG WEIGHTS IN NOTES IF AVAILABLE.';

export const STEPS_RX = {
  id: 'steps',
  title: 'MOVEMENT FLOOR',
  short: '7,000 STEPS TODAY',
  rx: '7,000 STEPS TODAY — SELF-REPORTED.',
  why: 'DOSE-RESPONSE COHORT DATA; BENEFITS PLATEAU NEAR 7–9K.',
  tier: 'STRONG' as EvidenceTier,
};

export const REST_RX = {
  id: 'rest',
  title: 'MANDATORY RECOVERY',
  short: 'ADAPTATION OCCURS AT REST',
  rx: 'ADAPTATION OCCURS AT REST.',
  why: 'RECOVERY IS WHERE THE TRAINING EFFECT CONSOLIDATES. THIS ALSO CAPS STREAK-CHASING OVERUSE.',
  tier: 'STRONG' as EvidenceTier,
};
