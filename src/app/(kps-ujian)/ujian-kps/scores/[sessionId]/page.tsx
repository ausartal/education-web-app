'use client';

import { FC, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  ArrowLeft,
  Trophy,
  Target,
  Download,
  Printer,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Shield,
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

interface ScoreDetail {
  id: string;
  testId: string;
  score: number;
  level: string | null;
  totalCorrect: number;
  totalQuestions: number;
  sectionScores: Array<{ indicator: string; score: number; level: string }>;
  percentile: { national: number; institutional: number; global: number };
  stageResponses: Array<{ stage: number; path: string; correctCount: number; score: number }>;
  completedAt: string | null;
  status: string;
  anomalyFlags: string[];
}

const UKKBIScoreDetailPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ScoreDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchScore = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/kps/scores/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchScore();
  }, [user, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <p className="text-sm text-stone-500">Data tidak ditemukan</p>
        <button onClick={() => router.push('/ujian-kps/scores')} className="mt-4 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white">
          Kembali
        </button>
      </div>
    );
  }

  const level = data.level as KPSDifficultyLevel;
  const colors = level ? KPS_LEVEL_COLORS[level] : null;
  const label = level ? KPS_LEVEL_LABELS[level] : '-';
  const gradient = LEVEL_GRADIENTS[level] || 'from-violet-500 to-indigo-500';
  const percentage = Math.round((data.totalCorrect / data.totalQuestions) * 100);

  return (
    <div className="space-y-6">
      <motion.div {...fade(0)} className="flex items-center gap-3">
        <button onClick={() => router.push('/ujian-kps/scores')} className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Score Report</h1>
          <p className="text-xs text-stone-400 font-mono">{data.testId}</p>
        </div>
      </motion.div>

      {/* Overall Score Hero */}
      <motion.div {...fade(0.05)}>
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 shadow-xl`}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-white/5" />
          <div className="relative text-center">
            <p className="text-sm font-medium text-white/70">Skor Keseluruhan</p>
            <div className="mt-2 flex items-end justify-center gap-2">
              <span className="font-display text-6xl font-extrabold text-white">{data.score}</span>
              <span className="pb-3 text-lg text-white/60">/100</span>
            </div>
            {colors && (
              <span className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                {label}
              </span>
            )}
            <div className="mt-6 flex items-center justify-center gap-6 text-white/80">
              <div className="text-center">
                <p className="font-display text-2xl font-extrabold">{data.totalCorrect}/{data.totalQuestions}</p>
                <p className="text-xs text-white/50">Benar</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <p className="font-display text-2xl font-extrabold">{percentage}%</p>
                <p className="text-xs text-white/50">Akurasi</p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-center">
                <p className="font-display text-2xl font-extrabold">{data.completedAt ? new Date(data.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                <p className="text-xs text-white/50">Tanggal</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: Section Scores + Stages */}
        <div className="lg:col-span-3 space-y-6">
          {/* Section Scores */}
          {data.sectionScores.length > 0 && (
            <motion.div {...fade(0.1)}>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
                <h3 className="mb-4 font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Skor per Indikator</h3>
                <div className="space-y-3">
                  {data.sectionScores.map((section) => (
                    <div key={section.indicator} className="flex items-center gap-3">
                      <span className="w-48 text-[13px] font-medium text-stone-600">
                        {KPS_INDICATOR_LABELS[section.indicator as KPSIndicator] || section.indicator}
                      </span>
                      <div className="flex-1">
                        <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${section.score}%` }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                          />
                        </div>
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-violet-600">{section.score}%</span>
                      <span className="w-20 text-right text-[10px] text-stone-400">{section.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Stage Breakdown */}
          <motion.div {...fade(0.15)}>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
              <h3 className="mb-4 font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Breakdown per Tahap</h3>
              <div className="space-y-3">
                {data.stageResponses.map((sr) => (
                  <div key={sr.stage} className="rounded-2xl bg-stone-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-display text-sm font-extrabold text-stone-700">Tahap {sr.stage}</span>
                      {sr.path && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          sr.path === 'tinggi' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                          {sr.path === 'tinggi' ? 'Tinggi' : 'Rendah'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: 7 }).map((_, qi) => (
                        <div key={qi} className={`h-8 w-8 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                          qi < sr.correctCount ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-400'
                        }`}>
                          {qi < sr.correctCount ? '✓' : '✗'}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-stone-400">{sr.correctCount}/7 benar — Skor: <span className="font-bold text-stone-600">{sr.score}</span></p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right: Percentile + Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Percentile */}
          <motion.div {...fade(0.1)}>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
              <h3 className="mb-4 font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Percentile Rank</h3>
              <div className="space-y-3">
                {[
                  { label: 'Nasional', value: data.percentile.national, icon: Shield },
                  { label: 'Institusi', value: data.percentile.institutional, icon: Target },
                  { label: 'Global', value: data.percentile.global, icon: TrendingUp },
                ].map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.label} className="flex items-center gap-3 rounded-2xl bg-stone-50 p-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100">
                        <Icon size={16} className="text-violet-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-stone-400">{p.label}</p>
                        <p className="font-display text-xl font-extrabold text-stone-800">{p.value}<span className="text-sm text-stone-400">th</span></p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div {...fade(0.15)}>
            <div className="space-y-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl">
                <Download size={16} /> Unduh PDF
              </button>
              <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-6 py-3.5 text-sm font-bold text-stone-600 transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md">
                <Printer size={16} /> Cetak Laporan
              </button>
            </div>
          </motion.div>

          {/* Anomaly */}
          {data.anomalyFlags.length > 0 && (
            <motion.div {...fade(0.2)}>
              <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                <p className="text-xs font-bold text-amber-800">Catatan</p>
                <p className="mt-1 text-xs text-amber-600">Ujian ini ditandai: {data.anomalyFlags.join(', ')}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UKKBIScoreDetailPage;
