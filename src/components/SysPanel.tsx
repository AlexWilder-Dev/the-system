import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { settle, useAnim, withDelay } from '../motion/springs';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
}

/** A system window that materialises: scale from 0.96 + fade, corners draw in via CSS. */
export function SysPanel({ children, className, delay = 0 }: Props) {
  const t = useAnim(settle);
  return (
    <motion.div
      className={`sys-panel${className ? ` ${className}` : ''}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={withDelay(t, delay)}
    >
      {children}
    </motion.div>
  );
}
