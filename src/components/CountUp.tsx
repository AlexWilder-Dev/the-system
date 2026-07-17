import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type ValueAnimationTransition,
} from 'framer-motion';
import { useEffect, useRef } from 'react';
import { settle, useAnim } from '../motion/springs';

/** A number that counts up (with settle physics) whenever its value changes. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const t = useAnim(settle);
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => String(Math.round(v)));
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, t as ValueAnimationTransition<number>);
    return () => controls.stop();
  }, [value]);

  return <motion.span className={className}>{text}</motion.span>;
}
