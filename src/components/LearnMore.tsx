import type React from 'react';
import type { EvidenceTier } from '../data/protocols';

/**
 * The "?" affordance: cards state the task in one line and stop; the full
 * prescription and the evidence live behind this toggle. It sits inside
 * pressable panels, so every pointer event must stop at the button.
 */
export function InfoButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <button
      type="button"
      className={`info-btn${open ? ' on' : ''}`}
      aria-label={open ? 'Hide details' : 'Learn more'}
      aria-expanded={open}
      onPointerDown={stop}
      onPointerUp={stop}
      onPointerMove={stop}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      ?
    </button>
  );
}

/** The expanded detail: full rx, the why, and the evidence tier. */
export function QuestDetail({ rx, why, tier }: { rx?: string; why?: string; tier?: EvidenceTier }) {
  return (
    <div className="quest-detail">
      {rx && <p className="quest-min">{rx}</p>}
      {why && <p className="quest-why">{why}</p>}
      {tier && (
        <span className={`tier-chip${tier === 'STRONG' ? ' tier-chip--strong' : ''}`}>{tier} EVIDENCE</span>
      )}
    </div>
  );
}
