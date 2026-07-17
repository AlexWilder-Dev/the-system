import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Sex } from '../types';
import { useGame } from '../state/GameContext';
import { placeHunter, type AssessmentAnswers } from '../logic/assessment';
import { LETTERS, SUB_RANKS } from '../logic/rank';
import { dramatic, settle, useAnim, useMaterialize } from '../motion/springs';

// The measurement: one question per screen, big tappable options, no typing
// except the name. The System places the hunter; the user does not configure.

type Step =
  | 'accept'
  | 'name'
  | 'sex'
  | 'run'
  | 'pushups'
  | 'build'
  | 'exercise'
  | 'wake'
  | 'routine'
  | 'waketime'
  | 'reveal';

const WAKE_TIMES = ['05:00', '05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00'];

export function Assessment() {
  const { state, assess } = useGame();
  const tSettle = useAnim(settle);
  const tDramatic = useAnim(dramatic);
  const mPanel = useMaterialize();

  // A migrated hunter already has a name — the System only re-measures.
  const migrated = state !== null;
  const [step, setStep] = useState<Step>('accept');
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState(state?.hunter.name ?? '');
  const [sex, setSex] = useState<Sex>('M');
  const [run, setRun] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [pushups, setPushups] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [build, setBuild] = useState<0 | 1 | 2 | 3>(0);
  const [exercise, setExercise] = useState<0 | 1 | 2 | 3>(0);
  const [wake, setWake] = useState<0 | 1 | 2>(0);
  const [routine, setRoutine] = useState<0 | 1 | 2>(0);
  const [wakeTime, setWakeTime] = useState('06:30');

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(timer);
  }, []);

  const answers: AssessmentAnswers = { sex, run, pushups, build, exercise, wake, routine, wakeTime };
  const placement = useMemo(
    () => placeHunter(answers),
    [sex, run, pushups, build, exercise, wake, routine, wakeTime],
  );

  const panel = (key: string, children: ReactNode) => (
    <motion.div key={key} className="awakening-step" {...mPanel} exit={{ opacity: 0 }}>
      <div className="sys-panel overlay-panel">{children}</div>
    </motion.div>
  );

  // A mis-tap must never commit a measurement — every question can step back.
  const PREV: Partial<Record<Step, Step>> = {
    name: 'accept',
    sex: migrated ? 'accept' : 'name',
    run: 'sex',
    pushups: 'run',
    build: 'pushups',
    exercise: 'build',
    wake: 'exercise',
    routine: 'wake',
    waketime: 'routine',
    reveal: 'waketime',
  };

  const backBtn = (key: Step) =>
    PREV[key] ? (
      <button className="sys-btn sys-btn--quiet assess-back" onClick={() => setStep(PREV[key]!)}>
        ← BACK
      </button>
    ) : null;

  const question = (
    key: Step,
    progress: string,
    text: string,
    options: string[],
    onPick: (i: number) => void,
  ) =>
    panel(
      key,
      <>
        <div className="assess-progress">MEASUREMENT {progress}</div>
        <p className="overlay-copy">{text}</p>
        <div className="choice-list">
          {options.map((label, i) => (
            <button key={label} className="choice-btn" onClick={() => onPick(i)}>
              {label}
            </button>
          ))}
        </div>
        {backBtn(key)}
      </>,
    );

  return (
    <div className="awakening">
      <AnimatePresence mode="wait">
        {step === 'accept' &&
          visible &&
          panel(
            'accept',
            <>
              <div className="overlay-eyebrow">NOTIFICATION</div>
              <p className="overlay-copy">
                {migrated
                  ? 'THE SYSTEM HAS BEEN REVISED. A MEASUREMENT IS REQUIRED. PROCEED?'
                  : 'YOU HAVE ACQUIRED THE QUALIFICATIONS TO BECOME A PLAYER. WILL YOU ACCEPT?'}
              </p>
              <button
                className="sys-btn sys-btn--primary"
                autoFocus
                onClick={() => setStep(migrated ? 'sex' : 'name')}
              >
                {migrated ? 'PROCEED' : 'ACCEPT'}
              </button>
            </>,
          )}

        {step === 'name' &&
          panel(
            'name',
            <>
              <div className="overlay-eyebrow">SYSTEM</div>
              <p className="overlay-copy">STATE YOUR NAME, HUNTER.</p>
              <div className="sys-field">
                <input
                  className="sys-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name.trim() && setStep('sex')}
                  maxLength={24}
                  aria-label="Your name"
                  autoFocus
                />
              </div>
              <button className="sys-btn sys-btn--primary" disabled={!name.trim()} onClick={() => setStep('sex')}>
                CONFIRM
              </button>
            </>,
          )}

        {step === 'sex' &&
          question('sex', '1 / 8', 'SEX — USED ONLY TO SELECT STANDARDS TABLES.', ['MALE', 'FEMALE'], (i) => {
            setSex(i === 0 ? 'M' : 'F');
            setStep('run');
          })}

        {step === 'run' &&
          question(
            'run',
            '2 / 8',
            'HOW FAR CAN YOU RUN WITHOUT STOPPING — TODAY, NOT AT YOUR PEAK?',
            ["CAN'T RUN 1 KM", '1–2 KM', '5 KM', '10 KM', '15 KM OR MORE'],
            (i) => {
              setRun(i as 0 | 1 | 2 | 3 | 4);
              setStep('pushups');
            },
          )}

        {step === 'pushups' &&
          question(
            'pushups',
            '3 / 8',
            'MAXIMUM PUSH-UPS IN ONE SET, STRICT FORM?',
            ['0–4', '5–14', '15–29', '30–49', '50+'],
            (i) => {
              setPushups(i as 0 | 1 | 2 | 3 | 4);
              setStep('build');
            },
          )}

        {step === 'build' &&
          question(
            'build',
            '4 / 8',
            'BODY COMPOSITION — ANSWER HONESTLY. THE SCALE LIES TO THE MUSCULAR; A WAIST UNDER HALF YOUR HEIGHT IS THE BETTER MARKER.',
            ['SIGNIFICANT EXCESS WEIGHT', 'CARRYING EXTRA', 'ABOUT AVERAGE', 'LEAN / ATHLETIC'],
            (i) => {
              setBuild(i as 0 | 1 | 2 | 3);
              setStep('exercise');
            },
          )}

        {step === 'exercise' &&
          question(
            'exercise',
            '5 / 8',
            'DAYS PER WEEK YOU CURRENTLY EXERCISE?',
            ['0', '1–2', '3–4', '5+'],
            (i) => {
              setExercise(i as 0 | 1 | 2 | 3);
              setStep('wake');
            },
          )}

        {step === 'wake' &&
          question(
            'wake',
            '6 / 8',
            'DO YOU WAKE AT A CONSISTENT TIME?',
            ['VARIES WILDLY', 'WITHIN ~1 HOUR', 'WITHIN 30 MIN'],
            (i) => {
              setWake(i as 0 | 1 | 2);
              setStep('routine');
            },
          )}

        {step === 'routine' &&
          question(
            'routine',
            '7 / 8',
            'DO YOUR MORNINGS FOLLOW A STRUCTURE?',
            ['NO ROUTINE', 'LOOSELY', 'A SOLID ROUTINE'],
            (i) => {
              setRoutine(i as 0 | 1 | 2);
              setStep('waketime');
            },
          )}

        {step === 'waketime' &&
          panel(
            'waketime',
            <>
              <div className="assess-progress">MEASUREMENT 8 / 8</div>
              <p className="overlay-copy">TARGET WAKE TIME. YOUR 30-MIN WINDOW STARTS HERE.</p>
              <div className="choice-grid">
                {WAKE_TIMES.map((t) => (
                  <button
                    key={t}
                    className="choice-btn"
                    onClick={() => {
                      setWakeTime(t);
                      setStep('reveal');
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {backBtn('waketime')}
            </>,
          )}

        {step === 'reveal' && (
          <motion.div
            key="reveal"
            className="awakening-step"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={tSettle}
            onClick={() => assess(name.trim(), answers)}
            style={{ cursor: 'pointer', minHeight: '70vh', justifyContent: 'center' }}
          >
            <motion.div
              className="rank-letter num"
              initial={{ scale: 2.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={tDramatic}
            >
              {LETTERS[placement.letterIndex]}
              <span className="subrank">-{SUB_RANKS[0]}</span>
            </motion.div>
            <motion.p className="overlay-copy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tSettle}>
              MEASUREMENT COMPLETE. RANK: {LETTERS[placement.letterIndex]}-III.
            </motion.p>
            <p className="tap-hint">TAP TO ENTER</p>
            <button
              className="sys-btn sys-btn--quiet assess-back"
              onClick={(e) => {
                e.stopPropagation();
                setStep('waketime');
              }}
            >
              ← BACK
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
