import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';
import type { AppState, GateAttemptRecord, Profile, Quest, Result, ResultStatus, StatKey, TrackId } from '../types';
import { emptyGateProgress } from '../types';
import { ROUTINE_BONUS_ID, ROUTINE_BONUS_XP, ROUTINE_STEPS } from '../data/protocols';
import { addDays, localDateOfISO, localDateStr } from '../logic/dates';
import { levelForXp, xpRequiredForLevel } from '../logic/xp';
import { haptic, HAPTIC } from '../motion/haptics';
import { performanceCredit, xpForResult } from '../logic/credit';
import { LETTERS, subProgress, type Letter } from '../logic/rank';
import { computeStreak, type StreakResult } from '../logic/streak';
import { needsDailyReset, applyDailyReset } from '../logic/reset';
import { statDeltas } from '../logic/deltas';
import { resultDates, isLoggedOn } from '../logic/completions';
import { questMeta, parseCardioId } from '../logic/quests';
import { advanceOnResult, dayOfWeek, isDeloadWeek, prescribeForDate, weekNumberFor } from '../logic/schedule';
import { attemptShortfalls, bestsFromReport, evaluateGateReport, nextGate, type GateReport } from '../logic/gatecheck';
import { placeHunter, type AssessmentAnswers } from '../logic/assessment';
import { clearState, loadDebugOffset, loadState, saveDebugOffset, saveState } from './storage';

export const MAX_ACTIVE_QUESTS = 5;
export const MORNING_CLOSE_HOUR = 12;

export type Overlay =
  | { kind: 'levelup'; level: number; deltas: Partial<Record<StatKey, number>> }
  | { kind: 'subrank'; label: string; mastered: boolean }
  | { kind: 'rankup'; letter: Letter; gateName: string }
  | { kind: 'gatefail' }
  | { kind: 'stamp' };

type Action =
  | { type: 'INIT'; state: AppState }
  | {
      type: 'PLACE';
      profile: Profile;
      gatesPassed: number;
      xp: number;
      seeds: Partial<AppState['gateProgress']>;
      statSeeds: Record<StatKey, number>;
      date: string;
    }
  | { type: 'PRESCRIBE'; date: string; questIds: string[] }
  | { type: 'LOG_RESULT'; result: Result; advance?: { trackId: TrackId; slotLevels: number[] }; bestRunKm?: number }
  | { type: 'UNDO_RESULT'; questId: string; date: string }
  | { type: 'TICK_ROUTINE'; date: string; id: string; on: boolean }
  | { type: 'ADD_QUEST'; quest: Quest }
  | { type: 'UPDATE_QUEST'; quest: Quest }
  | { type: 'SET_QUEST_ACTIVE'; id: string; active: boolean }
  | { type: 'DAILY_RESET'; date: string }
  | { type: 'GATE_ENTER'; date: string }
  | { type: 'GATE_RESOLVE'; pass: boolean; bests: AppState['gateProgress']; result: Result; record: GateAttemptRecord }
  | { type: 'SHIFT_SESSION'; today: string; tomorrow: string; questIds: string[] }
  | { type: 'UNSHIFT_SESSION'; today: string; tomorrow: string; questIds: string[] }
  | { type: 'SET_WAKE'; time: string }
  | { type: 'DEV_RANK_UP' }
  | { type: 'REASSESS' }
  | { type: 'RESET' }
  | { type: 'IMPORT'; state: AppState }
  | { type: 'DEBUG_XP'; amount: number };

function activeCount(state: AppState): number {
  return state.quests.filter((q) => q.active).length;
}

function withPrescription(state: AppState, date: string, questIds: string[]): AppState {
  if (state.prescriptions.some((p) => p.date === date)) return state;
  return { ...state, prescriptions: [...state.prescriptions, { date, questIds }] };
}

function reducer(state: AppState | null, action: Action): AppState | null {
  if (action.type === 'INIT' || action.type === 'IMPORT') return action.state;
  if (action.type === 'RESET') return null;
  if (!state) return state;

  switch (action.type) {
    case 'PLACE': {
      // Re-measurement keeps XP and history; letters are earned at Gates and
      // never downgrade. Today's (and any future) prescriptions and shifts are
      // stale under the new placement — drop them so they regenerate.
      const gatesPassed = Math.max(state.gatesPassed, action.gatesPassed);
      const xp = Math.max(state.xp, action.xp);
      return {
        ...state,
        profile: action.profile,
        gatesPassed,
        xp,
        // A newly named letter starts its tier at III; re-measuring inside
        // the same letter keeps the tier progress already earned.
        letterXpStart: gatesPassed !== state.gatesPassed ? xp : Math.min(state.letterXpStart, xp),
        statSeeds: action.statSeeds,
        gateProgress: { ...state.gateProgress, ...action.seeds },
        trackLevels: [0, 0, 0],
        gateAttempt: null,
        prescriptions: state.prescriptions.filter((p) => p.date < action.date),
        dayOverrides: Object.fromEntries(
          Object.entries(state.dayOverrides).filter(([date]) => date < action.date),
        ),
      };
    }
    case 'PRESCRIBE':
      return withPrescription(state, action.date, action.questIds);
    case 'LOG_RESULT': {
      const { result } = action;
      if (isLoggedOn(state.results, result.questId, result.date)) return state;
      let next: AppState = { ...state, xp: state.xp + result.xpEarned, results: [...state.results, result] };
      if (action.advance && next.profile) {
        next = {
          ...next,
          profile: { ...next.profile, track: action.advance.trackId },
          trackLevels: action.advance.slotLevels,
        };
      }
      if (action.bestRunKm !== undefined && action.bestRunKm > next.gateProgress.bestRun_km) {
        next = { ...next, gateProgress: { ...next.gateProgress, bestRun_km: action.bestRunKm } };
      }
      return next;
    }
    case 'UNDO_RESULT': {
      // Mis-tap correction only: removes the entry the tap created, same day —
      // and restores what the log changed (progression, best run), so an
      // undone session cannot skip a training week or leave a phantom best.
      const idx = state.results.findIndex((r) => r.questId === action.questId && r.date === action.date);
      if (idx < 0) return state;
      const removed = state.results[idx];
      let next: AppState = {
        ...state,
        xp: Math.max(0, state.xp - removed.xpEarned),
        results: state.results.filter((_, i) => i !== idx),
      };
      if (removed.revert) {
        next = {
          ...next,
          profile: next.profile ? { ...next.profile, track: removed.revert.track } : next.profile,
          trackLevels: removed.revert.trackLevels,
          gateProgress: { ...next.gateProgress, bestRun_km: removed.revert.bestRun_km },
        };
      }
      return next;
    }
    case 'TICK_ROUTINE': {
      const current = state.routineTicks[action.date] ?? [];
      const ticks = action.on
        ? current.includes(action.id)
          ? current
          : [...current, action.id]
        : current.filter((id) => id !== action.id);
      return { ...state, routineTicks: { ...state.routineTicks, [action.date]: ticks } };
    }
    case 'ADD_QUEST':
      if (activeCount(state) >= MAX_ACTIVE_QUESTS) return state;
      return { ...state, quests: [...state.quests, action.quest] };
    case 'UPDATE_QUEST':
      return { ...state, quests: state.quests.map((q) => (q.id === action.quest.id ? action.quest : q)) };
    case 'SET_QUEST_ACTIVE': {
      if (action.active && activeCount(state) >= MAX_ACTIVE_QUESTS) return state;
      return {
        ...state,
        quests: state.quests.map((q) => (q.id === action.id ? { ...q, active: action.active } : q)),
      };
    }
    case 'DAILY_RESET':
      return applyDailyReset(state, action.date);
    case 'GATE_ENTER':
      return { ...state, gateAttempt: { date: action.date } };
    case 'GATE_RESOLVE': {
      const next: AppState = {
        ...state,
        gateAttempt: null,
        gateProgress: action.bests,
        xp: state.xp + action.result.xpEarned,
        results: [...state.results, action.result],
        gateHistory: [...state.gateHistory, action.record],
      };
      // A pass enters the next letter at X-III: the tier clock restarts.
      return action.pass
        ? { ...next, gatesPassed: Math.min(5, state.gatesPassed + 1), letterXpStart: next.xp }
        : next;
    }
    case 'SHIFT_SESSION': {
      const overrides = {
        ...state.dayOverrides,
        [action.today]: dayOfWeek(action.tomorrow),
        [action.tomorrow]: dayOfWeek(action.today),
      };
      // Regenerate today's prescription with the swapped template.
      const prescriptions = state.prescriptions.map((p) =>
        p.date === action.today ? { date: p.date, questIds: action.questIds } : p,
      );
      return { ...state, dayOverrides: overrides, prescriptions };
    }
    case 'UNSHIFT_SESSION': {
      const overrides = Object.fromEntries(
        Object.entries(state.dayOverrides).filter(([date]) => date !== action.today && date !== action.tomorrow),
      );
      const prescriptions = state.prescriptions.map((p) =>
        p.date === action.today ? { date: p.date, questIds: action.questIds } : p,
      );
      return { ...state, dayOverrides: overrides, prescriptions };
    }
    case 'SET_WAKE':
      return state.profile ? { ...state, profile: { ...state.profile, wakeWindowStart: action.time } } : state;
    case 'DEV_RANK_UP':
      // DEV TEST only: fakes a Gate pass so rank graphics can be inspected.
      if (state.gatesPassed >= 5) return state;
      return { ...state, gatesPassed: state.gatesPassed + 1, letterXpStart: state.xp };
    case 'REASSESS':
      // The hunter believes the measurement is stale. Dropping the profile
      // routes back to the assessment; PLACE re-seats them, history intact.
      return { ...state, profile: null };
    case 'DEBUG_XP':
      return { ...state, xp: state.xp + action.amount };
  }
}

interface GameApi {
  state: AppState | null;
  today: string;
  streak: StreakResult;
  debug: boolean;
  /** Prescribed quest ids for today (morning + fitness). */
  todayIds: string[];
  morningOpen: boolean;
  /** Structure steps ticked today (rt: ids). */
  routineTicksToday: string[];
  assess: (name: string, answers: AssessmentAnswers) => void;
  logResult: (questId: string, status: ResultStatus, detail?: string, runKm?: number) => number;
  undoResult: (questId: string) => void;
  tickRoutine: (id: string, on: boolean) => void;
  addQuest: (quest: Quest) => void;
  updateQuest: (quest: Quest) => void;
  setQuestActive: (id: string, active: boolean) => void;
  enterGate: () => void;
  submitGateReport: (report: GateReport) => void;
  shiftSession: () => void;
  unshiftSession: () => void;
  setWakeWindow: (time: string) => void;
  requestReassess: () => void;
  resetAll: () => void;
  importState: (s: AppState) => void;
  grantDebugXp: () => void;
  /** DEV TEST: grants exactly the XP to reach the next level — for graphics testing. */
  devLevelUp: () => void;
  /** DEV TEST: grants exactly the XP to the next sub-rank (no-op at X-I). */
  devSubRankUp: () => void;
  /** DEV TEST: fakes a Gate pass — letter up, tier restarts, full ceremony. */
  devRankUp: () => void;
  debugAdvanceDay: () => void;
  debugFillToday: (status: ResultStatus) => void;
  overlay: Overlay | null;
  dismissOverlay: () => void;
}

const GameContext = createContext<GameApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const debug = useMemo(() => new URLSearchParams(window.location.search).has('debug'), []);
  const [dayOffset, setDayOffset] = useState(() => (debug ? loadDebugOffset() : 0));
  const [clock, setClock] = useState(() => localDateStr());
  // Reactive: an app left open across noon must see the window close.
  const [morningOpen, setMorningOpen] = useState(() => new Date().getHours() < MORNING_CLOSE_HOUR);
  const [queue, setQueue] = useState<Overlay[]>([]);

  const today = dayOffset === 0 ? clock : addDays(clock, dayOffset);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  useEffect(() => {
    const check = () => {
      setClock(localDateStr());
      setMorningOpen(new Date().getHours() < MORNING_CLOSE_HOUR);
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const interval = window.setInterval(check, 30_000);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      window.clearInterval(interval);
    };
  }, []);

  // Day roll: move the reset marker, then make sure today has a prescription.
  useEffect(() => {
    if (!state) return;
    if (needsDailyReset(state.lastResetDate, today)) {
      dispatch({ type: 'DAILY_RESET', date: today });
      return;
    }
    if (state.profile && !state.prescriptions.some((p) => p.date === today)) {
      dispatch({ type: 'PRESCRIBE', date: today, questIds: prescribeForDate(state, today) });
    }
  }, [state, today]);

  const streak = useMemo(
    () => computeStreak(state ? resultDates(state.results) : [], today),
    [state, today],
  );

  const todayIds = useMemo(
    () => state?.prescriptions.find((p) => p.date === today)?.questIds ?? [],
    [state, today],
  );

  const routineTicksToday = state?.routineTicks[today] ?? [];

  const pushOverlays = useCallback((events: Overlay[]) => {
    if (events.length) setQueue((prev) => [...prev, ...events]);
  }, []);

  /** Level-up and sub-rank detection shared by result logging and debug XP. */
  const progressEvents = useCallback(
    (s: AppState, xpEarned: number, newResults: Result[]): Overlay[] => {
      const events: Overlay[] = [];
      const before = levelForXp(s.xp);
      const after = levelForXp(s.xp + xpEarned);
      if (after > before) {
        events.push({
          kind: 'levelup',
          level: after,
          deltas: statDeltas(
            s.quests,
            s.statSeeds,
            { results: s.results, level: before },
            { results: newResults, level: after },
          ),
        });
      }
      // Sub-ranks move on XP within the letter — independent of lifetime levels.
      const subBefore = subProgress(s.gatesPassed, s.xp - s.letterXpStart).sub;
      const subAfter = subProgress(s.gatesPassed, s.xp + xpEarned - s.letterXpStart).sub;
      if (subBefore !== subAfter) {
        const letter = LETTERS[Math.min(s.gatesPassed, LETTERS.length - 1)];
        events.push({ kind: 'subrank', label: `${letter}-${subAfter}`, mastered: subAfter === 'I' });
      }
      return events;
    },
    [],
  );

  /**
   * FULL PROTOCOL bonus: every prescribed morning protocol logged AND every
   * structure step ticked — once per day, flat XP, no consistency weight.
   */
  const routineBonusIfDue = useCallback(
    (results: Result[], ticks: string[]): Result | null => {
      if (!state) return null;
      const morningIds = todayIds.filter((id) => id.startsWith('mp:'));
      if (morningIds.length === 0) return null;
      if (isLoggedOn(results, ROUTINE_BONUS_ID, today)) return null;
      if (!morningIds.every((id) => isLoggedOn(results, id, today))) return null;
      if (!ROUTINE_STEPS.every((step) => ticks.includes(step.id))) return null;
      return { questId: ROUTINE_BONUS_ID, date: today, status: 'MET', xpEarned: ROUTINE_BONUS_XP };
    },
    [state, todayIds, today],
  );

  const logResult = useCallback(
    (questId: string, status: ResultStatus, detail?: string, runKm?: number): number => {
      if (!state || !state.profile) return 0;
      if (isLoggedOn(state.results, questId, today)) return 0;
      const meta = questMeta(questId, state.quests);
      if (!meta) return 0;

      // The morning window is a rule that forgives: past the cutoff the
      // protocol still logs — as ATTEMPTED. Consistency credit, reduced XP.
      if (meta.kind === 'morning' && !morningOpen && status !== 'ATTEMPTED') {
        status = 'ATTEMPTED';
      }

      const dates = resultDates(state.results);
      dates.add(today);
      const streakNow = computeStreak(dates, today);
      const xpEarned = xpForResult(status, meta.difficulty, streakNow.days);
      const result: Result = { questId, date: today, status, xpEarned, ...(detail ? { detail } : {}) };

      // Cardio progression: MET or better advances the slot (frozen on
      // deloads); ATTEMPTED repeats. Anything the log changes beyond XP is
      // snapshotted on the result so a long-press undo can restore it.
      let advance: { trackId: TrackId; slotLevels: number[] } | undefined;
      const cardio = parseCardioId(questId);
      const bestRunKm = performanceCredit(status) ? runKm : undefined;
      if (cardio) {
        const deload = isDeloadWeek(weekNumberFor(localDateOfISO(state.profile.assessedAt), today));
        advance = advanceOnResult(state.profile.track, state.trackLevels, cardio.slot, status, deload);
        const advances =
          advance.trackId !== state.profile.track ||
          advance.slotLevels.some((lv, i) => lv !== state.trackLevels[i]);
        const raisesBest = bestRunKm !== undefined && bestRunKm > state.gateProgress.bestRun_km;
        if (advances || raisesBest) {
          result.revert = {
            track: state.profile.track,
            trackLevels: state.trackLevels,
            bestRun_km: state.gateProgress.bestRun_km,
          };
        }
      }
      dispatch({ type: 'LOG_RESULT', result, advance, bestRunKm });
      haptic(HAPTIC.tap);

      // Completing the last morning protocol can complete the full routine.
      const bonus = routineBonusIfDue([...state.results, result], routineTicksToday);
      if (bonus) dispatch({ type: 'LOG_RESULT', result: bonus });
      const totalXp = xpEarned + (bonus?.xpEarned ?? 0);

      const events = progressEvents(state, totalXp, [...state.results, result]);
      // Daily stamp: every still-pending prescribed quest + active personal quest done.
      const pending = todayIds.filter((id) => id !== questId && !isLoggedOn(state.results, id, today));
      const personalPending = state.quests.filter(
        (q) => q.active && q.id !== questId && !isLoggedOn(state.results, q.id, today),
      );
      if (todayIds.length > 0 && pending.length === 0 && personalPending.length === 0) {
        events.push({ kind: 'stamp' });
      }
      pushOverlays(events);
      return totalXp;
    },
    [state, today, todayIds, morningOpen, routineTicksToday, routineBonusIfDue, progressEvents, pushOverlays],
  );

  const tickRoutine = useCallback(
    (id: string, on: boolean) => {
      if (!state) return;
      dispatch({ type: 'TICK_ROUTINE', date: today, id, on });
      if (!on) return;
      const ticks = routineTicksToday.includes(id) ? routineTicksToday : [...routineTicksToday, id];
      const bonus = routineBonusIfDue(state.results, ticks);
      if (bonus) {
        dispatch({ type: 'LOG_RESULT', result: bonus });
        pushOverlays(progressEvents(state, bonus.xpEarned, state.results));
      }
    },
    [state, today, routineTicksToday, routineBonusIfDue, progressEvents, pushOverlays],
  );

  const submitGateReport = useCallback(
    (report: GateReport) => {
      if (!state || !state.profile) return;
      const gate = nextGate(state.gatesPassed);
      if (!gate) return;
      const { pass } = evaluateGateReport(gate, state.profile.sex, report);
      const bests = bestsFromReport(state.gateProgress, gate, report);
      const record: GateAttemptRecord = {
        date: today,
        from: gate.from,
        pass,
        shortfalls: pass ? [] : attemptShortfalls(gate, state.profile.sex, report),
      };
      const dates = resultDates(state.results);
      dates.add(today);
      const xpEarned = xpForResult(pass ? 'MET' : 'ATTEMPTED', 3, computeStreak(dates, today).days);
      const result: Result = { questId: 'gate', date: today, status: pass ? 'MET' : 'ATTEMPTED', xpEarned };
      dispatch({ type: 'GATE_RESOLVE', pass, bests, result, record });
      pushOverlays(
        pass
          ? [{ kind: 'rankup', letter: LETTERS[Math.min(LETTERS.length - 1, state.gatesPassed + 1)], gateName: gate.name }]
          : [{ kind: 'gatefail' }],
      );
    },
    [state, today, pushOverlays],
  );

  const shiftSession = useCallback(() => {
    if (!state || !state.profile) return;
    const tomorrow = addDays(today, 1);
    const shifted: AppState = {
      ...state,
      dayOverrides: { ...state.dayOverrides, [today]: dayOfWeek(tomorrow), [tomorrow]: dayOfWeek(today) },
    };
    dispatch({ type: 'SHIFT_SESSION', today, tomorrow, questIds: prescribeForDate(shifted, today) });
  }, [state, today]);

  const unshiftSession = useCallback(() => {
    if (!state || !state.profile) return;
    const tomorrow = addDays(today, 1);
    const unshifted: AppState = {
      ...state,
      dayOverrides: Object.fromEntries(
        Object.entries(state.dayOverrides).filter(([date]) => date !== today && date !== tomorrow),
      ),
    };
    dispatch({ type: 'UNSHIFT_SESSION', today, tomorrow, questIds: prescribeForDate(unshifted, today) });
  }, [state, today]);

  const grantDebugXp = useCallback(() => {
    if (!state) return;
    pushOverlays(progressEvents(state, 100, state.results));
    dispatch({ type: 'DEBUG_XP', amount: 100 });
  }, [state, progressEvents, pushOverlays]);

  const devLevelUp = useCallback(() => {
    if (!state) return;
    const amount = xpRequiredForLevel(levelForXp(state.xp) + 1) - state.xp;
    pushOverlays(progressEvents(state, amount, state.results));
    dispatch({ type: 'DEBUG_XP', amount });
  }, [state, progressEvents, pushOverlays]);

  const devSubRankUp = useCallback(() => {
    if (!state) return;
    const prog = subProgress(state.gatesPassed, state.xp - state.letterXpStart);
    if (prog.into === null || prog.needed === null) return; // tier mastered — use RANK UP
    const amount = prog.needed - prog.into;
    pushOverlays(progressEvents(state, amount, state.results));
    dispatch({ type: 'DEBUG_XP', amount });
  }, [state, progressEvents, pushOverlays]);

  const devRankUp = useCallback(() => {
    if (!state || state.gatesPassed >= 5) return;
    const gate = nextGate(state.gatesPassed);
    dispatch({ type: 'DEV_RANK_UP' });
    pushOverlays([
      { kind: 'rankup', letter: LETTERS[Math.min(LETTERS.length - 1, state.gatesPassed + 1)], gateName: gate?.name ?? 'GATE' },
    ]);
  }, [state, pushOverlays]);

  const debugAdvanceDay = useCallback(() => {
    setDayOffset((n) => {
      saveDebugOffset(n + 1);
      return n + 1;
    });
  }, []);

  const debugFillToday = useCallback(
    (status: ResultStatus) => {
      for (const id of todayIds) logResult(id, status);
    },
    [todayIds, logResult],
  );

  const api: GameApi = {
    state,
    today,
    streak,
    debug,
    todayIds,
    morningOpen,
    routineTicksToday,
    assess: (name, answers) => {
      const placement = placeHunter(answers);
      const now = new Date().toISOString();
      const profile: Profile = {
        sex: answers.sex,
        wakeWindowStart: answers.wakeTime,
        track: placement.track,
        assessedAt: now,
      };
      if (state) {
        // Migrated or re-measuring hunter: keep XP/history, the System just re-measures.
        dispatch({
          type: 'PLACE',
          profile,
          gatesPassed: placement.letterIndex,
          xp: placement.seedXp,
          seeds: placement.seeds,
          statSeeds: placement.statSeeds,
          date: today,
        });
      } else {
        dispatch({
          type: 'INIT',
          state: {
            version: 2,
            hunter: { name, awakenedAt: now },
            xp: placement.seedXp,
            gatesPassed: placement.letterIndex,
            letterXpStart: placement.seedXp,
            statSeeds: placement.statSeeds,
            profile,
            quests: [],
            results: [],
            prescriptions: [],
            gateProgress: { ...emptyGateProgress(), ...placement.seeds },
            trackLevels: [0, 0, 0],
            gateAttempt: null,
            gateHistory: [],
            dayOverrides: {},
            routineTicks: {},
            lastResetDate: today,
          },
        });
      }
    },
    logResult,
    undoResult: (questId) => dispatch({ type: 'UNDO_RESULT', questId, date: today }),
    tickRoutine,
    addQuest: (quest) => dispatch({ type: 'ADD_QUEST', quest }),
    updateQuest: (quest) => dispatch({ type: 'UPDATE_QUEST', quest }),
    setQuestActive: (id, active) => dispatch({ type: 'SET_QUEST_ACTIVE', id, active }),
    enterGate: () => dispatch({ type: 'GATE_ENTER', date: today }),
    submitGateReport,
    shiftSession,
    unshiftSession,
    setWakeWindow: (time) => dispatch({ type: 'SET_WAKE', time }),
    requestReassess: () => dispatch({ type: 'REASSESS' }),
    resetAll: () => {
      clearState();
      setQueue([]);
      dispatch({ type: 'RESET' });
    },
    importState: (s) => {
      setQueue([]);
      dispatch({ type: 'IMPORT', state: s });
    },
    grantDebugXp,
    devLevelUp,
    devSubRankUp,
    devRankUp,
    debugAdvanceDay,
    debugFillToday,
    overlay: queue[0] ?? null,
    dismissOverlay: () => setQueue((prev) => prev.slice(1)),
  };

  return <GameContext.Provider value={api}>{children}</GameContext.Provider>;
}

export function useGame(): GameApi {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
