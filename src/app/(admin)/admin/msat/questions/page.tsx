'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Search, Filter, Loader2, ChevronDown, Eye, Edit3,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface MSATQuestion {
  id: string;
  stem: string;
  difficulty: string;
  cognitiveDomain: string;
  cognitiveLevel: string;
  stage: number;
  tierPath: string;
  categoryLabel: string;
  topic: string;
  module: string;
  options: Record<string, string>;
  correctAnswer: string;
  status: string;
}

const DIFFICULTY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  sangat_mudah: { label: 'Sangat Mudah', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  mudah: { label: 'Mudah', color: 'text-green-700', bg: 'bg-green-50 ring-green-200' },
  sedang: { label: 'Sedang', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  sukar: { label: 'Sukar', color: 'text-orange-700', bg: 'bg-orange-50 ring-orange-200' },
  sangat_sukar: { label: 'Sangat Sukar', color: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' },
};

const DOMAIN_MAP: Record<string, { label: string; color: string; bg: string }> = {
  knowing: { label: 'Knowing', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  applying: { label: 'Applying', color: 'text-violet-700', bg: 'bg-violet-50 ring-violet-200' },
  reasoning: { label: 'Reasoning', color: 'text-pink-700', bg: 'bg-pink-50 ring-pink-200' },
};

const MsatQuestionsPage: FC = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<MSATQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/msat', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const filtered = questions.filter(q => {
    if (search && !q.stem.toLowerCase().includes(search.toLowerCase()) && !q.topic.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    if (filterDomain && q.cognitiveDomain !== filterDomain) return false;
    if (filterStage && q.stage !== Number(filterStage)) return false;
    return true;
  });

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={24} className="animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/msat" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Bank Soal MSAT</h1>
          <p className="text-xs text-stone-400">{questions.length} soal · {filtered.length} ditampilkan</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari soal atau topik..."
            className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <select value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 outline-none">
          <option value="">Semua Kesulitan</option>
          {Object.entries(DIFFICULTY_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 outline-none">
          <option value="">Semua Domain</option>
          {Object.entries(DOMAIN_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterStage} onChange={e => setFilterStage(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-600 outline-none">
          <option value="">Semua Stage</option>
          <option value="1">Stage 1</option>
          <option value="2">Stage 2</option>
          <option value="3">Stage 3</option>
        </select>
      </div>

      {/* Questions List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl bg-white py-12 text-center ring-1 ring-stone-100">
            <BookOpen size={24} className="mx-auto text-stone-300" />
            <p className="mt-2 text-sm text-stone-400">Tidak ada soal ditemukan</p>
          </div>
        ) : (
          filtered.map((q, i) => {
            const diff = DIFFICULTY_MAP[q.difficulty] ?? { label: q.difficulty, color: 'text-stone-600', bg: 'bg-stone-50 ring-stone-200' };
            const dom = DOMAIN_MAP[q.cognitiveDomain] ?? { label: q.cognitiveDomain, color: 'text-stone-600', bg: 'bg-stone-50 ring-stone-200' };
            const isExpanded = expandedId === q.id;

            return (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className="rounded-2xl bg-white ring-1 ring-stone-100"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-[10px] font-bold text-stone-500">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-[13px] font-medium text-stone-700">{q.stem}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${diff.bg} ${diff.color}`}>{diff.label}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ${dom.bg} ${dom.color}`}>{dom.label}</span>
                      <span className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] font-bold text-stone-500 ring-1 ring-stone-200">Stage {q.stage}</span>
                      {q.tierPath && <span className="rounded-md bg-stone-50 px-1.5 py-0.5 text-[10px] text-stone-400 ring-1 ring-stone-200">{q.tierPath}</span>}
                    </div>
                  </div>
                  <ChevronDown size={14} className={`mt-1 shrink-0 text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-100 px-4 py-3">
                    <div className="mb-3 space-y-1.5">
                      {Object.entries(q.options).map(([key, text]) => (
                        <div key={key} className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${key === q.correctAnswer ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-stone-50'}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold ${key === q.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-stone-200 text-stone-500'}`}>{key}</span>
                          <span className={key === q.correctAnswer ? 'font-medium text-emerald-700' : 'text-stone-600'}>{text}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-stone-400">
                      <span>Jawaban: <strong className="text-emerald-600">{q.correctAnswer}</strong></span>
                      {q.categoryLabel && <span>· {q.categoryLabel}</span>}
                      {q.cognitiveLevel && <span>· {q.cognitiveLevel}</span>}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MsatQuestionsPage;
