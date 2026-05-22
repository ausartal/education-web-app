'use client';

import { FC, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy,
  Clock,
  Target,
  Brain,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { getExamSession } from '@/services/exam';
import { ExamSession, ConfidenceLabel, Difficulty } from '@/types/firestore';

const proficiencyColors = {
  rendah: 'from-rose-500 to-pink-500',
  sedang: 'from-amber-500 to-orange-500',
  tinggi: 'from-emerald-500 to-teal-500',
  sangat_tinggi: 'from-violet-500 to-indigo-500',
};

const proficiencyLabels = {
  rendah: 'Rendah',
  sedang: 'Sedang',
  tinggi: 'Tinggi',
  sangat_tinggi: 'Sangat Tinggi',
};

const confidenceColors: Record<ConfidenceLabel, string> = {
  mahir: '#10B981',
  paham_lambat: '#F59E0B',
  tebak: '#EF4444',
  tidak_paham: '#6B7280',
};

const confidenceLabelsMap: Record<ConfidenceLabel, string> = {
  mahir: 'Mahir',
  paham_lambat: 'Paham Lambat',
  tebak: 'Tebak',
  tidak_paham: 'Tidak Paham',
};

const ResultsPage: FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session');
  const [session, setSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetch = async () => {
      const data = await getExamSession(sessionId);
      setSession(data);
      setLoading(false);
    };
    fetch();
  }, [sessionId]);

  if (loading || !session?.result) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const { result, responses } = session;
  const correctCount = responses.filter((r) => r.isCorrect).length;
  const totalTime = responses.reduce((acc, r) => acc + r.timeSpent, 0);
  const percentage = Math.round(result.accuracy * 100);

  // Difficulty path data for chart
  const difficultyMap: Record<Difficulty, number> = {
    easy: 1,
    moderate: 2,
    hard: 3,
  };
  const difficultyPath = responses.map((r) => difficultyMap[r.difficulty]);

  // Confidence distribution
  const confDist = result.confidenceDistribution;
  const confTotal = Object.values(confDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`mb-8 rounded-3xl bg-gradient-to-r ${proficiencyColors[result.proficiencyLevel]} p-8 text-center text-white shadow-lg`}
      >
        <Trophy size={40} className="mx-auto mb-3" />
        <h1 className="mb-1 font-display text-3xl font-extrabold">
          Exam Complete!
        </h1>
        <p className="text-lg text-white/80">
          Proficiency:{' '}
          <span className="font-bold">
            {proficiencyLabels[result.proficiencyLevel]}
          </span>
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <Target size={20} className="mx-auto mb-2 text-primary" />
          <p className="text-2xl font-black text-gray-900">{percentage}%</p>
          <p className="text-xs text-gray-500">Accuracy</p>
        </div>
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <Brain size={20} className="mx-auto mb-2 text-violet-500" />
          <p className="text-2xl font-black text-gray-900">
            {correctCount}/{responses.length}
          </p>
          <p className="text-xs text-gray-500">Correct</p>
        </div>
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <Clock size={20} className="mx-auto mb-2 text-amber-500" />
          <p className="text-2xl font-black text-gray-900">
            {Math.round(totalTime / 60)}m
          </p>
          <p className="text-xs text-gray-500">Time</p>
        </div>
        <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
          <Trophy size={20} className="mx-auto mb-2 text-emerald-500" />
          <p className="text-2xl font-black text-gray-900">
            {result.finalTheta.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500">Theta</p>
        </div>
      </motion.div>

      {/* Difficulty Path Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 rounded-3xl bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 font-display text-sm font-bold text-gray-900">
          Difficulty Path
        </h3>
        <div className="flex items-end gap-1">
          {difficultyPath.map((level, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`w-full rounded-md transition-all ${
                  level === 3
                    ? 'bg-rose-400'
                    : level === 2
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                }`}
                style={{ height: `${level * 20}px` }}
              />
              <span className="text-[9px] text-gray-400">{i + 1}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-emerald-400" /> Easy
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-amber-400" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-rose-400" /> Hard
          </span>
        </div>
      </motion.div>

      {/* Confidence Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8 rounded-3xl bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 font-display text-sm font-bold text-gray-900">
          Confidence Distribution
        </h3>
        <div className="space-y-3">
          {(Object.keys(confDist) as ConfidenceLabel[]).map((key) => (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-gray-600">
                  {confidenceLabelsMap[key]}
                </span>
                <span className="font-semibold text-gray-800">
                  {confDist[key]} (
                  {Math.round((confDist[key] / confTotal) * 100)}%)
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(confDist[key] / confTotal) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: confidenceColors[key] }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Per-question breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8 rounded-3xl bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 font-display text-sm font-bold text-gray-900">
          Per-Question Breakdown
        </h3>
        <div className="flex flex-wrap gap-2">
          {responses.map((r, i) => (
            <div
              key={i}
              className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                r.isCorrect
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-700'
              }`}
              title={`Q${i + 1}: ${r.difficulty} - ${r.isCorrect ? 'Correct' : 'Wrong'} (${r.timeSpent}s)`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
        >
          <ArrowLeft size={16} /> Dashboard
        </button>
        <button
          onClick={() => router.push('/ujian')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5"
        >
          <RotateCcw size={16} /> Retake
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;
