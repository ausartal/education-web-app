'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { KPSMatching as KPSMatchingType } from '@/types/kps';
import QuestionRenderer from '@/components/shared/QuestionRenderer';

interface Props {
  question: KPSMatchingType & { id: string };
  matches: Record<string, string>;
  onSelect: (matches: Record<string, string>) => void;
  disabled?: boolean;
}

export const KPSMatching: FC<Props> = ({ question, matches, onSelect, disabled }) => {
  const setMatch = (premiseId: string, optionId: string) => {
    if (disabled) return;
    onSelect({ ...matches, [premiseId]: optionId });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <QuestionRenderer content={question.stem} />
        <p className="mt-2 text-xs font-medium text-[#5841EA]">
          Jodohkan setiap pernyataan di kolom kiri dengan pilihan yang tepat
        </p>
      </div>
      <div className="space-y-3">
        {question.premises.map((premise, idx) => (
          <motion.div
            key={premise.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="mb-3 text-sm font-medium text-gray-800">
              <span className="mr-2 font-bold text-[#5841EA]">{idx + 1}.</span>
              {premise.text}
            </p>
            <select
              value={matches[premise.id] || ''}
              onChange={(e) => setMatch(premise.id, e.target.value)}
              disabled={disabled}
              className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm transition-all ${
                matches[premise.id]
                  ? 'border-[#5841EA] bg-[#5841EA]/5 text-[#5841EA]'
                  : 'border-gray-200 bg-white text-gray-500'
              } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
            >
              <option value="">Pilih jawaban...</option>
              {question.matchingOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.text}
                </option>
              ))}
            </select>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
