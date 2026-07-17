import { useReducedMotion } from 'framer-motion';
import type { Target, TargetAndTransition, Transition } from 'framer-motion';

// The one motion system. Every animated component imports from here —
// no inline transition configs anywhere else in the codebase.

/** Taps, toggles, quest completion. */
export const snap: Transition = { type: 'spring', stiffness: 500, damping: 30 };

/** Panels entering, tab changes, XP bar fills, count-ups. */
export const settle: Transition = { type: 'spring', stiffness: 260, damping: 24 };

/** Level-up and rank-up only. */
export const dramatic: Transition = { type: 'spring', stiffness: 120, damping: 14 };

/** The reduced-motion replacement for every spring. */
export const fade: Transition = { type: 'tween', duration: 0.15 };

/** Rank-up glow sweep — the single non-spring flourish, defined once here. */
export const sweep: Transition = { type: 'tween', duration: 0.9, ease: 'easeInOut' };

/** Returns the given spring, or a 150ms fade when the user prefers reduced motion. */
export function useAnim(spring: Transition): Transition {
  const reduced = useReducedMotion();
  return reduced ? fade : spring;
}

/** Staggered entrances keep the same physics; only the start time shifts. */
export function withDelay(t: Transition, delay: number): Transition {
  return { ...t, delay };
}

export interface Materialize {
  initial: Target;
  animate: TargetAndTransition;
  transition: Transition;
}

/**
 * System-window GENERATION, the way windows appear in the show: a horizontal
 * line of light snaps into existence, then unfolds vertically into the panel
 * while the flash cools to normal brightness. Spread onto a motion.div.
 * Reduced motion collapses to the standard fade.
 */
export function useMaterialize(delay = 0): Materialize {
  const reduced = useReducedMotion();
  if (reduced) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { ...fade, delay } };
  }
  return {
    initial: { opacity: 0, scaleX: 0.55, scaleY: 0.05, filter: 'brightness(2.6)' },
    animate: {
      opacity: [0, 1, 1],
      scaleX: [0.55, 1, 1],
      scaleY: [0.05, 0.05, 1],
      filter: ['brightness(2.6)', 'brightness(2.1)', 'brightness(1)'],
    },
    transition: { duration: 0.38, times: [0, 0.42, 1], ease: 'easeOut', delay },
  };
}
