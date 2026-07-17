import { useRef } from 'react';
import type React from 'react';

const LONG_PRESS_MS = 450;
const MOVE_CANCEL_PX = 12;

export interface PressPoint {
  x: number;
  y: number;
}

/**
 * Hand-rolled press tracking shared by all tappable quest panels:
 * single tap fires onTap, holding fires onLongPress (mis-tap undo).
 */
export function usePress(opts: {
  onTap?: (point: PressPoint) => void;
  onLongPress?: () => void;
  disabled?: boolean;
}) {
  const timer = useRef<number | null>(null);
  const start = useRef<PressPoint>({ x: 0, y: 0 });
  const longFired = useRef(false);
  const cancelled = useRef(false);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (opts.disabled) return;
    start.current = { x: e.clientX, y: e.clientY };
    longFired.current = false;
    cancelled.current = false;
    clearTimer();
    timer.current = window.setTimeout(() => {
      longFired.current = true;
      opts.onLongPress?.();
    }, LONG_PRESS_MS);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) {
      cancelled.current = true;
      clearTimer();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    clearTimer();
    if (opts.disabled || longFired.current || cancelled.current) return;
    opts.onTap?.({ x: e.clientX, y: e.clientY });
  };

  const onPointerCancel = () => {
    cancelled.current = true;
    clearTimer();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onPointerLeave: onPointerCancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
