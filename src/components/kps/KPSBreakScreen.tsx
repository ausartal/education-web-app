'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coffee, ArrowRight, Timer } from 'lucide-react';
import { KPS_CONFIG } from '@/types/kps';

interface Props {
  completedStage: 1 | 2;
  onBreakEnd: () => void;
  timeLeftMs: number;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export const KPSBreakScreen: FC<Props> = ({ completedStage, onBreakEnd, timeLeftMs }) => {
  const breakDuration = KPS_CONFIG.breakDurationMinutes * 60 * 1000;
  const [breakTimeLeft, setBreakTimeLeft] = useState(Math.min(breakDuration, timeLeftMs));

  const handleSkip = useCallback(() => { onBreakEnd(); }, [onBreakEnd]);

  useEffect(() => {
    if (breakTimeLeft <= 0) { onBreakEnd(); return; }
    const interval = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1000) { onBreakEnd(); return 0; }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [breakTimeLeft, onBreakEnd]);

  const progress = 1 - breakTimeLeft / breakDuration;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-screen items-center justify-center bg-[#f7f5f2]"
    >
      <div className="mx-auto max-w-md px-4 text-center">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.15 }}
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-xl shadow-violet-200/40"
        >
          <Coffee size={44} className="text-white" />
        </motion.div>

        <h2 className="font-display text-2xl font-extrabold text-stone-800">
          Istirahat Sejenak
        </h2>
        <p className="mt-2 text-sm text-stone-400">
          Tahap {completedStage} selesai. Tahap {completedStage + 1} dimulai setelah jeda.
        </p>

        {/* Circular progress */}
        <div className="relative mx-auto my-10 h-44 w-44">
          <svg className="h-44 w-44 -rotate-90" viewBox="0 0 176 176">
            <circle cx="88" cy="88" r="76" stroke="#e7e5e4" strokeWidth="8" fill="none" />
            <circle
              cx="88" cy="88" r="76"
              stroke="url(#breakGrad)"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 76}
              strokeDashoffset={2 * Math.PI * 76 * (1 - progress)}
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="breakGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl font-extrabold tabular-nums text-stone-800">
              {formatTime(breakTimeLeft)}
            </span>
            <span className="mt-1 text-xs text-stone-400">menit tersisa</span>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          Lewati Jeda
          <ArrowRight size={16} />
        </button>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <Timer size={12} />
          Timer ujian tetap berjalan selama jeda
        </div>
      </div>
    </motion.div>
  );
};
