// v3 rank structure: the LETTER is who you are — an identity tier that only
// a Gate (a proven capability jump, e.g. finally holding 10 km) changes.
// The sub-ranks III → II → I are mastery WITHIN the tier: they advance on XP
// earned since entering the letter, so a hunter who will never run further
// can still become the best version of what they currently are.
//
// Lifetime XP levels (src/logic/xp.ts) remain as the LEVEL readout and stat
// pacing; they no longer define the letter.

export const LETTERS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Letter = (typeof LETTERS)[number];

export const SUB_RANKS = ['III', 'II', 'I'] as const;
export type SubRank = (typeof SUB_RANKS)[number];

/**
 * XP within the letter to advance III→II and II→I. Tunable design data.
 * At a full daily clear (~80–100 XP) the first step lands in about a week
 * and tier mastery in 2–6 weeks — matched to the consistency windows the
 * Gates demand (21 days at E, 28 at D, …). Higher tiers sharpen slower.
 */
export const SUB_RANK_XP: ReadonlyArray<readonly [number, number]> = [
  [600, 1000], // E
  [800, 1400], // D
  [1000, 1800], // C
  [1200, 2200], // B
  [1400, 2600], // A
  [1600, 3000], // S — cosmetic; there is no further gate
];

export interface SubProgress {
  sub: SubRank;
  /** XP into the current step and the step's size — null once the tier is mastered (I). */
  into: number | null;
  needed: number | null;
}

/** Where xpInLetter (lifetime XP minus the letter's entry mark) sits in the tier. */
export function subProgress(letterIndex: number, xpInLetter: number): SubProgress {
  const [toII, toI] = SUB_RANK_XP[Math.min(Math.max(letterIndex, 0), LETTERS.length - 1)];
  const xp = Math.max(0, xpInLetter);
  if (xp < toII) return { sub: 'III', into: xp, needed: toII };
  if (xp < toII + toI) return { sub: 'II', into: xp - toII, needed: toI };
  return { sub: 'I', into: null, needed: null };
}

export interface DisplayRank {
  letter: Letter;
  letterIndex: number;
  sub: SubRank;
  /** True at X-I: the tier is mastered — only the Gate moves the letter now. */
  mastered: boolean;
}

export function displayRank(letterIndex: number, xpInLetter: number): DisplayRank {
  const index = Math.min(Math.max(letterIndex, 0), LETTERS.length - 1);
  const { sub } = subProgress(index, xpInLetter);
  return { letter: LETTERS[index], letterIndex: index, sub, mastered: sub === 'I' };
}

/** The Gate's rank prerequisite: the current tier must be mastered first. */
export function gateSubRankReached(letterIndex: number, xpInLetter: number): boolean {
  return subProgress(letterIndex, xpInLetter).sub === 'I';
}

/**
 * Cosmetic LEVEL seeding: placement seats the lifetime level at the letter's
 * historical band start (E=1, D=10, C=19, B=28, A=37, S=46) so a B hunter
 * doesn't read "LV 1". Kept for seeding and save migration only — bands no
 * longer drive the letter.
 */
export function letterStartLevel(letterIndex: number): number {
  return 1 + 9 * letterIndex;
}
