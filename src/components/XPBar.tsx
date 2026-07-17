import { motion } from 'framer-motion';
import { levelForXp, xpRequiredForLevel } from '../logic/xp';
import { settle, useAnim } from '../motion/springs';

/**
 * XP progress toward the next level. Numbers are lifetime XP against the next
 * threshold (e.g. 340 / 450); the fill shows progress within the current level.
 */
export function XPBar({ xp, compact = false }: { xp: number; compact?: boolean }) {
  const t = useAnim(settle);
  const level = levelForXp(xp);
  const current = xpRequiredForLevel(level);
  const next = xpRequiredForLevel(level + 1);
  const pct = Math.max(0, Math.min(1, (xp - current) / (next - current))) * 100;

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
      </div>
    </div>
  );
}
