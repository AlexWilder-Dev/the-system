import { useGame } from '../state/GameContext';

/** ?debug only — fast-forward days and inject results, for manual testing. */
export function DebugPanel() {
  const { debug, today, debugAdvanceDay, debugFillToday, grantDebugXp } = useGame();
  if (!debug) return null;
  return (
    <div className="debug-panel">
      <span className="window-chip num">{today}</span>
      <button className="sys-btn" onClick={debugAdvanceDay}>
        +1 DAY
      </button>
      <button className="sys-btn" onClick={() => debugFillToday('MET')}>
        MET ALL
      </button>
      <button className="sys-btn" onClick={() => debugFillToday('ATTEMPTED')}>
        ATT ALL
      </button>
      <button className="sys-btn" onClick={grantDebugXp}>
        +100 XP
      </button>
    </div>
  );
}
