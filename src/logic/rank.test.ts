import { describe, expect, it } from 'vitest';
import { displayRank, gateLevelReached, letterIndexForLevel, letterStartLevel } from './rank';

describe('letter bands', () => {
  it('starts letters at 1, 10, 19, 28, 37, 46', () => {
    expect(letterStartLevel(0)).toBe(1);
    expect(letterStartLevel(1)).toBe(10);
    expect(letterStartLevel(2)).toBe(19);
    expect(letterStartLevel(3)).toBe(28);
    expect(letterStartLevel(4)).toBe(37);
    expect(letterStartLevel(5)).toBe(46);
  });

  it('maps levels to letter bands, capped at S', () => {
    expect(letterIndexForLevel(1)).toBe(0);
    expect(letterIndexForLevel(9)).toBe(0);
    expect(letterIndexForLevel(10)).toBe(1);
    expect(letterIndexForLevel(18)).toBe(1);
    expect(letterIndexForLevel(19)).toBe(2);
    expect(letterIndexForLevel(46)).toBe(5);
    expect(letterIndexForLevel(120)).toBe(5);
  });
});

describe('displayRank', () => {
  it('walks sub-ranks III → II → I inside a letter', () => {
    expect(displayRank(1, 0)).toMatchObject({ letter: 'E', sub: 'III', capped: false });
    expect(displayRank(3, 0)).toMatchObject({ letter: 'E', sub: 'III' });
    expect(displayRank(4, 0)).toMatchObject({ letter: 'E', sub: 'II' });
    expect(displayRank(7, 0)).toMatchObject({ letter: 'E', sub: 'I' });
    expect(displayRank(9, 0)).toMatchObject({ letter: 'E', sub: 'I', capped: false });
  });

  it('holds at X-I past the band until the Gate is passed', () => {
    expect(displayRank(10, 0)).toMatchObject({ letter: 'E', sub: 'I', capped: true });
    expect(displayRank(25, 0)).toMatchObject({ letter: 'E', sub: 'I', capped: true });
    expect(displayRank(19, 1)).toMatchObject({ letter: 'D', sub: 'I', capped: true });
  });

  it('releases the next letter after a Gate pass', () => {
    expect(displayRank(10, 1)).toMatchObject({ letter: 'D', sub: 'III', capped: false });
    expect(displayRank(13, 1)).toMatchObject({ letter: 'D', sub: 'II' });
    expect(displayRank(19, 2)).toMatchObject({ letter: 'C', sub: 'III' });
    expect(displayRank(28, 3)).toMatchObject({ letter: 'B', sub: 'III' });
    expect(displayRank(37, 4)).toMatchObject({ letter: 'A', sub: 'III' });
  });

  it('never caps at S — there is no further gate', () => {
    expect(displayRank(46, 5)).toMatchObject({ letter: 'S', sub: 'III', capped: false });
    expect(displayRank(55, 5)).toMatchObject({ letter: 'S', sub: 'I', capped: false });
    expect(displayRank(200, 5)).toMatchObject({ letter: 'S', sub: 'I', capped: false });
  });
});

describe('gateLevelReached', () => {
  it('requires levelling past the current band', () => {
    expect(gateLevelReached(9, 0)).toBe(false);
    expect(gateLevelReached(10, 0)).toBe(true);
    expect(gateLevelReached(10, 1)).toBe(false);
    expect(gateLevelReached(19, 1)).toBe(true);
  });
});
