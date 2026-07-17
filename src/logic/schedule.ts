import type { AppState, ResultStatus, TrackId } from '../types';
import { TRACKS, TRACK_ORDER, INTERVAL_SWAP_DESC, type CardioRx } from '../data/protocols';
import { MORNING_PROTOCOLS } from '../data/protocols';
import { performanceCredit } from './credit';
import { localDateOfISO } from './dates';
import { cardioQuestId } from './quests';

// Weekly template: cardio Mon/Wed/Sat (slots 0/1/2), strength Tue/Fri,
// mandatory REST Thu/Sun. Movement floor (steps) every day.
// getDay(): 0=Sun … 6=Sat.
export const CARDIO_DOW = [1, 3, 6];
export const STRENGTH_DOW = [2, 5];

export function dayOfWeek(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}

/** Whole weeks elapsed since assessment (day 0 = week 0). */
export function weekNumberFor(assessedDate: string, date: string): number {
  const toMs = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getTime();
  };
  const days = Math.floor((toMs(date) - toMs(assessedDate)) / 86_400_000);
  return Math.max(0, Math.floor(days / 7));
}

/** Every 4th week is a System-mandated deload: −40% volume, progression frozen. */
export function isDeloadWeek(weekNumber: number): boolean {
  return weekNumber % 4 === 3;
}

export const DELOAD_FACTOR = 0.6;

function deloadMinutes(minutes: number): number {
  return Math.max(10, Math.round((minutes * DELOAD_FACTOR) / 5) * 5);
}

/** Clamp a slot level into the track's week range (level == length means track finished). */
function clampLevel(trackId: TrackId, level: number): number {
  return Math.min(level, TRACKS[trackId].weeks.length - 1);
}

/** The base prescription for a slot at its own level — no swap, no deload. */
function baseRx(trackId: TrackId, slotLevels: number[], slot: number): CardioRx {
  return TRACKS[trackId].weeks[clampLevel(trackId, slotLevels[slot] ?? 0)][slot];
}

/**
 * The prescription for one cardio slot at its current level. From D rank
 * (letterIndex ≥ 1) slot 1 becomes a quality session — but only where the
 * week doesn't already contain one (intervals or a test) in another slot;
 * a week must never carry two hard sessions. Deload weeks scale minutes
 * down and freeze progression.
 */
export function cardioRxFor(
  trackId: TrackId,
  slotLevels: number[],
  slot: number,
  letterIndex: number,
  deload: boolean,
): CardioRx {
  let rx = baseRx(trackId, slotLevels, slot);
  if (letterIndex >= 1 && slot === 1 && (rx.kind === 'z2' || rx.kind === 'wr')) {
    const hasQuality = [0, 2].some((s) => {
      const kind = baseRx(trackId, slotLevels, s).kind;
      return kind === 'iv' || kind === 'test';
    });
    if (!hasQuality) rx = { kind: 'iv', minutes: rx.minutes, desc: INTERVAL_SWAP_DESC };
  }
  if (deload) {
    rx = { ...rx, minutes: deloadMinutes(rx.minutes), desc: `RECOVERY PROTOCOL — ${rx.desc}` };
  }
  return rx;
}

/** Total prescribed running minutes for a week at the given progression state. */
export function weeklyVolume(trackId: TrackId, slotLevels: number[], letterIndex: number, deload: boolean): number {
  return [0, 1, 2].reduce((sum, slot) => sum + cardioRxFor(trackId, slotLevels, slot, letterIndex, deload).minutes, 0);
}

/**
 * Progression guardrail: sessions advance on MET or better — never by the
 * calendar. ATTEMPTED repeats the same level next time. Deload weeks freeze
 * progression. When every slot has cleared the track's final week, the next
 * track begins.
 */
export function advanceOnResult(
  trackId: TrackId,
  slotLevels: number[],
  slot: number,
  status: ResultStatus,
  deload: boolean,
): { trackId: TrackId; slotLevels: number[] } {
  if (!performanceCredit(status) || deload) return { trackId, slotLevels };
  const len = TRACKS[trackId].weeks.length;
  const next = slotLevels.map((lv, i) => (i === slot ? Math.min(lv + 1, len) : lv));
  if (next.every((lv) => lv >= len)) {
    const order = TRACK_ORDER.indexOf(trackId);
    if (order < TRACK_ORDER.length - 1) {
      return { trackId: TRACK_ORDER[order + 1], slotLevels: [0, 0, 0] };
    }
    return { trackId, slotLevels: next.map(() => len - 1) }; // performance track repeats
  }
  return { trackId, slotLevels: next };
}

/** Morning protocol ids unlocked at a letter. */
export function morningIdsFor(letterIndex: number): string[] {
  return MORNING_PROTOCOLS.filter((p) => p.unlock <= letterIndex).map((p) => p.id);
}

/** Fitness quest ids for a calendar day (cardio/strength/rest + daily steps). */
export function fitnessIdsFor(
  trackId: TrackId,
  slotLevels: number[],
  letterIndex: number,
  date: string,
  assessedDate: string,
  dayOverrides: Record<string, number>,
): string[] {
  const dow = dayOverrides[date] ?? dayOfWeek(date);
  const deload = isDeloadWeek(weekNumberFor(assessedDate, date));
  const ids: string[] = [];
  const cardioSlot = CARDIO_DOW.indexOf(dow);
  if (cardioSlot >= 0) {
    const rx = cardioRxFor(trackId, slotLevels, cardioSlot, letterIndex, deload);
    ids.push(cardioQuestId(rx.kind, rx.minutes, cardioSlot));
  } else if (STRENGTH_DOW.includes(dow)) {
    ids.push(`str:${Math.min(letterIndex, 5)}`);
  } else {
    ids.push('rest');
  }
  ids.push('steps');
  return ids;
}

/** Everything the System assigns for a day — the consistency denominator. */
export function prescribeForDate(state: AppState, date: string): string[] {
  if (!state.profile) return [];
  const letterIndex = state.gatesPassed;
  return [
    ...morningIdsFor(letterIndex),
    ...fitnessIdsFor(
      state.profile.track,
      state.trackLevels,
      letterIndex,
      date,
      localDateOfISO(state.profile.assessedAt),
      state.dayOverrides,
    ),
  ];
}
