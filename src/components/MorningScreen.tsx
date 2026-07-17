import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState } from 'react';
import { useGame, MORNING_CLOSE_HOUR } from '../state/GameContext';
import {
  MORNING_PROTOCOLS,
  MORNING_ROUTINE_ORDER,
  ROUTINE_BONUS_ID,
  ROUTINE_BONUS_XP,
  ROUTINE_STEPS,
  type MorningProtocol,
  type RoutineStep,
} from '../data/protocols';
import { isLoggedOn, resultOn } from '../logic/completions';
import { xpForResult } from '../logic/credit';
import { formatDisplayDate } from '../logic/dates';
import { settle, snap, useAnim, withDelay } from '../motion/springs';
import { XPBar } from './XPBar';
import { usePress, type PressPoint } from './press';
import { useXpFlyers } from './Flyers';
import { InfoButton, QuestDetail } from './LearnMore';

function windowEnd(start: string): string {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + 30;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** The routine in walk-through order: unlocked protocols + structure steps. */
type RoutineItem = { kind: 'protocol'; protocol: MorningProtocol } | { kind: 'step'; step: RoutineStep };

export function MorningScreen() {
  const { state, today, streak, todayIds, morningOpen, logResult, undoResult, tickRoutine, routineTicksToday } =
    useGame();
  const s = state!;

  const items = MORNING_ROUTINE_ORDER.flatMap((id): RoutineItem[] => {
    if (id.startsWith('mp:')) {
      const protocol = MORNING_PROTOCOLS.find((p) => p.id === id);
      return protocol && todayIds.includes(id) ? [{ kind: 'protocol', protocol }] : [];
    }
    const step = ROUTINE_STEPS.find((r) => r.id === id);
    return step ? [{ kind: 'step', step }] : [];
  });

  const protocols = items.filter((i) => i.kind === 'protocol');
  const doneCount =
    protocols.filter((i) => i.kind === 'protocol' && resultOn(s.results, i.protocol.id, today)).length;
  const anyToday = s.results.some((r) => r.date === today);
  const streakOnComplete = anyToday ? streak.days : streak.days + 1;
  const bonusEarned = isLoggedOn(s.results, ROUTINE_BONUS_ID, today);

  const cornerRef = useRef<HTMLDivElement>(null);
  const { fire, nodes } = useXpFlyers(cornerRef);

  return (
    <div className="screen">
      <div className="quests-head">
        <div>
          <h1 className="screen-title">MORNING PROTOCOL</h1>
          <p className="quests-date num">{formatDisplayDate(today)}</p>
          <span className="window-chip" style={{ display: 'inline-block', marginTop: 8 }}>
            {morningOpen
              ? `FULL CREDIT UNTIL ${MORNING_CLOSE_HOUR}:00`
              : 'WINDOW CLOSED — LATE ENTRIES EARN 70%'}
          </span>
        </div>
        <div className="quests-corner" ref={cornerRef}>
          <span className="quests-count num">
            {doneCount} / {protocols.length} COMPLETE
          </span>
          <XPBar xp={s.xp} compact />
        </div>
      </div>

      <div className="quest-list">
        {items.map((item, i) =>
          item.kind === 'protocol' ? (
            <ProtocolPanel
              key={item.protocol.id}
              protocol={item.protocol}
              delay={i * 0.04}
              wakeWindow={
                item.protocol.id === 'mp:wake' && s.profile
                  ? `${s.profile.wakeWindowStart}–${windowEnd(s.profile.wakeWindowStart)}`
                  : null
              }
              earnedXp={resultOn(s.results, item.protocol.id, today)?.xpEarned}
              late={!morningOpen}
              pendingXp={xpForResult(morningOpen ? 'MET' : 'ATTEMPTED', item.protocol.difficulty, streakOnComplete)}
              onComplete={(pt) => fire(pt, logResult(item.protocol.id, 'MET'))}
              onUndo={() => undoResult(item.protocol.id)}
            />
          ) : (
            <RoutineStepRow
              key={item.step.id}
              step={item.step}
              delay={i * 0.04}
              ticked={routineTicksToday.includes(item.step.id)}
              onToggle={(on) => tickRoutine(item.step.id, on)}
            />
          ),
        )}
      </div>

      <p className={`routine-bonus num${bonusEarned ? ' routine-bonus--earned' : ''}`}>
        {bonusEarned
          ? `FULL PROTOCOL COMPLETE — BONUS +${ROUTINE_BONUS_XP} XP`
          : `FULL ROUTINE (EVERY LINE) — BONUS +${ROUTINE_BONUS_XP} XP`}
      </p>
      <p className="quest-hint">TAP TO COMPLETE · HOLD TO UNDO</p>
      {nodes}
    </div>
  );
}

function ProtocolPanel({
  protocol,
  delay,
  wakeWindow,
  earnedXp,
  late,
  pendingXp,
  onComplete,
  onUndo,
}: {
  protocol: MorningProtocol;
  delay: number;
  wakeWindow: string | null;
  earnedXp?: number;
  late: boolean;
  pendingXp: number;
  onComplete: (pt: PressPoint) => void;
  onUndo: () => void;
}) {
  const tSettle = useAnim(settle);
  const tSnap = useAnim(snap);
  const completed = earnedXp !== undefined;
  const [flash, setFlash] = useState(0);
  const [detail, setDetail] = useState(false);

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
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={withDelay(tSettle, delay)}
      whileTap={{ scale: 0.98 }}
      {...press}
      role="button"
      aria-pressed={completed}
      aria-label={`${protocol.title}${completed ? ' — cleared' : late ? ' — late entry' : ''}`}
    >
      <div className="quest-main">
        <div className="quest-title">{protocol.title}</div>
        <div className="quest-min">{wakeWindow ? `${protocol.short} (${wakeWindow})` : protocol.short}</div>
        {detail && <QuestDetail rx={protocol.rx} why={protocol.why} tier={protocol.tier} />}
      </div>
      <div className="quest-side">
        <InfoButton open={detail} onToggle={() => setDetail((v) => !v)} />
        <span className="xp-chip num">+{completed ? earnedXp : pendingXp} XP</span>
        {completed && <span className="quest-check">✓ CLEARED</span>}
        {!completed && late && <span className="quest-late">LATE — 70%</span>}
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

/** A structure step: order without obligation — tick it, no XP, no consistency weight. */
function RoutineStepRow({
  step,
  delay,
  ticked,
  onToggle,
}: {
  step: RoutineStep;
  delay: number;
  ticked: boolean;
  onToggle: (on: boolean) => void;
}) {
  const tSettle = useAnim(settle);
  const press = usePress({ onTap: () => onToggle(!ticked) });

  return (
    <motion.div
      className={`sys-panel routine-row${ticked ? ' routine-row--done' : ''}`}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={withDelay(tSettle, delay)}
      whileTap={{ scale: 0.98 }}
      {...press}
      role="button"
      aria-pressed={ticked}
      aria-label={`${step.title}${ticked ? ' — done' : ''}`}
    >
      <span className="routine-mark num">{ticked ? '✓' : '·'}</span>
      <div className="routine-main">
        <span className="routine-title">{step.title}</span>
        <span className="routine-sub">{step.short}</span>
      </div>
      <span className="routine-chip">STRUCTURE</span>
    </motion.div>
  );
}
