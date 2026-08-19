'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import { KPSComplexTF as KPSComplexTFType } from '@/types/kps';
import QuestionRenderer from '@/components/shared/QuestionRenderer';
import { CheckCircle, XCircle } from 'lucide-react';

interface Props {
  question: KPSComplexTFType & { id: string };
  answers: Record<string, boolean>;
  onSelect: (answers: Record<string, boolean>) => void;
  disabled?: boolean;
}

export const KPSComplexTF: FC<Props> = ({ question, answers, onSelect, disabled }) => {
  const setAnswer = (stmtId: string, value: boolean) => {
    if (disabled) return;
    onSelect({ ...answers, [stmtId]: value });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <QuestionRenderer content={question.stem} />
        <p className="mt-2 text-xs font-medium text-[#5841EA]">
          Tentukan Benar atau Salah untuk setiap pernyataan
        </p>
      </div>
      <div className="space-y-3">
        {question.statements.map((stmt, idx) => (
          <motion.div
            key={stmt.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="mb-3 text-sm text-gray-800">
              <span className="mr-2 font-bold text-[#5841EA]">{idx + 1}.</span>
              {stmt.text}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setAnswer(stmt.id, true)}
                disabled={disabled}
                className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                  answers[stmt.id] === true
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-100 bg-white text-gray-400 hover:border-emerald-200'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <CheckCircle size={16} />
                Benar
              </button>
              <button
                onClick={() => setAnswer(stmt.id, false)}
                disabled={disabled}
                className={`flex items-center gap-1.5 rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all ${
                  answers[stmt.id] === false
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-100 bg-white text-gray-400 hover:border-rose-200'
                } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <XCircle size={16} />
                Salah
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
