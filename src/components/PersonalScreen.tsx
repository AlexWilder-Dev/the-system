import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import type { Quest } from '../types';
import { useGame } from '../state/GameContext';
import { resultOn } from '../logic/completions';
import { xpForResult } from '../logic/credit';
import { formatDisplayDate } from '../logic/dates';
import { snap, useAnim, useMaterialize } from '../motion/springs';
import { XPBar } from './XPBar';
import { SysPanel } from './SysPanel';
import { usePress, type PressPoint } from './press';
import { useXpFlyers } from './Flyers';

/** v1's user-defined quests, unchanged: max 5, minimum + trigger, one-tap MET. */
export function PersonalScreen({ onRegister }: { onRegister: () => void }) {
  const { state, today, streak, logResult, undoResult } = useGame();
  const s = state!;
  const active = s.quests.filter((q) => q.active);
  const doneCount = active.filter((q) => resultOn(s.results, q.id, today)).length;
  const anyToday = s.results.some((r) => r.date === today);
  const streakOnComplete = anyToday ? streak.days : streak.days + 1;

  const cornerRef = useRef<HTMLDivElement>(null);
  const { fire, nodes } = useXpFlyers(cornerRef);

  return (
    <div className="screen">
      <div className="quests-head">
        <div>
          <h1 className="screen-title">PERSONAL QUESTS</h1>
          <p className="quests-date num">{formatDisplayDate(today)}</p>
        </div>
        <div className="quests-corner" ref={cornerRef}>
          <span className="quests-count num">
            {doneCount} / {active.length} COMPLETE
          </span>
          <XPBar xp={s.xp} compact />
        </div>
      </div>

      {active.length === 0 ? (
        <SysPanel className="empty-quests">
          <p className="sys-voice">NO PERSONAL QUESTS REGISTERED.</p>
          <p className="sys-voice" style={{ color: 'var(--text-dim)' }}>
            READING. CHESS. LANGUAGE. THE SYSTEM TRAINS THE BODY — WHAT YOU TRAIN HERE IS YOURS.
          </p>
          <button className="sys-btn sys-btn--primary" onClick={onRegister}>
            REGISTER QUEST
          </button>
        </SysPanel>
      ) : (
        <>
          <div className="quest-list">
            {active.map((quest, i) => (
              <PersonalPanel
                key={quest.id}
                quest={quest}
                delay={i * 0.05}
                earnedXp={resultOn(s.results, quest.id, today)?.xpEarned}
                pendingXp={xpForResult('MET', quest.difficulty, streakOnComplete)}
                onComplete={(pt) => fire(pt, logResult(quest.id, 'MET'))}
                onUndo={() => undoResult(quest.id)}
              />
            ))}
          </div>
          <p className="quest-hint">TAP TO COMPLETE · HOLD TO UNDO</p>
        </>
      )}
      {nodes}
    </div>
  );
}

function PersonalPanel({
  quest,
  delay,
  earnedXp,
  pendingXp,
  onComplete,
  onUndo,
}: {
  quest: Quest;
  delay: number;
  earnedXp?: number;
  pendingXp: number;
  onComplete: (pt: PressPoint) => void;
  onUndo: () => void;
}) {
  const m = useMaterialize(delay);
  const tSnap = useAnim(snap);
  const completed = earnedXp !== undefined;
  const [flash, setFlash] = useState(0);

  const press = usePress({
    onTap: (pt) => {
      if (!completed) {
        setFlash((n) => n + 1);
        onComplete(pt);
      }
    },
    onLongPress: () => {
      if (completed) onUndo();
    },
  });

  return (
    <motion.div
      className={`sys-panel quest-panel${completed ? ' quest-panel--done' : ''}`}
      {...m}
      whileTap={{ scale: 0.98 }}
      {...press}
      role="button"
      aria-pressed={completed}
      aria-label={`${quest.title}${completed ? ' — cleared' : ''}`}
    >
      <div className="quest-main">
        <div className="quest-title">{quest.title}</div>
        <div className="quest-trigger">{quest.trigger}</div>
        <div className="quest-min">MINIMUM: {quest.minimum}</div>
      </div>
      <div className="quest-side">
        <span className="stat-chip">{quest.stat}</span>
        <span className="xp-chip num">+{completed ? earnedXp : pendingXp} XP</span>
        {completed && <span className="quest-check">✓ CLEARED</span>}
      </div>
      <AnimatePresence>
        {flash > 0 && (
          <motion.div
            key={flash}
            className="quest-flash"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={tSnap}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
