'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Lightbulb, Target, Check, Loader2, Search, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { MASTQuestion, MASTCognitiveDomain, MASTStageDifficulty } from '@/types/mast';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StageQuestionSelection {
  stage1: string[];
  stage2High: string[];
  stage2Low: string[];
  stage3High: string[];
  stage3Medium: string[];
  stage3Low: string[];
}

interface QuestionSelectorProps {
  value: StageQuestionSelection;
  onChange: (selection: StageQuestionSelection) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STAGE_BRANCHES = [
  { key: 'stage1' as const, label: 'Stage 1', difficulty: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'stage2High' as const, label: 'Stage 2', difficulty: 'High', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { key: 'stage2Low' as const, label: 'Stage 2', difficulty: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'stage3High' as const, label: 'Stage 3', difficulty: 'High', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { key: 'stage3Medium' as const, label: 'Stage 3', difficulty: 'Medium', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'stage3Low' as const, label: 'Stage 3', difficulty: 'Low', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
];

const DOMAIN_TABS: { key: MASTCognitiveDomain; label: string; icon: typeof Brain; color: string }[] = [
  { key: 'knowing', label: 'Knowing', icon: Brain, color: 'text-blue-600' },
  { key: 'applying', label: 'Applying', icon: Lightbulb, color: 'text-emerald-600' },
  { key: 'reasoning', label: 'Reasoning', icon: Target, color: 'text-violet-600' },
];

const QUESTIONS_PER_DOMAIN = 4;

// ── Component ──────────────────────────────────────────────────────────────────

export const QuestionSelector: FC<QuestionSelectorProps> = ({ value, onChange }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<MASTQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState(0);
  const [activeDomain, setActiveDomain] = useState<MASTCognitiveDomain>('knowing');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/mast-questions?status=all&limit=500', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat soal');
      const data = await res.json();
      setQuestions(data.questions ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const currentBranch = STAGE_BRANCHES[activeBranch];
  const currentKey = currentBranch.key;

  // Map branch key to difficulty
  const branchDifficulty: MASTStageDifficulty = currentKey.includes('High') ? 'high'
    : currentKey.includes('Low') ? 'low'
    : 'medium';

  // Filter questions for current domain + difficulty
  const availableQuestions = questions.filter(q =>
    q.cognitiveDomain === activeDomain &&
    q.stageDifficulty === branchDifficulty &&
    q.status === 'active' &&
    (searchQuery ? q.stem.toLowerCase().includes(searchQuery.toLowerCase()) : true)
  );

  // Currently selected questions for this branch
  const selectedIds = new Set(value[currentKey]);

  // Count selected per domain for this branch
  const selectedByDomain = {
    knowing: questions.filter(q => value[currentKey].includes(q.id) && q.cognitiveDomain === 'knowing').length,
    applying: questions.filter(q => value[currentKey].includes(q.id) && q.cognitiveDomain === 'applying').length,
    reasoning: questions.filter(q => value[currentKey].includes(q.id) && q.cognitiveDomain === 'reasoning').length,
  };

  const totalSelected = value[currentKey].length;

  const toggleQuestion = (questionId: string) => {
    const current = [...value[currentKey]];
    const idx = current.indexOf(questionId);

    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      // Check domain limit
      const q = questions.find(q => q.id === questionId);
      if (q) {
        const domainCount = current.filter(id => {
          const qq = questions.find(q => q.id === id);
          return qq?.cognitiveDomain === q.cognitiveDomain;
        }).length;
        if (domainCount >= QUESTIONS_PER_DOMAIN) return; // Max 4 per domain
      }
      current.push(questionId);
    }

    onChange({ ...value, [currentKey]: current });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
        <Brain size={24} className="mx-auto mb-3 text-stone-300" />
        <p className="text-sm font-semibold text-gray-500">Bank soal MSAT kosong</p>
        <p className="text-xs text-gray-400 mt-1">Tambah soal terlebih dahulu di halaman Bank Soal</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Branch Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {STAGE_BRANCHES.map((branch, idx) => {
          const count = value[branch.key].length;
          const isActive = idx === activeBranch;
          return (
            <button
              key={branch.key}
              type="button"
              onClick={() => setActiveBranch(idx)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-xs font-semibold transition-all ${
                isActive
                  ? `${branch.bg} ${branch.border} ${branch.color}`
                  : 'border-stone-200 text-stone-500 hover:border-stone-300'
              }`}
            >
              <span>{branch.label}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                isActive ? 'bg-white/60' : 'bg-stone-100'
              }`}>
                {branch.difficulty}
              </span>
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                count === 12 ? 'bg-emerald-500 text-white' : isActive ? 'bg-white/60' : 'bg-stone-100'
              }`}>
                {count}/12
              </span>
            </button>
          );
        })}
      </div>

      {/* Domain Tabs + Search */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {DOMAIN_TABS.map(dt => {
            const Icon = dt.icon;
            const count = selectedByDomain[dt.key];
            return (
              <button
                key={dt.key}
                type="button"
                onClick={() => setActiveDomain(dt.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  activeDomain === dt.key
                    ? `bg-white shadow-sm border border-stone-200 ${dt.color}`
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon size={12} /> {dt.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                  count >= QUESTIONS_PER_DOMAIN ? 'bg-emerald-500 text-white' : 'bg-stone-100'
                }`}>
                  {count}/{QUESTIONS_PER_DOMAIN}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari soal..."
            className="rounded-lg border border-stone-200 bg-white pl-7 pr-3 py-1.5 text-xs outline-none focus:border-indigo-400 w-48"
          />
        </div>
      </div>

      {/* Question List */}
      <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
        <div className="max-h-80 overflow-y-auto divide-y divide-stone-100">
          {availableQuestions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-gray-400">
                Tidak ada soal {activeDomain} dengan tingkat {branchDifficulty}
              </p>
            </div>
          ) : (
            availableQuestions.map(q => {
              const isSelected = selectedIds.has(q.id);
              const domainCount = selectedByDomain[q.cognitiveDomain];
              const isDisabled = !isSelected && domainCount >= QUESTIONS_PER_DOMAIN;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => !isDisabled && toggleQuestion(q.id)}
                  disabled={isDisabled}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/50'
                      : isDisabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-stone-50'
                  }`}
                >
                  <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 text-white'
                      : 'border-stone-300'
                  }`}>
                    {isSelected && <Check size={12} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 line-clamp-2">{q.stem}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {q.topic && <span className="text-[10px] text-gray-400">{q.topic}</span>}
                      <span className="text-[10px] text-emerald-600 font-semibold">Jawaban: {q.correctAnswer}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
        <div className="flex gap-4 text-[11px]">
          {STAGE_BRANCHES.map(b => (
            <span key={b.key} className={`font-semibold ${value[b.key].length === 12 ? 'text-emerald-600' : 'text-stone-400'}`}>
              {b.label} ({b.difficulty}): {value[b.key].length}/12
            </span>
          ))}
        </div>
        <span className="text-[11px] font-bold text-gray-600">
          Total: {Object.values(value).reduce((sum, arr) => sum + arr.length, 0)}/72
        </span>
      </div>
    </div>
  );
};
