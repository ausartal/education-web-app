'use client';

import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Pencil, Trash2, X, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { AnswerKey } from '@/types/firestore';
import { TPDef, ExamQ, TIER_PATHS, ANSWER_KEYS, emptyForm } from './types';

const QuestionRenderer = dynamic(() => import('@/components/shared/QuestionRenderer'), { ssr: false });

export const TPItem: FC<{
  tp: TPDef; selected: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void;
  deleting: boolean; completenessColor: string; canEdit: boolean;
}> = ({ tp, selected, onSelect, onEdit, onDelete, deleting, completenessColor, canEdit }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative mx-2 mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 transition-colors ${selected ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${selected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {tp.code.replace('TP', '')}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-xs font-semibold ${selected ? 'text-violet-800' : 'text-gray-700'}`}>{tp.name}</p>
        <p className={`text-[10px] font-medium ${completenessColor}`}>
          {tp.isComplete ? `${tp.totalQuestions} soal` : `${tp.coveredPaths ?? 0}/7 tingkat · ${tp.totalQuestions} soal`}
        </p>
      </div>
      {canEdit && hovered && (
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
            <Pencil size={11} />
          </button>
          <button onClick={onDelete} disabled={deleting} className="rounded-md p-1 text-gray-400 hover:bg-rose-100 hover:text-rose-600 transition-colors">
            {deleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
          </button>
        </div>
      )}
    </div>
  );
};

export const QuestionCard: FC<{
  q: ExamQ; index: number; expanded: boolean;
  onToggle: () => void; onEdit: () => void; onDelete: () => void; canEdit: boolean;
}> = ({ q, index, expanded, onToggle, onEdit, onDelete, canEdit }) => {
  const tierInfo = TIER_PATHS.find(t => t.value === q.tierPath);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden"
    >
      <div
        className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors"
        onClick={onToggle}
      >
        {tierInfo && (
          <span className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${tierInfo.color}`}>
            {tierInfo.label}
          </span>
        )}
        <div className="flex-1 truncate text-sm text-gray-800"><QuestionRenderer content={q.stem} /></div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[10px] text-gray-400 sm:block">{q.cognitiveLevel}</span>
          {canEdit && (
            <>
              <button onClick={e => { e.stopPropagation(); onEdit(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-violet-50 hover:text-violet-600 transition-colors">
                <Pencil size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                <Trash2 size={13} />
              </button>
            </>
          )}
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div className="space-y-3 px-4 py-4">
              <div className="grid gap-1.5">
                {(['A', 'B', 'C', 'D', 'E'] as AnswerKey[]).map(key => {
                  if (!q.options[key]) return null;
                  const isCorrect = key === q.correctAnswer;
                  return (
                    <div key={key} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${isCorrect ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}>
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{key}</span>
                      <QuestionRenderer content={q.options[key]} className={isCorrect ? 'font-medium text-emerald-800' : 'text-gray-700'} />
                    </div>
                  );
                })}
              </div>
              {q.explanation && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-semibold">Pembahasan:</span> <QuestionRenderer content={q.explanation} />
                </div>
              )}
              <div className="flex items-center gap-3 text-[10px] text-gray-400">
                <span>Dipakai: {q.usageCount}×</span>
                {q.visibility && (
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${q.visibility === 'global' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                    {q.visibility === 'global' ? 'Public' : 'Private'}
                  </span>
                )}
                {q.approvalStatus === 'pending' && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-600">Menunggu Persetujuan</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const QuestionPreview: FC<{
  form: ReturnType<typeof emptyForm>;
  tierPaths: typeof TIER_PATHS;
}> = ({ form, tierPaths }) => {
  const tierInfo = tierPaths.find(t => t.value === form.tierPath);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* Header badges */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {tierInfo && (
            <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold ${tierInfo.color}`}>
              {tierInfo.label}
            </span>
          )}
          <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
            {form.cognitiveLevel}
          </span>
        </div>

        {/* Stem */}
        <div className="prose prose-sm prose-violet max-w-none mb-4">
          {form.stem.trim() ? (
            <QuestionRenderer content={form.stem} />
          ) : (
            <p className="text-gray-300 italic">Belum ada pertanyaan...</p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-2">
          {ANSWER_KEYS.map(key => {
            const text = form[`option${key}` as keyof typeof form] as string;
            if (!text.trim()) return null;
            const isCorrect = form.correctAnswer === key;
            return (
              <div
                key={key}
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${isCorrect ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-gray-50'}`}
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {key}
                </span>
                <span className={isCorrect ? 'font-medium text-emerald-800' : 'text-gray-700'}>
                  {text}
                </span>
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        {form.explanation.trim() && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1 text-xs font-semibold text-amber-700">Pembahasan:</p>
            <div className="prose prose-sm prose-amber max-w-none">
              <QuestionRenderer content={form.explanation} />
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-[10px] text-gray-400">
        Preview ini menampilkan soal seperti yang akan dilihat siswa saat ujian
      </p>
    </div>
  );
};

export const TooltipInfo: FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(v => !v)}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500 hover:bg-gray-300 transition-colors"
      >
        ?
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-56 rounded-lg bg-gray-900 px-3 py-2 text-[11px] leading-relaxed text-white shadow-lg z-50">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
};

export const Modal: FC<{ children: React.ReactNode; onClose: () => void; wide?: boolean }> = ({ children, onClose, wide }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}
  >
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      className={`relative w-full rounded-2xl bg-white p-6 shadow-2xl ${wide ? 'max-w-4xl max-h-[90vh] overflow-y-auto' : 'max-w-md'}`}
    >
      <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors">
        <X size={16} />
      </button>
      {children}
    </motion.div>
  </motion.div>
);

