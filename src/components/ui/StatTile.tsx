'use client';

import { FC, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TONE_STYLES, type Tone } from './tones';

interface StatTileProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  hint?: string;
  tone?: Tone;
  /** Position in a row, used to stagger the entrance. */
  index?: number;
}

export const StatTile: FC<StatTileProps> = ({ icon, value, label, hint, tone = 'blue', index = 0 }) => {
  const reduce = useReducedMotion();
  const styles = TONE_STYLES[tone];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
    >
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${styles.soft} ${styles.icon}`}>{icon}</div>
      <p className="font-display text-2xl font-extrabold tabular-nums text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </motion.div>
  );
};
