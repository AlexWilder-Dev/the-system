import { motion, useReducedMotion } from 'framer-motion';
import { useRef, useState, type RefObject } from 'react';
import { flight } from '../motion/springs';
import type { PressPoint } from './press';

interface Flyer {
  key: number;
  from: PressPoint;
  to: PressPoint;
  amount: number;
}

/**
 * The +XP number: pops up at the tap point, holds long enough to be read,
 * then glides to the screen's corner readout and fades on arrival. Under
 * reduced motion no flyer fires at all — the XP bar still tells the story.
 */
export function useXpFlyers(cornerRef: RefObject<HTMLElement | null>) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const nextKey = useRef(0);
  const reduced = useReducedMotion();

  const fire = (from: PressPoint, amount: number) => {
    if (amount <= 0 || reduced) return;
    const rect = cornerRef.current?.getBoundingClientRect();
    const to = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth - 40, y: 40 };
    setFlyers((prev) => [...prev, { key: nextKey.current++, from, to, amount }]);
  };

  const nodes = flyers.map((f) => (
    <motion.span
      key={f.key}
      className="xp-flyer num"
      initial={{ x: f.from.x - 20, y: f.from.y - 10, opacity: 0, scale: 0.85 }}
      animate={{
        x: [f.from.x - 20, f.from.x - 20, f.to.x - 20],
        y: [f.from.y - 10, f.from.y - 34, f.to.y - 10],
        opacity: [0, 1, 1, 0],
        scale: [0.85, 1.12, 0.6],
      }}
      transition={{
        ...flight,
        times: [0, 0.38, 1],
        opacity: { ...flight, times: [0, 0.12, 0.8, 1] },
      }}
      onAnimationComplete={() => setFlyers((prev) => prev.filter((o) => o.key !== f.key))}
    >
      +{f.amount} XP
    </motion.span>
  ));

  return { fire, nodes };
}
