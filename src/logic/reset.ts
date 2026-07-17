import type { AppState } from '../types';

export function needsDailyReset(lastResetDate: string, today: string): boolean {
  return today > lastResetDate;
}

/**
 * Roll the day forward. Completions are logged per date, so quests "uncheck"
 * for the new day automatically the moment the marker moves — history stays
 * intact in the log.
 */
export function applyDailyReset(state: AppState, today: string): AppState {
  if (!needsDailyReset(state.lastResetDate, today)) return state;
  return { ...state, lastResetDate: today };
}
