'use client';

import { FC } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Flame, Lock, Sprout, Star, Target, Trophy, Users, type LucideIcon } from 'lucide-react';
import type { Badge, BadgeIcon } from '@/lib/gamification';

const ICONS: Record<BadgeIcon, LucideIcon> = {
  sprout: Sprout,
  target: Target,
  flame: Flame,
  book: BookOpen,
  users: Users,
  star: Star,
  trophy: Trophy,
};

const EARNED_STYLE: Record<BadgeIcon, string> = {
  sprout: 'from-emerald-400 to-teal-500',
  target: 'from-violet-500 to-indigo-500',
  flame: 'from-amber-400 to-orange-500',
  book: 'from-sky-400 to-blue-500',
  users: 'from-cyan-400 to-teal-500',
  star: 'from-yellow-400 to-amber-500',
  trophy: 'from-rose-400 to-pink-500',
};

export const BadgeShelf: FC<{ badges: Badge[] }> = ({ badges }) => {
  const reduce = useReducedMotion();
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm shadow-gray-100" aria-labelledby="badge-heading">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="badge-heading" className="text-sm font-bold text-gray-900">Pencapaian</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
          {earned} / {badges.length}
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {badges.map((badge, i) => {
          const Icon = ICONS[badge.icon];
          return (
            <motion.li
              key={badge.id}
              initial={reduce ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`flex flex-col items-center rounded-2xl p-3 text-center ${badge.earned ? 'bg-gray-50' : 'bg-gray-50/60'}`}
            >
              <div
                className={`mb-2 flex h-12 w-12 items-center justify-center rounded-2xl ${
                  badge.earned ? `bg-gradient-to-br ${EARNED_STYLE[badge.icon]} text-white shadow-md` : 'bg-gray-200 text-gray-400'
                }`}
              >
                {badge.earned ? <Icon size={22} aria-hidden="true" /> : <Lock size={18} aria-hidden="true" />}
              </div>
              <p className={`text-xs font-bold leading-tight ${badge.earned ? 'text-gray-900' : 'text-gray-500'}`}>{badge.title}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-gray-400">{badge.description}</p>
              {badge.earned ? (
                <span className="sr-only">Sudah diraih</span>
              ) : (
                <div className="mt-2 w-full" aria-label={`Progres ${badge.progress} dari ${badge.target}`}>
                  <div className="h-1 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${(badge.progress / badge.target) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-[10px] tabular-nums text-gray-400">{badge.progress}/{badge.target}</p>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
};
