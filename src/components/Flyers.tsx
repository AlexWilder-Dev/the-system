import { motion } from 'framer-motion';
import { useRef, useState, type RefObject } from 'react';
import { settle, useAnim } from '../motion/springs';
import type { PressPoint } from './press';

interface Flyer {
  key: number;
  from: PressPoint;
  to: PressPoint;
  amount: number;
}

/** The +XP number that flies from the tap point to the screen's corner readout. */
export function useXpFlyers(cornerRef: RefObject<HTMLElement | null>) {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const nextKey = useRef(0);
  const t = useAnim(settle);

  const fire = (from: PressPoint, amount: number) => {
    if (amount <= 0) return;
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
      initial={{ x: f.from.x - 20, y: f.from.y - 10, opacity: 1, scale: 1 }}
      animate={{ x: f.to.x - 20, y: f.to.y - 10, opacity: 0, scale: 0.5 }}
      transition={t}
      onAnimationComplete={() => setFlyers((prev) => prev.filter((o) => o.key !== f.key))}
    >
      +{f.amount} XP
    </motion.span>
  ));

  return { fire, nodes };
}
