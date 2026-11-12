'use client';

import { FC, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { TONE_STYLES, type Tone } from './tones';

interface EmptyStateProps {
  /** A lucide icon element, for example <Inbox size={28} />. */
  icon: ReactNode;
  title: string;
  description?: string;
  /** Button or link that moves the person forward. */
  action?: ReactNode;
  tone?: Tone;
  /** Smaller padding for use inside cards and lists. */
  compact?: boolean;
  className?: string;
}

/** Friendly empty state: soft icon tile, short guidance and one clear next step. */
export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  tone = 'blue',
  compact = false,
  className = '',
}) => {
  const reduce = useReducedMotion();
  const styles = TONE_STYLES[tone];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center rounded-3xl bg-white text-center shadow-sm ring-1 ring-gray-100 ${compact ? 'px-6 py-10' : 'px-6 py-16'} ${className}`}
    >
      <div className="relative mb-5">
        <div className={`flex h-20 w-20 items-center justify-center rounded-3xl ${styles.soft} ${styles.icon} ring-1 ${styles.ring}`}>
          {icon}
        </div>
      </div>
      <h3 className="font-display text-lg font-extrabold text-gray-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-gray-500">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
};
