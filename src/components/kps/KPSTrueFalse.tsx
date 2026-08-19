'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { KPSTrueFalse as KPSTFType } from '@/types/kps';
import QuestionRenderer from '@/components/shared/QuestionRenderer';
import { CheckCircle, XCircle } from 'lucide-react';

interface Props {
  question: KPSTFType & { id: string };
  selectedAnswer: boolean | null;
  onSelect: (answer: boolean) => void;
  disabled?: boolean;
}

export const KPSTrueFalse: FC<Props> = ({ question, selectedAnswer, onSelect, disabled }) => {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <QuestionRenderer content={question.stem} />
        {question.statement && (
          <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm italic text-gray-700">
            &ldquo;{question.statement}&rdquo;
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => !disabled && onSelect(true)}
          disabled={disabled}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all ${
            selectedAnswer === true
              ? 'border-emerald-500 bg-emerald-50 shadow-md shadow-emerald-500/10'
              : 'border-gray-100 bg-white hover:border-emerald-200 hover:shadow-sm'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <CheckCircle
            size={32}
            className={selectedAnswer === true ? 'text-emerald-600' : 'text-gray-300'}
          />
          <span className={`text-lg font-bold ${selectedAnswer === true ? 'text-emerald-700' : 'text-gray-500'}`}>
            Benar
          </span>
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          onClick={() => !disabled && onSelect(false)}
          disabled={disabled}
          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-6 transition-all ${
            selectedAnswer === false
              ? 'border-rose-500 bg-rose-50 shadow-md shadow-rose-500/10'
              : 'border-gray-100 bg-white hover:border-rose-200 hover:shadow-sm'
          } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          <XCircle
            size={32}
            className={selectedAnswer === false ? 'text-rose-600' : 'text-gray-300'}
          />
          <span className={`text-lg font-bold ${selectedAnswer === false ? 'text-rose-700' : 'text-gray-500'}`}>
            Salah
          </span>
        </motion.button>
      </div>
    </div>
  );
};
