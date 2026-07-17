// v2 rank structure: six letters, three sub-ranks each, three XP levels per
// sub-rank (v1 XP curve unchanged). Letter bands by level: E 1–9, D 10–18,
// C 19–27, B 28–36, A 37–45, S 46+. XP levels keep accruing past a band, but
// the DISPLAYED letter is capped by gates passed — letters are earned at Gates.

export const LETTERS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type Letter = (typeof LETTERS)[number];

export const SUB_RANKS = ['III', 'II', 'I'] as const;
export type SubRank = (typeof SUB_RANKS)[number];

export const LEVELS_PER_LETTER = 9;

/** First level of a letter band: E=1, D=10, C=19, B=28, A=37, S=46. */
export function letterStartLevel(letterIndex: number): number {
  return 1 + LEVELS_PER_LETTER * letterIndex;
}

/** Which letter band a raw level falls in (uncapped by gates). */
export function letterIndexForLevel(level: number): number {
  return Math.min(Math.floor((level - 1) / LEVELS_PER_LETTER), LETTERS.length - 1);
}

export interface DisplayRank {
  letter: Letter;
  letterIndex: number;
  sub: SubRank;
  /** True when XP has outgrown the letter — held at X-I until the Gate is passed. */
  capped: boolean;
}

export function displayRank(level: number, gatesPassed: number): DisplayRank {
  const gates = Math.min(gatesPassed, LETTERS.length - 1);
  const rawIndex = letterIndexForLevel(level);
  if (rawIndex > gates) {
    return { letter: LETTERS[gates], letterIndex: gates, sub: 'I', capped: true };
  }
  const levelInLetter = Math.max(0, level - letterStartLevel(rawIndex));
  const sub = SUB_RANKS[Math.min(2, Math.floor(levelInLetter / 3))];
  return { letter: LETTERS[rawIndex], letterIndex: rawIndex, sub, capped: false };
}

/** Has the hunter levelled past the current letter's band (the Gate's level prerequisite)? */
export function gateLevelReached(level: number, gatesPassed: number): boolean {
  return letterIndexForLevel(level) > Math.min(gatesPassed, LETTERS.length - 1);
}
