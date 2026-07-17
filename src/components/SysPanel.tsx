import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMaterialize } from '../motion/springs';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** A system window that GENERATES: a line of light unfolds into the panel. */
export function SysPanel({ children, className, delay = 0 }: Props) {
  const m = useMaterialize(delay);
  return (
    <motion.div className={`sys-panel${className ? ` ${className}` : ''}`} {...m}>
      {children}
    </motion.div>
  );
}
