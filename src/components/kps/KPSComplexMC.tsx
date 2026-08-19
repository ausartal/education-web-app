'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { KPSComplexMC as KPSComplexMCType } from '@/types/kps';
import QuestionRenderer from '@/components/shared/QuestionRenderer';
import { Check } from 'lucide-react';

interface Props {
  question: KPSComplexMCType & { id: string };
  selectedAnswers: string[];
  onSelect: (answers: string[]) => void;
  disabled?: boolean;
}

export const KPSComplexMC: FC<Props> = ({ question, selectedAnswers, onSelect, disabled }) => {
  const toggle = (key: string) => {
    if (disabled) return;
    const next = selectedAnswers.includes(key)
      ? selectedAnswers.filter((k) => k !== key)
      : [...selectedAnswers, key];
    onSelect(next);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <QuestionRenderer content={question.stem} />
        <p className="mt-2 text-xs font-medium text-[#5841EA]">Pilih semua jawaban yang benar</p>
      </div>
      <div className="space-y-3">
        {Object.entries(question.options).map(([key, value], idx) => {
          const isSelected = selectedAnswers.includes(key);
          return (
            <motion.button
              key={key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => toggle(key)}
              disabled={disabled}
              className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#5841EA] bg-[#5841EA]/5 shadow-md shadow-[#5841EA]/10'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border-2 text-sm font-bold ${
                  isSelected
                    ? 'border-[#5841EA] bg-[#5841EA] text-white'
                    : 'border-gray-200 bg-white text-gray-400'
                }`}
              >
                {isSelected ? <Check size={16} /> : key}
              </span>
              <span className="flex-1 pt-0.5 text-sm">
                <QuestionRenderer content={value as string} />
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
