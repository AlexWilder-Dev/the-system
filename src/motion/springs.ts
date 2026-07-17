import { useReducedMotion } from 'framer-motion';
import type { Transition } from 'framer-motion';

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
