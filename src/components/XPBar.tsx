import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { levelForXp, xpRequiredForLevel } from '../logic/xp';
import { settle, useAnim } from '../motion/springs';

/**
 * XP progress toward the next level. Numbers are lifetime XP against the next
 * threshold (e.g. 340 / 450); the fill shows progress within the current level.
 * Gains fire a one-shot shimmer sweep across the track.
 */
export function XPBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const t = useAnim(settle);
  const level = levelForXp(xp);
  const current = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const pct = Math.max(0, Math.min(1, (xp - current) / (next - current))) * 100;

  const [sweep, setSweep] = useState(0);
  const prevXp = useRef(xp);
  useEffect(() => {
    if (xp > prevXp.current) setSweep((n) => n + 1);
    prevXp.current = xp;
  }, [xp]);

  return (
    <div className={`xpbar${compact ? ' xpbar--compact' : ''}`}>
      <div className="xpbar-head">
        {!compact && <span className="dim-label">XP</span>}
        <span className="xpbar-nums num">
          {xp} <span className="of">/ {next}</span>
        </span>
      </div>
      <div className="xpbar-track">
        <motion.div
          className="xpbar-fill"
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={t}
        />
        {sweep > 0 && <span key={sweep} className="xpbar-sweep" aria-hidden="true" />}
      </div>
    </div>
  );
}
