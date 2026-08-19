'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { KPSDifficultyLevel, KPS_LEVEL_LABELS, KPS_LEVEL_COLORS } from '@/types/kps';
import { Trophy, Target, BarChart3 } from 'lucide-react';

interface Props {
  finalLevel: KPSDifficultyLevel;
  numericScore: number;
  totalCorrect: number;
  totalQuestions: number;
}

export const KPSScoreCard: FC<Props> = ({ finalLevel, numericScore, totalCorrect, totalQuestions }) => {
  const colors = KPS_LEVEL_COLORS[finalLevel];
  const label = KPS_LEVEL_LABELS[finalLevel];
  const percentage = Math.round((totalCorrect / totalQuestions) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg"
    >
      {/* Header with gradient */}
      <div className={`bg-gradient-to-r from-[#5841EA] to-[#7B68EE] p-8 text-center text-white`}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20"
        >
          <Trophy size={32} />
        </motion.div>
        <h2 className="mb-1 text-sm font-medium text-white/80">Level Kamu</h2>
        <p className="text-2xl font-bold">{label}</p>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 p-6">
        <div className="text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#5841EA]/10">
            <Target size={14} className="text-[#5841EA]" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{numericScore}</p>
          <p className="text-xs text-gray-500">Skor</p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50">
            <BarChart3 size={14} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCorrect}/{totalQuestions}</p>
          <p className="text-xs text-gray-500">Benar</p>
        </div>
        <div className="text-center">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
            <span className="text-sm">%</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
          <p className="text-xs text-gray-500">Akurasi</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pb-6">
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className={`h-full rounded-full bg-gradient-to-r from-[#5841EA] to-[#7B68EE]`}
          />
        </div>
      </div>
    </motion.div>
  );
};
