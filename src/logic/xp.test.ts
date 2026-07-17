import { describe, expect, it } from 'vitest';
import { levelForXp, xpForCompletion, xpRequiredForLevel } from './xp';

describe('xpRequiredForLevel', () => {
  it('starts level 1 at 0 XP', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  it('costs 50 more per level: 100, 150, 200…', () => {
    expect(xpRequiredForLevel(2)).toBe(100);
    expect(xpRequiredForLevel(3)).toBe(250);
    expect(xpRequiredForLevel(4)).toBe(450);
    expect(xpRequiredForLevel(5)).toBe(700);
  });

  it('puts level 10 (rank D gate) at 2700 XP', () => {
    expect(xpRequiredForLevel(10)).toBe(2700);
  });
});

describe('levelForXp', () => {
  it('is level 1 at 0 XP', () => {
    expect(levelForXp(0)).toBe(1);
  });

  it('crosses thresholds exactly', () => {
    expect(levelForXp(99)).toBe(1);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(249)).toBe(2);
    expect(levelForXp(250)).toBe(3);
    expect(levelForXp(340)).toBe(3); // spec example: bar reads 340 / 450
    expect(levelForXp(449)).toBe(3);
    expect(levelForXp(450)).toBe(4);
  });

  it('never decreases as xp grows', () => {
    let prev = 1;
    for (let xp = 0; xp <= 5000; xp += 7) {
      const lv = levelForXp(xp);
      expect(lv).toBeGreaterThanOrEqual(prev);
      prev = lv;
    }
  });
});

describe('xpForCompletion', () => {
  it('uses base XP 10/20/35 with no streak', () => {
    expect(xpForCompletion(1, 0)).toBe(10);
    expect(xpForCompletion(2, 3)).toBe(20);
    expect(xpForCompletion(3, 6)).toBe(35);
  });

  it('applies streak bonuses', () => {
    expect(xpForCompletion(2, 7)).toBe(22); // +10%
    expect(xpForCompletion(2, 21)).toBe(24); // +20%
    expect(xpForCompletion(3, 66)).toBe(46); // +30%, rounded
    expect(xpForCompletion(1, 200)).toBe(13); // cap holds at 30%
  });
});
