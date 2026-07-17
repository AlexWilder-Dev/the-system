import { describe, expect, it } from 'vitest';
import { placeHunter, type AssessmentAnswers } from './assessment';

const base: AssessmentAnswers = {
  sex: 'M',
  run: 0,
  pushups: 0,
  build: 2,
  exercise: 0,
  wake: 0,
  routine: 0,
  wakeTime: '06:30',
};

describe('placement — capability names the tier', () => {
  it('sedentary baseline → E-III on the foundation track, level 1', () => {
    const p = placeHunter(base);
    expect(p.letterIndex).toBe(0);
    expect(p.track).toBe('foundation');
    expect(p.seedXp).toBe(0);
  });

  it('1–2 km + basic push-ups → D-III', () => {
    const p = placeHunter({ ...base, run: 1, pushups: 1 });
    expect(p.letterIndex).toBe(1);
    expect(p.track).toBe('builder5k');
  });

  it('5 km + 15 push-ups + healthy build + a consistency signal → C-III', () => {
    const p = placeHunter({ ...base, run: 2, pushups: 2, exercise: 2 });
    expect(p.letterIndex).toBe(2);
    expect(p.track).toBe('bridge10k');
  });

  it('a 15k-a-day runner with structure is B from day one — no rank grinding', () => {
    const p = placeHunter({ ...base, run: 4, pushups: 3, build: 3, exercise: 3, wake: 2, routine: 2 });
    expect(p.letterIndex).toBe(3);
    expect(p.track).toBe('performance');
    expect(p.seedXp).toBe(20250); // LEVEL reads 28, not 1
  });

  it('A and S are never assigned — even absurd answers cap at B', () => {
    const p = placeHunter({ ...base, run: 4, pushups: 4, build: 3, exercise: 3, wake: 2, routine: 2 });
    expect(p.letterIndex).toBe(3);
  });
});

describe('placement — every pillar must hold the tier', () => {
  it('strength must hold the tier: 10 km legs with 15–29 push-ups → C, with 5–14 → D', () => {
    const belowB = placeHunter({ ...base, run: 3, pushups: 2, build: 3, exercise: 3, wake: 2, routine: 2 });
    expect(belowB.letterIndex).toBe(2);
    const belowC = placeHunter({ ...base, run: 3, pushups: 1, build: 3, exercise: 3, wake: 2, routine: 2 });
    expect(belowC.letterIndex).toBe(1);
  });

  it('composition caps at D — C is a healthy-composition identity', () => {
    const p = placeHunter({ ...base, run: 3, pushups: 3, build: 1, exercise: 3, wake: 2, routine: 2 });
    expect(p.letterIndex).toBe(1);
  });

  it('zero structure caps at D even with a 5k', () => {
    const p = placeHunter({ ...base, run: 2, pushups: 2, exercise: 1, wake: 0, routine: 0 });
    expect(p.letterIndex).toBe(1);
  });

  it('B demands real structure: training days AND a routine or tight wake time', () => {
    const noDays = placeHunter({ ...base, run: 3, pushups: 3, build: 3, exercise: 1, wake: 2, routine: 2 });
    expect(noDays.letterIndex).toBe(2);
    const noStructure = placeHunter({ ...base, run: 3, pushups: 3, build: 3, exercise: 3, wake: 0, routine: 1 });
    expect(noStructure.letterIndex).toBe(2);
  });
});

describe('placement — tracks and seeds', () => {
  it('run band selects the matching track, 15k+ lands on performance', () => {
    expect(placeHunter({ ...base, run: 1 }).track).toBe('builder5k');
    expect(placeHunter({ ...base, run: 2 }).track).toBe('bridge10k');
    expect(placeHunter({ ...base, run: 3 }).track).toBe('performance');
    expect(placeHunter({ ...base, run: 4 }).track).toBe('performance');
  });

  it('seeds physical bests from the answer bands', () => {
    const p = placeHunter({ ...base, run: 4, pushups: 4 });
    expect(p.seeds.bestRun_km).toBe(15);
    expect(p.seeds.bestPushups).toBe(50);
  });
});
