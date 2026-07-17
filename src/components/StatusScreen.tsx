import { useMemo, useState } from 'react';
import { useGame } from '../state/GameContext';
import { levelForXp } from '../logic/xp';
import { displayRank, subProgress, LETTERS } from '../logic/rank';
import { computeStats, STAT_KEYS } from '../logic/stats';
import { streakBonusPercent } from '../logic/streak';
import { gateAvailable, nextGate, testRows, trackedRequirements } from '../logic/gatecheck';
import { isDeloadWeek, weekNumberFor } from '../logic/schedule';
import { formatDisplayDate, localDateOfISO } from '../logic/dates';
import { TRACKS } from '../data/protocols';
import { CountUp } from './CountUp';
import { XPBar } from './XPBar';
import { SysPanel } from './SysPanel';
import { GateDeclaration, GateDebrief } from './GateModals';

const gear = (
  <svg className="gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
  </svg>
);

export function StatusScreen({ onManage }: { onManage: () => void }) {
  const { state, today, streak, debug, grantDebugXp, enterGate } = useGame();
  const s = state!;
  const level = levelForXp(s.xp);
  const xpInLetter = s.xp - s.letterXpStart;
  const rank = displayRank(s.gatesPassed, xpInLetter);
  const prog = subProgress(s.gatesPassed, xpInLetter);
  const gate = nextGate(s.gatesPassed);
  const available = gateAvailable(s, today);
  const stats = useMemo(() => computeStats(s.quests, s.results), [s.quests, s.results]);
  const bonus = streakBonusPercent(streak.days);
  const tracked = useMemo(() => (gate ? trackedRequirements(s, today) : []), [s, today, gate]);
  const tests = useMemo(
    () => (gate && s.profile ? testRows(gate, s.profile.sex, s.gateProgress) : []),
    [gate, s.profile, s.gateProgress],
  );
  const [declaring, setDeclaring] = useState(false);
  const [debriefing, setDebriefing] = useState(false);

  const lastAttempt = [...s.gateHistory].reverse().find((a) => a.from === s.gatesPassed && !a.pass);
  const trackLine = () => {
    if (!s.profile) return null;
    const track = TRACKS[s.profile.track];
    const weekNum = weekNumberFor(localDateOfISO(s.profile.assessedAt), today);
    const trackWeek = Math.min(Math.min(...s.trackLevels) + 1, track.weeks.length);
    return `${track.name} — WEEK ${trackWeek} / ${track.weeks.length}${isDeloadWeek(weekNum) ? ' · RECOVERY WEEK' : ''}`;
  };

  const nextLine = () => {
    if (!gate) return <>MAX RANK. THE SYSTEM HAS NOTHING LEFT TO TEACH.</>;
    // Sub-ranks sharpen the tier you are; the Gate is the only way out of it.
    if (!rank.mastered && prog.into !== null && prog.needed !== null) {
      const nextSub = rank.sub === 'III' ? 'II' : 'I';
      return (
        <>
          NEXT: {rank.letter}-{nextSub} — <span className="num">{prog.needed - prog.into} XP</span>
        </>
      );
    }
    if (available) return <>TIER MASTERED. GATE AVAILABLE.</>;
    const met = tracked.filter((r) => r.met).length;
    return (
      <>
        TIER MASTERED — GATE REQUIREMENTS: <span className="num">{met} / {tracked.length}</span>
      </>
    );
  };

  return (
    <div className="screen">
      <button className="gear-btn" onClick={onManage} aria-label="Manage">
        {gear}
      </button>

      <div className="status-head">
        <span className="dim-label">HUNTER</span>
        <h1 className="hunter-name">{s.hunter.name}</h1>
      </div>

      {/* Signature element. In ?debug mode a tap grants 100 XP for testing. */}
      <div className="rank-wrap" onClick={debug ? grantDebugXp : undefined}>
        {/* Aura intensity tracks the sub-rank; mastery turns it gold. */}
        <div
          className={`rank-aura rank-aura--${rank.sub.toLowerCase()}${rank.mastered ? ' rank-aura--mastered' : ''}`}
          aria-hidden="true"
        />
        {available && (
          <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true" focusable="false">
            <defs>
              <filter id="rift-distort" x="-500%" y="-5%" width="1100%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="0.02 0.03" numOctaves="2" seed="7" result="noise">
                  <animate
                    attributeName="baseFrequency"
                    dur="7s"
                    values="0.02 0.03;0.05 0.06;0.02 0.03"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>
        )}
        {available && <div className="gate-rift" aria-hidden="true" />}
        <div className="rank-letter num" aria-label={`Rank ${rank.letter}-${rank.sub}`}>
          {rank.letter}
          <span className="subrank">-{rank.sub}</span>
        </div>
        <span className="rank-caption">RANK</span>
      </div>

      {available && !s.gateAttempt && (
        <div className="gate-cta">
          <button className="sys-btn sys-btn--primary" onClick={() => setDeclaring(true)}>
            ENTER THE GATE
          </button>
        </div>
      )}

      {s.gateAttempt && (
        <SysPanel className="featured-card" delay={0}>
          <div className="featured-kicker">
            <span className="dim-label">{gate?.name ?? 'GATE'} — TRIAL DECLARED</span>
          </div>
          <p className="featured-rx">COMPLETE THE PHYSICAL TEST. REPORT WHEN DONE.</p>
          <div className="gate-cta" style={{ marginTop: 12, marginBottom: 0 }}>
            <button className="sys-btn sys-btn--primary" onClick={() => setDebriefing(true)}>
              REPORT RESULT
            </button>
          </div>
        </SysPanel>
      )}

      <div className="level-row">
        <span className="dim-label">LEVEL</span>
        <CountUp className="level-num num" value={level} />
      </div>

      <XPBar xp={s.xp} />

      <p className="next-rank">{nextLine()}</p>
      {s.profile && <p className="track-context num">{trackLine()}</p>}

      {gate && (
        <SysPanel className="req-panel">
          <div className="req-title">
            <span className="dim-label">
              {gate.name} — {LETTERS[s.gatesPassed]} → {LETTERS[s.gatesPassed + 1]}
            </span>
            <span className="req-current num">
              {tracked.filter((r) => r.met).length} / {tracked.length} MET
            </span>
          </div>
          {tracked.map((r) => (
            <div className={`req-row${r.met ? ' req-row--met' : ''}`} key={r.id}>
              <span className="req-mark num">{r.met ? '✓' : '·'}</span>
              <span className="req-label" style={{ flex: 1 }}>
                {r.label}
              </span>
              <span className="req-current num">{r.current}</span>
            </div>
          ))}
          {tests.map((r) => (
            <div className={`req-row${r.met ? ' req-row--met' : ''}`} key={`t-${r.id}`}>
              <span className="req-mark num">{r.met ? '✓' : '◇'}</span>
              <span className="req-label" style={{ flex: 1 }}>
                {r.label}
              </span>
              <span className="req-current num">{r.current}</span>
            </div>
          ))}
          {lastAttempt && (
            <div className="gate-last-attempt">
              <span className="dim-label">LAST ATTEMPT — {formatDisplayDate(lastAttempt.date)}</span>
              {lastAttempt.shortfalls.map((line) => (
                <p className="quest-min num" key={line}>
                  {line}
                </p>
              ))}
            </div>
          )}
        </SysPanel>
      )}

      <SysPanel className="stats-panel">
        {STAT_KEYS.map((key) => (
          <div className="stat-row" key={key}>
            <span className="stat-name">{key}</span>
            <CountUp className="stat-val num" value={stats[key]} />
          </div>
        ))}
      </SysPanel>

      <SysPanel className="streak-panel" delay={0.05}>
        <span className="sigil" aria-hidden="true" />
        <CountUp className="streak-days num" value={streak.days} />
        <div className="streak-meta">
          <span className="streak-note">DAY STREAK</span>
          {streak.restDayUsed && <span className="streak-note">REST DAY USED — STREAK HOLDS</span>}
          {bonus > 0 && <span className="streak-note streak-note--bonus num">+{bonus}% XP ACTIVE</span>}
        </div>
      </SysPanel>

      {declaring && gate && (
        <GateDeclaration
          gate={gate}
          onEnter={() => {
            enterGate();
            setDeclaring(false);
          }}
          onCancel={() => setDeclaring(false)}
        />
      )}
      {debriefing && gate && s.profile && (
        <GateDebrief gate={gate} sex={s.profile.sex} onClose={() => setDebriefing(false)} />
      )}
    </div>
  );
}
