import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import type { ResultStatus } from '../types';
import { useGame } from '../state/GameContext';
import { questMeta, parseCardioId, type QuestMeta } from '../logic/quests';
import {
  cardioRxFor,
  fitnessIdsFor,
  isDeloadWeek,
  weekNumberFor,
} from '../logic/schedule';
import { resultOn } from '../logic/completions';
import { xpForResult } from '../logic/credit';
import { addDays, formatDisplayDate, localDateOfISO } from '../logic/dates';
import { STRENGTH_NOTE, TRACKS } from '../data/protocols';
import { nextGate } from '../logic/gatecheck';
import { fade, settle, snap, useAnim, withDelay } from '../motion/springs';
import { XPBar } from './XPBar';
import { usePress } from './press';
import { useXpFlyers } from './Flyers';
import { InfoButton, QuestDetail } from './LearnMore';
import { GateDebrief } from './GateModals';
import { SysPanel } from './SysPanel';

const MODALITIES = ['RUN', 'BIKE', 'ROW', 'SWIM'];
const DOW_LABEL = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

export function FitnessScreen() {
  const { state, today, streak, todayIds, logResult, undoResult, shiftSession, unshiftSession } = useGame();
  const s = state!;
  const profile = s.profile!;
  const assessedDate = localDateOfISO(profile.assessedAt);
  const weekNum = weekNumberFor(assessedDate, today);
  const deload = isDeloadWeek(weekNum);
  const nextWeekDeload = isDeloadWeek(weekNum + 1);

  const track = TRACKS[profile.track];
  const trackWeek = Math.min(Math.min(...s.trackLevels) + 1, track.weeks.length);

  const sessionId = todayIds.find((id) => id.startsWith('run:') || id.startsWith('str:') || id === 'rest');
  const sessionMeta = sessionId ? questMeta(sessionId, s.quests) : null;
  const sessionResult = sessionId ? resultOn(s.results, sessionId, today) : undefined;
  const stepsResult = resultOn(s.results, 'steps', today);
  const stepsMeta = questMeta('steps', s.quests)!;

  const anyToday = s.results.some((r) => r.date === today);
  const streakOnComplete = anyToday ? streak.days : streak.days + 1;
  const doneCount = todayIds.filter((id) => resultOn(s.results, id, today)).length;

  const gate = nextGate(s.gatesPassed);

  // Full session description comes from the track table at the current level.
  const sessionDesc = useMemo(() => {
    if (!sessionId) return '';
    const cardio = parseCardioId(sessionId);
    if (cardio) return cardioRxFor(profile.track, s.trackLevels, cardio.slot, s.gatesPassed, deload).desc;
    return sessionMeta?.rx ?? '';
  }, [sessionId, sessionMeta, profile.track, s.trackLevels, s.gatesPassed, deload]);

  const cornerRef = useRef<HTMLDivElement>(null);
  const { fire, nodes } = useXpFlyers(cornerRef);
  const [logging, setLogging] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [sessionDetail, setSessionDetail] = useState(false);
  const [debriefing, setDebriefing] = useState(false);
  const tSettle = useAnim(settle);
  const tFade = useAnim(fade);

  const tomorrow = addDays(today, 1);
  const shiftedToday =
    s.dayOverrides[today] !== undefined && s.dayOverrides[tomorrow] !== undefined;

  const isRest = sessionId === 'rest';
  const restPress = usePress({
    onTap: (pt) => {
      if (isRest && !sessionResult) fire(pt, logResult('rest', 'MET'));
    },
    onLongPress: () => {
      if (isRest && sessionResult) undoResult('rest');
    },
  });
  const stepsPress = usePress({
    onTap: (pt) => {
      if (!stepsResult) fire(pt, logResult('steps', 'MET'));
    },
    onLongPress: () => {
      if (stepsResult) undoResult('steps');
    },
  });
  const sessionUndoPress = usePress({
    onLongPress: () => {
      if (sessionResult && sessionId) undoResult(sessionId);
    },
  });

  // Week strip: Monday-start week around today; templates fill days without a prescription.
  const week = useMemo(() => {
    const [y, m, d] = today.split('-').map(Number);
    const jsDow = new Date(y, m - 1, d, 12).getDay();
    const monday = addDays(today, -((jsDow + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const rx = s.prescriptions.find((p) => p.date === date);
      const ids =
        rx?.questIds.filter((id) => id.startsWith('run:') || id.startsWith('str:') || id === 'rest') ??
        fitnessIdsFor(profile.track, s.trackLevels, s.gatesPassed, date, assessedDate, s.dayOverrides).filter(
          (id) => id !== 'steps',
        );
      const id = ids[0] ?? 'rest';
      const cardio = parseCardioId(id);
      const type = cardio
        ? { wr: 'R', z2: 'R', iv: 'Q', long: 'L', test: 'T' }[cardio.kind]
        : id.startsWith('str:')
          ? 'S'
          : '·';
      const label = cardio
        ? cardioRxFor(profile.track, s.trackLevels, cardio.slot, s.gatesPassed, deload).desc
        : (questMeta(id, s.quests)?.title ?? '');
      return { date, type, label, done: !!resultOn(s.results, id, date), today: date === today };
    });
  }, [today, s, profile.track, assessedDate, deload]);

  return (
    <div className="screen">
      <div className="quests-head">
        <div>
          <h1 className="screen-title">FITNESS</h1>
          <p className="quests-date num">{formatDisplayDate(today)}</p>
          <p className="track-context num">
            {track.name} — WEEK {trackWeek} / {track.weeks.length}
            {deload ? ' · RECOVERY WEEK' : nextWeekDeload ? ' · RECOVERY NEXT WEEK' : ''}
          </p>
        </div>
        <div className="quests-corner" ref={cornerRef}>
          <span className="quests-count num">
            {doneCount} / {todayIds.length} COMPLETE
          </span>
          <XPBar xp={s.xp} compact />
        </div>
      </div>

      {deload && <div className="deload-banner">RECOVERY PROTOCOL — SYSTEM MANDATED. VOLUME REDUCED.</div>}

      {s.gateAttempt && gate && (
        <SysPanel className="featured-card" delay={0}>
          <div className="featured-kicker">
            <span className="dim-label">{gate.name} — TRIAL DECLARED</span>
          </div>
          <p className="featured-rx">TODAY IS THE TEST. COMPLETE IT, THEN REPORT.</p>
          <div className="log-choices" style={{ marginTop: 12 }}>
            <button className="sys-btn sys-btn--primary" onClick={() => setDebriefing(true)}>
              REPORT RESULT
            </button>
          </div>
        </SysPanel>
      )}

      {sessionMeta && sessionId && (
        <motion.div
          className={`sys-panel featured-card${sessionResult ? ' quest-panel--done' : ''}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={tSettle}
          {...(isRest ? restPress : sessionResult ? sessionUndoPress : {})}
          style={isRest || sessionResult ? { cursor: 'pointer' } : undefined}
        >
          <div className="featured-kicker">
            <span className="dim-label">TODAY — {sessionMeta.kind === 'rest' ? 'REST' : 'SESSION'}</span>
            <InfoButton open={sessionDetail} onToggle={() => setSessionDetail((v) => !v)} />
          </div>
          <div className="featured-title">{sessionMeta.title}</div>
          <p className="featured-rx">
            {sessionDesc}
            {sessionMeta.minutes ? ` — ${sessionMeta.minutes} MIN` : ''}
          </p>
          {sessionDetail && (
            <>
              {sessionMeta.kind === 'strength' && <p className="quest-why">{STRENGTH_NOTE}</p>}
              <QuestDetail why={sessionMeta.why} tier={sessionMeta.tier} />
            </>
          )}

          {sessionResult ? (
            <p className="log-note num" style={{ marginTop: 12 }}>
              ✓ {sessionResult.status} — +{sessionResult.xpEarned} XP · HOLD TO UNDO, RE-LOG TO CORRECT
            </p>
          ) : isRest ? (
            <p className="log-note" style={{ marginTop: 12 }}>
              TAP TO LOG REST — FULL XP
            </p>
          ) : (
            <div className="log-choices">
              <button className="sys-btn sys-btn--primary" onClick={() => setLogging(true)}>
                LOG RESULT
              </button>
              {shiftedToday ? (
                <button className="sys-btn sys-btn--quiet" onClick={unshiftSession}>
                  SHIFT BACK
                </button>
              ) : (
                <button className="sys-btn sys-btn--quiet" onClick={shiftSession}>
                  SHIFT TO TOMORROW
                </button>
              )}
            </div>
          )}
        </motion.div>
      )}

      <StepsPanel
        title={stepsMeta.title}
        rx={stepsMeta.short ?? stepsMeta.rx}
        fullRx={stepsMeta.rx}
        why={stepsMeta.why!}
        earnedXp={stepsResult?.xpEarned}
        pendingXp={xpForResult('MET', 1, streakOnComplete)}
        press={stepsPress}
      />

      <button className="sys-btn sys-btn--quiet" style={{ width: '100%' }} onClick={() => setWeekOpen((v) => !v)}>
        {weekOpen ? 'HIDE WEEK' : 'SHOW WEEK'}
      </button>
      <div className="week-strip" style={{ marginTop: 10 }}>
        {week.map((day) => (
          <div
            key={day.date}
            className={`week-cell${day.today ? ' week-cell--today' : ''}${day.done ? ' week-cell--done' : ''}`}
          >
            {DOW_LABEL[new Date(day.date + 'T12:00:00').getDay()]}
            <span className="wc-type">{day.done ? '✓' : day.type}</span>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {weekOpen && (
          <motion.div
            className="week-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={tFade}
            style={{ overflow: 'hidden' }}
          >
            {week.map((day) => (
              <div className="req-row" key={day.date}>
                <span className="req-mark num">{day.done ? '✓' : '·'}</span>
                <span className="req-label" style={{ flex: 1 }}>
                  {day.label}
                </span>
                <span className="req-current num">{formatDisplayDate(day.date).slice(0, 6)}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {logging && sessionMeta && sessionId && (
        <LogDialog
          meta={sessionMeta}
          desc={sessionDesc}
          onLog={(status, detail, km) => {
            const xp = logResult(sessionId, status, detail, km);
            setLogging(false);
            const rect = cornerRef.current?.getBoundingClientRect();
            fire({ x: (rect?.left ?? 300) - 60, y: (rect?.top ?? 60) + 60 }, xp);
          }}
          onCancel={() => setLogging(false)}
        />
      )}
      {debriefing && gate && s.profile && (
        <GateDebrief gate={gate} sex={s.profile.sex} onClose={() => setDebriefing(false)} />
      )}
      {nodes}
    </div>
  );
}

function StepsPanel({
  title,
  rx,
  fullRx,
  why,
  earnedXp,
  pendingXp,
  press,
}: {
  title: string;
  rx: string;
  fullRx: string;
  why: string;
  earnedXp?: number;
  pendingXp: number;
  press: ReturnType<typeof usePress>;
}) {
  const tSettle = useAnim(settle);
  const tSnap = useAnim(snap);
  const completed = earnedXp !== undefined;
  const [flash, setFlash] = useState(0);
  const [detail, setDetail] = useState(false);
  const onPointerUp = press.onPointerUp;

  return (
    <motion.div
      className={`sys-panel quest-panel${completed ? ' quest-panel--done' : ''}`}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={withDelay(tSettle, 0.05)}
      whileTap={{ scale: 0.98 }}
      style={{ marginBottom: 12 }}
      {...press}
      onPointerUp={(e) => {
        if (!completed) setFlash((n) => n + 1);
        onPointerUp(e);
      }}
      role="button"
      aria-pressed={completed}
      aria-label={title}
    >
      <div className="quest-main">
        <div className="quest-title">{title}</div>
        <div className="quest-min">{rx}</div>
        {detail && <QuestDetail rx={fullRx} why={why} tier="STRONG" />}
      </div>
      <div className="quest-side">
        <InfoButton open={detail} onToggle={() => setDetail((v) => !v)} />
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

/** Graded debrief with modality swap and optional distance for runs. */
function LogDialog({
  meta,
  desc,
  onLog,
  onCancel,
}: {
  meta: QuestMeta;
  desc: string;
  onLog: (status: ResultStatus, detail?: string, km?: number) => void;
  onCancel: () => void;
}) {
  const tFade = useAnim(fade);
  const tSettle = useAnim(settle);
  const [modality, setModality] = useState('RUN');
  const [km, setKm] = useState('');
  const [note, setNote] = useState('');
  const isCardio = meta.kind === 'cardio';

  const log = (status: ResultStatus) => {
    const parts = [];
    if (isCardio && modality !== 'RUN') parts.push(modality);
    if (note.trim()) parts.push(note.trim());
    const kmNum = Number(km);
    onLog(
      status,
      parts.length ? parts.join(' · ') : undefined,
      isCardio && modality === 'RUN' && Number.isFinite(kmNum) && kmNum > 0 ? kmNum : undefined,
    );
  };

  return (
    <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={tFade}>
      <motion.div
        className="sys-panel overlay-panel"
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={tSettle}
      >
        <div className="overlay-eyebrow">DEBRIEF</div>
        <p className="overlay-copy">{desc}</p>

        {isCardio && (
          <div className="sys-field">
            <span className="dim-label">MODALITY — EQUIVALENT DURATION COUNTS AS MET</span>
            <div className="seg">
              {MODALITIES.map((m) => (
                <button
                  key={m}
                  className={`seg-btn${modality === m ? ' on' : ''}`}
                  onClick={() => setModality(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {isCardio && modality === 'RUN' && (
          <div className="sys-field">
            <label className="dim-label" htmlFor="log-km">
              DISTANCE (KM) — OPTIONAL, FEEDS GATE PROGRESS
            </label>
            <input
              id="log-km"
              className="sys-input"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={km}
              onChange={(e) => setKm(e.target.value)}
            />
          </div>
        )}

        <div className="sys-field">
          <label className="dim-label" htmlFor="log-note">
            NOTES — OPTIONAL{meta.kind === 'strength' ? ' (WEIGHTS)' : ''}
          </label>
          <input
            id="log-note"
            className="sys-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={80}
          />
        </div>

        <div className="log-choices">
          <button className="sys-btn sys-btn--primary" onClick={() => log('MET')}>
            MET STANDARD
          </button>
          <button className="sys-btn" onClick={() => log('EXCEEDED')}>
            EXCEEDED
          </button>
          <button className="sys-btn" onClick={() => log('ATTEMPTED')}>
            ATTEMPTED
          </button>
        </div>
        <p className="log-note">
          WENT BEYOND THE PRESCRIPTION? EXCEEDED — 120% XP. REDUCED OR BELOW-STANDARD EFFORT IS ATTEMPTED — 70% XP,
          FULL CONSISTENCY CREDIT.
        </p>
        <div className="form-actions" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="sys-btn sys-btn--quiet" onClick={onCancel}>
            CANCEL
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
