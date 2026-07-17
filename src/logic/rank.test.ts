import { describe, expect, it } from 'vitest';
import { displayRank, gateSubRankReached, letterStartLevel, subProgress, SUB_RANK_XP } from './rank';

describe('tier progression (XP within the letter)', () => {
  it('walks III → II → I on the letter thresholds', () => {
    // E: [600, 1000]
    expect(subProgress(0, 0)).toMatchObject({ sub: 'III', into: 0, needed: 600 });
    expect(subProgress(0, 599)).toMatchObject({ sub: 'III', into: 599 });
    expect(subProgress(0, 600)).toMatchObject({ sub: 'II', into: 0, needed: 1000 });
    expect(subProgress(0, 1599)).toMatchObject({ sub: 'II', into: 999 });
    expect(subProgress(0, 1600)).toMatchObject({ sub: 'I', into: null, needed: null });
    expect(subProgress(0, 99_999).sub).toBe('I');
  });

  it('higher letters demand more XP per step', () => {
    for (let i = 1; i < SUB_RANK_XP.length; i++) {
      expect(SUB_RANK_XP[i][0]).toBeGreaterThan(SUB_RANK_XP[i - 1][0]);
      expect(SUB_RANK_XP[i][1]).toBeGreaterThan(SUB_RANK_XP[i - 1][1]);
    }
  });

  it('negative or pre-entry XP clamps to III', () => {
    expect(subProgress(2, -50).sub).toBe('III');
  });
});

describe('displayRank', () => {
  it('the letter comes from gates passed, never from XP', () => {
    expect(displayRank(0, 500_000)).toMatchObject({ letter: 'E', sub: 'I', mastered: true });
    expect(displayRank(3, 0)).toMatchObject({ letter: 'B', sub: 'III', mastered: false });
  });

  it('sub-rank reflects XP within the current letter', () => {
    expect(displayRank(2, 0)).toMatchObject({ letter: 'C', sub: 'III' });
    expect(displayRank(2, 1000)).toMatchObject({ letter: 'C', sub: 'II' });
    expect(displayRank(2, 2800)).toMatchObject({ letter: 'C', sub: 'I', mastered: true });
  });

  it('clamps letter index into E…S', () => {
    expect(displayRank(9, 0).letter).toBe('S');
    expect(displayRank(-1, 0).letter).toBe('E');
  });
});

describe('gateSubRankReached', () => {
  it('requires tier mastery (X-I) before a Gate can open', () => {
    expect(gateSubRankReached(0, 1599)).toBe(false);
    expect(gateSubRankReached(0, 1600)).toBe(true);
    expect(gateSubRankReached(3, 3399)).toBe(false);
    expect(gateSubRankReached(3, 3400)).toBe(true);
  });
});

describe('letterStartLevel (cosmetic LEVEL seeding)', () => {
  it('keeps the historical band starts', () => {
    expect(letterStartLevel(0)).toBe(1);
    expect(letterStartLevel(1)).toBe(10);
    expect(letterStartLevel(3)).toBe(28);
    expect(letterStartLevel(5)).toBe(46);
  });
});
