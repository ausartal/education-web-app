'use client';

import { FC, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const COLORS = ['#4f6ef7', '#38bdf8', '#f97316', '#10b981', '#8b5cf6', '#f43f5e', '#fbbf24'];
const PIECES = 36;

interface CelebrationProps {
  /** Called once the confetti has finished, so the parent can unmount it. */
  onDone?: () => void;
}

/** Short confetti burst for good moments. Draws nothing when the person prefers reduced motion. */
export const Celebration: FC<CelebrationProps> = ({ onDone }) => {
  const reduce = useReducedMotion();

  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2;
        const spread = 120 + (i % 7) * 38;
        return {
          id: i,
          color: COLORS[i % COLORS.length],
          x: Math.cos(angle) * spread,
          y: Math.sin(angle) * spread * 0.6 + 260 + (i % 5) * 40,
          rotate: (i % 2 === 0 ? 1 : -1) * (240 + (i % 6) * 90),
          delay: (i % 6) * 0.02,
          size: 6 + (i % 4) * 2,
          round: i % 3 === 0,
        };
      }),
    [],
  );

  useEffect(() => {
    if (reduce) {
      onDone?.();
      return;
    }
    const timer = setTimeout(() => onDone?.(), 2600);
    return () => clearTimeout(timer);
  }, [reduce, onDone]);

  if (reduce) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden="true">
      <div className="absolute left-1/2 top-1/3">
        {pieces.map((p) => (
          <motion.span
            key={p.id}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
            animate={{ x: p.x, y: p.y, opacity: 0, rotate: p.rotate, scale: 1 }}
            transition={{ duration: 1.9, delay: p.delay, ease: [0.2, 0.7, 0.3, 1] }}
            className="absolute block"
            style={{ width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.round ? '9999px' : 2 }}
          />
        ))}
      </div>
    </div>
  );
};
