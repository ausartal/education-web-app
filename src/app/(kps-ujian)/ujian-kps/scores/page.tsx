'use client';

import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  KPS_LEVEL_LABELS,
  KPS_LEVEL_COLORS,
  KPSDifficultyLevel,
  KPS_INDICATOR_LABELS,
  KPSIndicator,
} from '@/types/kps';
import {
  BarChart3,
  Trophy,
  Calendar,
  Target,
  ChevronRight,
  Download,
  Printer,
  Inbox,
  Loader2,
  TrendingUp,
} from 'lucide-react';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

const LEVEL_GRADIENTS: Record<KPSDifficultyLevel, string> = {
  tetap_tinggi: 'from-emerald-500 to-teal-500',
  tinggi: 'from-blue-500 to-cyan-500',
  menengah_lebih_tinggi: 'from-indigo-500 to-blue-500',
  menengah: 'from-violet-500 to-indigo-500',
  menengah_lebih_rendah: 'from-amber-500 to-orange-500',
  rendah: 'from-orange-500 to-red-400',
  tetap_rendah: 'from-rose-500 to-pink-500',
};

interface ScoreItem {
  id: string;
  testId: string;
  score: number;
  level: string | null;
  indicatorScores: Record<string, number> | null;
  totalCorrect: number;
  totalQuestions: number;
  percentile: { national: number; institutional: number; global: number } | null;
  completedAt: string | null;
  status: string;
}

const UKKBIScoresPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [scores, setScores] = useState<ScoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchScores = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/kps/scores', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setScores(data.scores || []); }
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchScores();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div {...fade(0)}>
        <h1 className="font-display text-2xl font-extrabold text-stone-800">Score Reports</h1>
        <p className="mt-1 text-sm text-stone-400">Ringkasan hasil ujian KPS Anda</p>
      </motion.div>

      {scores.length === 0 ? (
        <motion.div {...fade(0.1)} className="flex flex-col items-center justify-center rounded-3xl bg-white py-16 shadow-sm ring-1 ring-gray-100/80">
          <Inbox size={48} className="mb-3 text-stone-300" />
          <h3 className="font-display text-lg font-extrabold text-stone-700">Belum Ada Skor</h3>
          <p className="mt-1 text-sm text-stone-400">Selesaikan ujian KPS untuk melihat skor</p>
          <button
            onClick={() => router.push('/ujian-kps')}
            className="mt-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/50"
          >
            Mulai Ujian
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {scores.map((score, idx) => {
            const level = score.level as KPSDifficultyLevel;
            const colors = level ? KPS_LEVEL_COLORS[level] : null;
            const label = level ? KPS_LEVEL_LABELS[level] : '-';
            const gradient = LEVEL_GRADIENTS[level] || 'from-violet-500 to-indigo-500';
            const percentage = Math.round((score.totalCorrect / score.totalQuestions) * 100);

            return (
              <motion.div key={score.id} {...fade(idx * 0.05)}>
                <button
                  onClick={() => router.push(`/ujian-kps/scores/${score.id}`)}
                  className="w-full rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80 text-left transition-all hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-sm`}>
                        <Trophy size={24} className="text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-3xl font-extrabold text-stone-800">{score.score}</span>
                          <span className="text-sm text-stone-400">/100</span>
                        </div>
                        {colors && (
                          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${colors.bg} ${colors.text}`}>
                            {label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs text-stone-400">{score.testId}</p>
                      <p className="mt-1 text-xs text-stone-400">
                        {score.completedAt ? new Date(score.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-xs text-stone-400">
                        <Target size={11} />
                        {score.totalCorrect}/{score.totalQuestions} benar ({percentage}%)
                      </div>
                    </div>
                  </div>

                  {/* Percentile */}
                  {score.percentile && (
                    <div className="mt-4 flex gap-3 border-t border-stone-100 pt-4">
                      {[
                        { label: 'Nasional', value: score.percentile.national },
                        { label: 'Institusi', value: score.percentile.institutional },
                        { label: 'Global', value: score.percentile.global },
                      ].map((p) => (
                        <div key={p.label} className="flex-1 rounded-xl bg-stone-50 px-3 py-2 text-center">
                          <p className="font-display text-lg font-extrabold text-stone-800">{p.value}<span className="text-xs text-stone-400">th</span></p>
                          <p className="text-[10px] text-stone-400">{p.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Indicator Preview */}
                  {score.indicatorScores && (
                    <div className="mt-4 flex gap-1.5">
                      {Object.entries(score.indicatorScores).map(([key, val]) => (
                        <div key={key} className="flex-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                              style={{ width: `${val}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-end gap-1 text-xs font-semibold text-violet-600">
                    Lihat Detail <ChevronRight size={12} />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UKKBIScoresPage;
