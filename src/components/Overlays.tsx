import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import type { StatKey } from '../types';
import { useGame, type Overlay } from '../state/GameContext';
import { STAT_KEYS } from '../logic/stats';
import type { Letter } from '../logic/rank';
import { dramatic, fade, settle, sweep, useAnim } from '../motion/springs';

/** Renders the front of the overlay queue: level-up, rank-up (gate pass), gate-fail, daily stamp. */
export function OverlayHost() {
  const { overlay, dismissOverlay } = useGame();
  return (
    <AnimatePresence mode="wait">
      {overlay && <OverlayView key={overlayKey(overlay)} overlay={overlay} onDismiss={dismissOverlay} />}
    </AnimatePresence>
  );
}

function overlayKey(o: Overlay): string {
  if (o.kind === 'levelup') return `levelup-${o.level}`;
  if (o.kind === 'rankup') return `rankup-${o.letter}`;
  return o.kind;
}

function OverlayView({ overlay, onDismiss }: { overlay: Overlay; onDismiss: () => void }) {
  switch (overlay.kind) {
    case 'levelup':
      return <LevelUp level={overlay.level} subLabel={overlay.subLabel} deltas={overlay.deltas} onDismiss={onDismiss} />;
    case 'rankup':
      return <RankUp letter={overlay.letter} gateName={overlay.gateName} onDismiss={onDismiss} />;
    case 'gatefail':
      return <GateFail onDismiss={onDismiss} />;
    case 'stamp':
      return <Stamp onDismiss={onDismiss} />;
  }
}

function LevelUp({
  level,
  subLabel,
  deltas,
  onDismiss,
}: {
  level: number;
  subLabel: string | null;
  deltas: Partial<Record<StatKey, number>>;
  onDismiss: () => void;
}) {
  const tFade = useAnim(fade);
  const tDramatic = useAnim(dramatic);
  const rows = STAT_KEYS.filter((k) => (deltas[k] ?? 0) > 0);

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tFade}
      onClick={onDismiss}
    >
      <motion.div
        className="sys-panel overlay-panel"
        initial={{ scale: 1.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={tDramatic}
      >
        <div className="overlay-eyebrow">SYSTEM</div>
        <h2 className="overlay-title">LEVEL UP</h2>
        <div className="overlay-level num">LV {level}</div>
        {subLabel && <p className="overlay-copy">SUB-RANK {subLabel} ATTAINED.</p>}
        {rows.length > 0 && (
          <div className="delta-list">
            {rows.map((k) => (
              <div className="delta-row" key={k}>
                <span className="stat-name">{k}</span>
                <span className="delta-val">+{deltas[k]}</span>
              </div>
            ))}
          </div>
        )}
        <button className="sys-btn sys-btn--primary" onClick={onDismiss}>
          CONTINUE
        </button>
      </motion.div>
    </motion.div>
  );
}

/** The Gate pass ceremony — the only place gold is spent. */
function RankUp({ letter, gateName, onDismiss }: { letter: Letter; gateName: string; onDismiss: () => void }) {
  const tFade = useAnim(fade);
  const tSettle = useAnim(settle);
  const tDramatic = useAnim(dramatic);
  const tSweep = useAnim(sweep);

  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tFade}
      onClick={onDismiss}
    >
      <motion.div className="glow-sweep" initial={{ x: '-60vw' }} animate={{ x: '110vw' }} transition={tSweep} />
      <div style={{ textAlign: 'center' }}>
        <motion.div className="overlay-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tSettle}>
          {gateName} — CLEARED
        </motion.div>
        <motion.div
          className="rankup-letter num"
          initial={{ scale: 3.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={tDramatic}
        >
          {letter}
        </motion.div>
        <motion.p
          className="overlay-copy rankup-copy"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={tSettle}
        >
          YOU HAVE BEEN PROMOTED TO RANK {letter}.
        </motion.p>
        <motion.p className="tap-hint num" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tSettle}>
          TAP TO CONTINUE
        </motion.p>
      </div>
    </motion.div>
  );
}

/** Neutral. The gate stays available; the standard does not move. */
function GateFail({ onDismiss }: { onDismiss: () => void }) {
  const tFade = useAnim(fade);
  const tSettle = useAnim(settle);
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tFade}
      onClick={onDismiss}
    >
      <motion.div
        className="sys-panel overlay-panel"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={tSettle}
      >
        <div className="overlay-eyebrow">SYSTEM</div>
        <p className="overlay-copy">GATE REMAINS. RETURN WHEN READY.</p>
        <p className="log-note">RESULTS RECORDED. THE ATTEMPT EARNED XP. RETRY ANY DAY.</p>
        <button className="sys-btn" style={{ marginTop: 14 }} onClick={onDismiss}>
          CONTINUE
        </button>
      </motion.div>
    </motion.div>
  );
}

const STAMP_DISMISS_MS = 2400;

function Stamp({ onDismiss }: { onDismiss: () => void }) {
  const tFade = useAnim(fade);
  const tDramatic = useAnim(dramatic);

  useEffect(() => {
    const timer = window.setTimeout(onDismiss, STAMP_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div
      className="overlay stamp-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={tFade}
      onClick={onDismiss}
    >
      <motion.div
        className="stamp"
        initial={{ scale: 2.2, opacity: 0, rotate: 0 }}
        animate={{ scale: 1, opacity: 1, rotate: -5 }}
        transition={tDramatic}
      >
        DAILY QUEST
        <br />
        COMPLETE
      </motion.div>
    </motion.div>
  );
}
