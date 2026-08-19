'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface Props {
  currentStage: 1 | 2 | 3;
  completedStages: number[];
}

const stages = [
  { num: 1, label: 'Tahap 1' },
  { num: 2, label: 'Tahap 2' },
  { num: 3, label: 'Tahap 3' },
];

export const KPSStageIndicator: FC<Props> = ({ currentStage, completedStages }) => {
  return (
    <div className="flex items-center justify-center gap-2">
      {stages.map((stage, idx) => {
        const isCompleted = completedStages.includes(stage.num);
        const isCurrent = currentStage === stage.num;
        return (
          <div key={stage.num} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all ${
                isCompleted
                  ? 'bg-emerald-500 text-white'
                  : isCurrent
                    ? 'bg-[#5841EA] text-white shadow-lg shadow-[#5841EA]/30'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isCompleted ? <Check size={16} /> : stage.num}
            </motion.div>
            <span
              className={`ml-1.5 text-xs font-semibold ${
                isCurrent ? 'text-[#5841EA]' : isCompleted ? 'text-emerald-600' : 'text-gray-400'
              }`}
            >
              {stage.label}
            </span>
            {idx < stages.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-8 rounded-full ${
                  isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
