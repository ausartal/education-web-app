'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coffee, ArrowRight } from 'lucide-react';
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

  const handleSkip = useCallback(() => {
    onBreakEnd();
  }, [onBreakEnd]);

  useEffect(() => {
    if (breakTimeLeft <= 0) {
      onBreakEnd();
      return;
    }
    const interval = setInterval(() => {
      setBreakTimeLeft((prev) => {
        if (prev <= 1000) {
          onBreakEnd();
          return 0;
        }
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
      className="flex min-h-screen items-center justify-center bg-[#f8f8fc]"
    >
      <div className="mx-auto max-w-md px-4 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-[#5841EA]/10"
        >
          <Coffee size={48} className="text-[#5841EA]" />
        </motion.div>

        <h2 className="mb-2 text-2xl font-bold text-gray-900">
          Istirahat Sejenak
        </h2>
        <p className="mb-8 text-gray-500">
          Tahap {completedStage} telah selesai. Tahap {completedStage + 1} akan dimulai setelah jeda.
        </p>

        {/* Circular progress */}
        <div className="relative mx-auto mb-8 h-40 w-40">
          <svg className="h-40 w-40 -rotate-90" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#e5e7eb"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#5841EA"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 70}
              strokeDashoffset={2 * Math.PI * 70 * (1 - progress)}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold tabular-nums text-[#5841EA]">
              {formatTime(breakTimeLeft)}
            </span>
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5841EA] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5841EA]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          Lewati Jeda
          <ArrowRight size={16} />
        </button>

        <p className="mt-4 text-xs text-gray-400">
          Timer ujian tetap berjalan selama jeda
        </p>
      </div>
    </motion.div>
  );
};
