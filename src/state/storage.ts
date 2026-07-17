import type { AppState, AppStateV1, Difficulty, StatKey, TrackId } from '../types';
import { migrateV1 } from '../logic/migrate';
import { letterStartLevel } from '../logic/rank';
import { xpRequiredForLevel } from '../logic/xp';

// Single localStorage key, unchanged from v1; the version field routes migration.
const KEY = 'the-system-v1';

const STATS: StatKey[] = ['STR', 'VIT', 'INT', 'FOC', 'WIL'];
const DIFFICULTIES: Difficulty[] = [1, 2, 3];
const TRACKS: TrackId[] = ['foundation', 'builder5k', 'bridge10k', 'performance'];

function validQuests(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  for (const q of v as Array<Record<string, unknown>>) {
    if (typeof q !== 'object' || q === null) return false;
    if (typeof q.id !== 'string' || typeof q.title !== 'string') return false;
    if (typeof q.minimum !== 'string' || typeof q.trigger !== 'string') return false;
    if (!STATS.includes(q.stat as StatKey)) return false;
    if (!DIFFICULTIES.includes(q.difficulty as Difficulty)) return false;
    if (typeof q.active !== 'boolean') return false;
  }
  return true;
}

function validHunter(v: unknown): boolean {
  const h = v as Record<string, unknown> | undefined;
  return !!h && typeof h.name === 'string' && typeof h.awakenedAt === 'string';
}

export function validateStateV1(v: unknown): v is AppStateV1 {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.version !== 1) return false;
  if (!validHunter(s.hunter)) return false;
  if (typeof s.xp !== 'number' || !Number.isFinite(s.xp)) return false;
  if (typeof s.lastResetDate !== 'string') return false;
  if (!validQuests(s.quests) || !Array.isArray(s.log)) return false;
  for (const c of s.log as Array<Record<string, unknown>>) {
    if (typeof c !== 'object' || c === null) return false;
    if (typeof c.questId !== 'string' || typeof c.date !== 'string') return false;
    if (typeof c.xpEarned !== 'number' || !Number.isFinite(c.xpEarned)) return false;
  }
  return true;
}

export function validateStateV2(v: unknown): v is AppState {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.version !== 2) return false;
  if (!validHunter(s.hunter)) return false;
  if (typeof s.xp !== 'number' || !Number.isFinite(s.xp)) return false;
  if (typeof s.gatesPassed !== 'number' || s.gatesPassed < 0 || s.gatesPassed > 5) return false;
  if (typeof s.lastResetDate !== 'string') return false;
  if (!validQuests(s.quests)) return false;
  if (s.profile !== null) {
    const p = s.profile as Record<string, unknown> | undefined;
    if (!p || (p.sex !== 'M' && p.sex !== 'F')) return false;
    if (typeof p.wakeWindowStart !== 'string' || typeof p.assessedAt !== 'string') return false;
    if (!TRACKS.includes(p.track as TrackId)) return false;
  }
  if (!Array.isArray(s.results) || !Array.isArray(s.prescriptions)) return false;
  for (const r of s.results as Array<Record<string, unknown>>) {
    if (typeof r !== 'object' || r === null) return false;
    if (typeof r.questId !== 'string' || typeof r.date !== 'string') return false;
    if (r.status !== 'MET' && r.status !== 'ATTEMPTED' && r.status !== 'EXCEEDED') return false;
    if (typeof r.xpEarned !== 'number' || !Number.isFinite(r.xpEarned)) return false;
  }
  for (const p of s.prescriptions as Array<Record<string, unknown>>) {
    if (typeof p !== 'object' || p === null) return false;
    if (typeof p.date !== 'string' || !Array.isArray(p.questIds)) return false;
  }
  if (typeof s.gateProgress !== 'object' || s.gateProgress === null) return false;
  if (!Array.isArray(s.trackLevels)) return false;
  if (typeof s.dayOverrides !== 'object' || s.dayOverrides === null) return false;
  return true;
}

/** Fields added after v2 shipped — defaulted so older v2 blobs stay loadable. */
function withDefaults(state: AppState): AppState {
  return {
    ...state,
    gateHistory: state.gateHistory ?? [],
    routineTicks: state.routineTicks ?? {},
    // Pre-tier saves: treat the letter's old band start as the tier entry
    // mark, so XP earned since placement carries into sub-rank progress.
    letterXpStart:
      typeof state.letterXpStart === 'number'
        ? state.letterXpStart
        : Math.min(state.xp, xpRequiredForLevel(letterStartLevel(state.gatesPassed))),
    // Pre-seed saves: grant the letter's identity baseline across the board.
    statSeeds: state.statSeeds ?? {
      STR: state.gatesPassed * 2,
      VIT: state.gatesPassed * 2,
      INT: state.gatesPassed * 2,
      FOC: state.gatesPassed * 2,
      WIL: state.gatesPassed * 2,
    },
  };
}

/** Accepts a v2 blob or a v1 blob (migrated on the spot). Used by load and import. */
export function coerceState(parsed: unknown): AppState | null {
  if (validateStateV2(parsed)) return withDefaults(parsed);
  if (validateStateV1(parsed)) return migrateV1(parsed);
  return null;
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return coerceState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — nothing actionable mid-session.
  }
}

/** START AGAIN: wipe the record so a reload lands on a fresh assessment. */
export function clearState(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Same non-actionable failure mode as saveState.
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Debug-only day offset lives OUTSIDE app state so exports stay clean.
const DEBUG_KEY = 'the-system-debug-day-offset';

export function loadDebugOffset(): number {
  const n = Number(localStorage.getItem(DEBUG_KEY) ?? '0');
  return Number.isFinite(n) ? n : 0;
}

export function saveDebugOffset(n: number): void {
  localStorage.setItem(DEBUG_KEY, String(n));
}
