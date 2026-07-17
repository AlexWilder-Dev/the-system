import { useEffect, useRef } from 'react';

const COUNT = 40;

interface P {
  x: number;
  y: number;
  size: number;
  vy: number;
  sway: number;
  phase: number;
  alpha: number;
}

/**
 * Fixed full-screen atmosphere: ~40 slow-drifting motes in system blue.
 * Glow comes from a pre-rendered radial-gradient sprite (one drawImage per
 * particle, no per-frame shadowBlur) so this holds 60fps on mid-range phones.
 * Respects prefers-reduced-motion by rendering a single static frame.
 */
export function Particles() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let raf = 0;
    let particles: P[] = [];

    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 64;
    const sctx = sprite.getContext('2d')!;
    const grad = sctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(77, 184, 255, 0.9)');
    grad.addColorStop(0.35, 'rgba(77, 184, 255, 0.25)');
    grad.addColorStop(1, 'rgba(77, 184, 255, 0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 64, 64);

    const spawn = (): P => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: 5 + Math.random() * 16,
      vy: 0.06 + Math.random() * 0.18,
      sway: 4 + Math.random() * 10,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.05 + Math.random() * 0.16,
    });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: COUNT }, spawn);
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        const x = p.x + Math.sin(t / 4000 + p.phase) * p.sway;
        ctx.globalAlpha = p.alpha;
        ctx.drawImage(sprite, x - p.size, p.y - p.size, p.size * 2, p.size * 2);
      }
      ctx.globalAlpha = 1;
    };

    const tick = (t: number) => {
      for (const p of particles) {
        p.y -= p.vy;
        if (p.y < -p.size * 2) {
          p.y = h + p.size * 2;
          p.x = Math.random() * w;
        }
      }
      draw(t);
      raf = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (reduced) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    if (reduced) {
      draw(0);
    } else {
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} className="fx-canvas" aria-hidden="true" />;
}
