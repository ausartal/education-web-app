'use client';

import { FC, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, Home, ArrowLeft, Loader2, Star, BookOpen, Target, Brain } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type {
  MASTPredikat,
  MASTConclusions,
  MASTStageResponse,
  MASTStageDifficulty,
} from '@/types/mast';

interface ResultsData {
  sessionId: string;
  finalScore: number;
  predikat: MASTPredikat;
  conclusions: MASTConclusions;
  stageResponses: MASTStageResponse[];
  stagePath: MASTStageDifficulty[];
  completedAt: unknown;
  anomalyFlags: string[];
}

const PREDIKAT_COLORS: Record<MASTPredikat, { bg: string; text: string; border: string; gradient: string }> = {
  Istimewa: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500 to-teal-500',
  },
  Unggul: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-cyan-500',
  },
  Madya: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    gradient: 'from-amber-500 to-orange-500',
  },
  Semenjana: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    gradient: 'from-orange-500 to-red-400',
  },
  Terbatas: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    gradient: 'from-red-500 to-pink-500',
  },
};

const PREDIKAT_PERINGKAT: Record<MASTPredikat, number> = {
  Istimewa: 1,
  Unggul: 2,
  Madya: 3,
  Semenjana: 4,
  Terbatas: 5,
};

const DIFFICULTY_LABEL: Record<string, string> = {
  low: 'Mudah',
  medium: 'Sedang',
  high: 'Sulit',
};

const ResultsPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchResults = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/mast/sessions/${sessionId}/results`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 409) {
            setError('Ujian belum selesai. Silakan lanjutkan ujian terlebih dahulu.');
          } else {
            setError('Hasil ujian tidak ditemukan.');
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setResults(data);
      } catch {
        setError('Gagal memuat hasil ujian.');
      }
      setLoading(false);
    };

    fetchResults();
  }, [user, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">{error || 'Hasil tidak ditemukan.'}</p>
        <button
          onClick={() => router.push('/exam')}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  const { finalScore, predikat, conclusions, stageResponses, stagePath } = results;
  const colors = PREDIKAT_COLORS[predikat];
  const peringkat = PREDIKAT_PERINGKAT[predikat];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ── Score Header ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`mb-8 rounded-3xl bg-gradient-to-br ${colors.gradient} p-8 text-center text-white shadow-lg`}
      >
        <Trophy size={40} className="mx-auto mb-3 opacity-90" />
        <p className="mb-1 text-sm font-medium text-white/70">Hasil Ujian MAST</p>
        <p className="font-display text-7xl font-black">{finalScore}</p>
        <p className="text-lg text-white/80">/ 100</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">
            <Star size={14} />
            {predikat}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold">
            Peringkat {peringkat}
          </span>
        </div>
      </motion.div>

      {/* ── 4 Simpulan Cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 grid gap-4 sm:grid-cols-2"
      >
        {/* Overall */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${colors.bg}`}>
              <Trophy size={16} className={colors.text} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Simpulan Keseluruhan</h3>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.bg} ${colors.text}`}>
                {predikat}
              </span>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-gray-600">{conclusions.overall.description}</p>
        </div>

        {/* Knowing */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50">
              <BookOpen size={16} className="text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Knowing</h3>
              <span className="text-lg font-black text-violet-700">{conclusions.knowing.score}%</span>
            </div>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${conclusions.knowing.score}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-full rounded-full bg-violet-500"
            />
          </div>
          <p className="text-xs leading-relaxed text-gray-500">{conclusions.knowing.description}</p>
        </div>

        {/* Applying */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50">
              <Target size={16} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Applying</h3>
              <span className="text-lg font-black text-blue-700">{conclusions.applying.score}%</span>
            </div>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${conclusions.applying.score}%` }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-full rounded-full bg-blue-500"
            />
          </div>
          <p className="text-xs leading-relaxed text-gray-500">{conclusions.applying.description}</p>
        </div>

        {/* Reasoning */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100 sm:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50">
              <Brain size={16} className="text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Reasoning</h3>
              <span className="text-lg font-black text-emerald-700">{conclusions.reasoning.score}%</span>
            </div>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${conclusions.reasoning.score}%` }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
          <p className="text-xs leading-relaxed text-gray-500">{conclusions.reasoning.description}</p>
        </div>
      </motion.div>

      {/* ── Stage Path Visualization ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-stone-100"
      >
        <h3 className="mb-4 text-sm font-bold text-gray-900">Jalur Ujian</h3>
        <div className="space-y-3">
          {stageResponses.map((sr, i) => {
            const isLast = i === stageResponses.length - 1;
            const nextDiff = !isLast ? stageResponses[i + 1]?.stageDifficulty : null;
            const passed = sr.passed;

            return (
              <div key={i} className="flex items-center gap-3">
                {/* Stage number */}
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                    passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {sr.stageNumber}
                </div>

                {/* Stage info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      Stage {sr.stageNumber}: {DIFFICULTY_LABEL[sr.stageDifficulty]}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        passed ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {sr.totalCorrect}/12
                    </span>
                  </div>
                  <div className="mt-1 flex gap-3 text-[10px] text-gray-400">
                    <span>K: {sr.knowingCorrect}/4</span>
                    <span>A: {sr.applyingCorrect}/4</span>
                    <span>R: {sr.reasoningCorrect}/4</span>
                  </div>
                </div>

                {/* Arrow to next */}
                {!isLast && (
                  <div className="flex items-center gap-1 text-xs font-semibold text-gray-400">
                    {passed ? (
                      <span className="text-emerald-500">Naik</span>
                    ) : (
                      <span className="text-amber-500">Turun</span>
                    )}
                    <span className="text-gray-300">→</span>
                    <span className="text-gray-500">{DIFFICULTY_LABEL[nextDiff || '']}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex gap-3"
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
        >
          <Home size={16} /> Dashboard
        </button>
        <button
          onClick={() => router.push('/exam')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> Ujian Lain
        </button>
      </motion.div>
    </div>
  );
};

export default ResultsPage;
