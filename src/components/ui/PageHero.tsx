'use client';

import { FC, ReactNode } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { TONE_STYLES, type Tone } from './tones';

export interface HeroChip {
  icon?: ReactNode;
  label: string;
}

interface PageHeroProps {
  tone?: Tone;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Large illustration on the right (hidden on small screens). */
  image?: string;
  /** Small icon shown in a glass tile next to the title when there is no illustration. */
  icon?: ReactNode;
  chips?: HeroChip[];
  actions?: ReactNode;
  className?: string;
}

/** Section banner: two-stop gradient, white text, rounded-3xl. */
export const PageHero: FC<PageHeroProps> = ({
  tone = 'blue',
  eyebrow,
  title,
  description,
  image,
  icon,
  chips,
  actions,
  className = '',
}) => {
  const reduce = useReducedMotion();
  const styles = TONE_STYLES[tone];

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${styles.hero} p-6 text-white shadow-lg shadow-black/5 sm:p-8 ${className}`}
    >
      <div className="relative flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          {icon && !image && (
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">{icon}</div>
          )}
          {eyebrow && <p className="mb-1 text-sm font-medium text-white/75">{eyebrow}</p>}
          <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">{description}</p>}

          {chips && chips.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Ringkasan">
              {chips.map((chip) => (
                <li key={chip.label} className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                  {chip.icon}
                  {chip.label}
                </li>
              ))}
            </ul>
          )}
          {actions && <div className="mt-5 flex flex-wrap gap-2">{actions}</div>}
        </div>

        {image && (
          <div className="hidden shrink-0 sm:block">
            <Image src={image} alt="" width={150} height={150} className="drop-shadow-xl" />
          </div>
        )}
      </div>
    </motion.section>
  );
};
