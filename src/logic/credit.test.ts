import { describe, expect, it } from 'vitest';
import { performanceCredit, xpForResult } from './credit';

describe('graded credit', () => {
  it('MET earns full XP by difficulty', () => {
    expect(xpForResult('MET', 1, 0)).toBe(10);
    expect(xpForResult('MET', 2, 0)).toBe(20);
    expect(xpForResult('MET', 3, 0)).toBe(35);
  });

  it('ATTEMPTED earns 70%, rounded', () => {
    expect(xpForResult('ATTEMPTED', 1, 0)).toBe(7);
    expect(xpForResult('ATTEMPTED', 2, 0)).toBe(14);
    expect(xpForResult('ATTEMPTED', 3, 0)).toBe(25); // 24.5 rounds up
  });

  it('EXCEEDED earns 120%, rounded', () => {
    expect(xpForResult('EXCEEDED', 1, 0)).toBe(12);
    expect(xpForResult('EXCEEDED', 2, 0)).toBe(24);
    expect(xpForResult('EXCEEDED', 3, 0)).toBe(42);
  });

  it('applies the streak bonus to every grade', () => {
    expect(xpForResult('MET', 2, 7)).toBe(22); // +10%
    expect(xpForResult('ATTEMPTED', 2, 7)).toBe(15); // 70% of 22
    expect(xpForResult('EXCEEDED', 2, 7)).toBe(26); // 120% of 22
    expect(xpForResult('MET', 3, 66)).toBe(46); // +30%
    expect(xpForResult('ATTEMPTED', 3, 66)).toBe(32);
  });

  it('performance credit: MET and EXCEEDED count, ATTEMPTED does not', () => {
    expect(performanceCredit('MET')).toBe(true);
    expect(performanceCredit('EXCEEDED')).toBe(true);
    expect(performanceCredit('ATTEMPTED')).toBe(false);
  });
});
