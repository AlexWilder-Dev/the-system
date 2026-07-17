import { describe, expect, it } from 'vitest';
import { placeHunter, type AssessmentAnswers } from './assessment';

const base: AssessmentAnswers = { sex: 'M', run: 0, pushups: 0, wake: 0, exercise: 0, wakeTime: '06:30' };

describe('placement (AC2)', () => {
  it('everything else → E-III on the foundation track, level 1', () => {
    const p = placeHunter(base);
    expect(p.letterIndex).toBe(0);
    expect(p.track).toBe('foundation');
    expect(p.seedXp).toBe(0);
  });

  it('5k + 15 push-ups + some consistency → D-III (level 10 = 2700 XP)', () => {
    const p = placeHunter({ ...base, run: 2, pushups: 2, wake: 1 });
    expect(p.letterIndex).toBe(1);
    expect(p.track).toBe('bridge10k');
    expect(p.seedXp).toBe(2700);
  });

  it('5k + 15 push-ups but zero consistency signal → still E-III', () => {
    const p = placeHunter({ ...base, run: 2, pushups: 2, wake: 0, exercise: 1 });
    expect(p.letterIndex).toBe(0);
  });

  it('exercise frequency can supply the consistency signal', () => {
    const p = placeHunter({ ...base, run: 2, pushups: 2, exercise: 2 });
    expect(p.letterIndex).toBe(1);
  });

  it('10k+ and 30 push-ups → C-III (level 19 = 9450 XP), performance track', () => {
    const p = placeHunter({ ...base, run: 3, pushups: 3 });
    expect(p.letterIndex).toBe(2);
    expect(p.track).toBe('performance');
    expect(p.seedXp).toBe(9450);
  });

  it('run band always selects the matching track', () => {
    expect(placeHunter({ ...base, run: 1 }).track).toBe('builder5k');
    expect(placeHunter({ ...base, run: 2 }).track).toBe('bridge10k');
  });

  it('seeds physical bests from the answer bands', () => {
    const p = placeHunter({ ...base, run: 2, pushups: 1 });
    expect(p.seeds.bestRun_km).toBe(5);
    expect(p.seeds.bestPushups).toBe(9);
  });
});
