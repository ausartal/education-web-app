'use client';

import { FC, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  KPSExamSession,
  KPSDifficultyLevel,
  KPSIndicator,
  KPS_LEVEL_LABELS,
  KPS_LEVEL_COLORS,
  KPS_INDICATOR_LABELS,
} from '@/types/kps';
import { KPSIndicatorRadar } from '@/components/kps/KPSIndicatorRadar';
import { History, RotateCcw, LayoutDashboard, ArrowLeft, Trophy, Target, BarChart3, AlertTriangle } from 'lucide-react';

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

const KPSResultsPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<KPSExamSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchResults = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/kps/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { setError('Hasil ujian tidak ditemukan'); setLoading(false); return; }
        setSession(await res.json());
        setLoading(false);
      } catch { setError('Gagal memuat hasil ujian'); setLoading(false); }
    };
    fetchResults();
  }, [user, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5f2]">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5f2]">
        <div className="text-center">
          <p className="mb-4 text-sm text-stone-500">{error || 'Data tidak ditemukan'}</p>
          <button onClick={() => router.push('/ujian-kps')} className="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/50">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const stageResponses = session.stageResponses || [];
  const totalCorrect = stageResponses.reduce((sum: number, sr: { correctCount: number }) => sum + sr.correctCount, 0);
  const finalLevel = session.finalLevel as KPSDifficultyLevel;
  const levelLabel = KPS_LEVEL_LABELS[finalLevel];
  const levelColors = KPS_LEVEL_COLORS[finalLevel];
  const gradient = LEVEL_GRADIENTS[finalLevel] || 'from-violet-500 to-indigo-500';
  const percentage = Math.round((totalCorrect / 21) * 100);

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:px-8">
          <button onClick={() => router.push('/ujian-kps')} className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-violet-600">
            <ArrowLeft size={15} /> Kembali
          </button>
          <span className="font-display text-sm font-extrabold text-stone-800">Hasil Ujian KPS</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        {/* Score Hero */}
        <motion.div {...fade(0)} className="mb-8">
          <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${gradient} p-8 shadow-xl lg:p-12`}>
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />

            <div className="relative text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Trophy size={32} className="text-white" />
              </div>
              <p className="text-sm font-medium text-white/70">Level Kamu</p>
              <h1 className="mt-1 font-display text-3xl font-extrabold text-white lg:text-4xl">{levelLabel}</h1>

              <div className="mt-6 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="font-display text-3xl font-extrabold text-white">{session.numericScore || 0}</p>
                  <p className="text-xs text-white/60">Skor</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                  <p className="font-display text-3xl font-extrabold text-white">{totalCorrect}/21</p>
                  <p className="text-xs text-white/60">Benar</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="text-center">
                  <p className="font-display text-3xl font-extrabold text-white">{percentage}%</p>
                  <p className="text-xs text-white/60">Akurasi</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mx-auto mt-6 max-w-xs">
                <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Stage Breakdown */}
          <div className="lg:col-span-3 space-y-6">
            {/* Stage Cards */}
            <motion.div {...fade(0.1)}>
              <h3 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider text-stone-400">Breakdown per Tahap</h3>
              <div className="space-y-3">
                {stageResponses.map((sr: { stage: number; path: string | null; correctCount: number; score: number }) => (
                  <div key={sr.stage} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100/80">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-display text-sm font-extrabold text-stone-800">Tahap {sr.stage}</span>
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
                        <div key={qi} className={`h-9 w-9 rounded-xl text-xs font-bold flex items-center justify-center ${
                          qi < sr.correctCount ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'
                        }`}>
                          {qi < sr.correctCount ? '✓' : '✗'}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2.5 text-xs text-stone-400">
                      {sr.correctCount}/7 benar — Skor: <span className="font-bold text-stone-600">{sr.score}</span>
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Indicator Details — Admin only */}
            {isAdmin && session.indicatorScores && (
              <motion.div {...fade(0.2)}>
                <h3 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider text-stone-400">Skor per Indikator</h3>
                <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100/80">
                  <div className="space-y-3">
                    {Object.entries(session.indicatorScores).map(([key, score]) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-44 text-[13px] font-medium text-stone-600">
                          {KPS_INDICATOR_LABELS[key as KPSIndicator]}
                        </span>
                        <div className="flex-1">
                          <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              transition={{ duration: 0.8, delay: 0.3 }}
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                            />
                          </div>
                        </div>
                        <span className="w-10 text-right text-xs font-bold text-violet-600">{score as number}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Radar + Actions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Radar Chart — Admin only */}
            {isAdmin && session.indicatorScores && (
              <motion.div {...fade(0.15)}>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
                  <h3 className="mb-4 font-display text-sm font-extrabold uppercase tracking-wider text-stone-400">Profil KPS</h3>
                  <KPSIndicatorRadar scores={session.indicatorScores as Record<KPSIndicator, number>} size={260} />
                </div>
              </motion.div>
            )}

            {/* Student: Menunggu Review */}
            {!isAdmin && (
              <motion.div {...fade(0.15)}>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
                  <h3 className="mb-2 font-display text-sm font-extrabold text-stone-800">Menunggu Review</h3>
                  <p className="text-sm text-stone-400">
                    Hasil ujian Anda sedang dalam proses review oleh admin. Skor dan level akhir akan diinformasikan setelah review selesai.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Anomaly Warning */}
            {session.anomalyFlags && session.anomalyFlags.length > 0 && (
              <motion.div {...fade(0.25)}>
                <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <div className="flex gap-3">
                    <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-500" />
                    <p className="text-xs text-amber-700">
                      <span className="font-bold">Catatan:</span> Ujian ini ditandai karena {session.anomalyFlags.join(', ')}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Action Buttons */}
            <motion.div {...fade(0.3)}>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/ujian-kps')}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <RotateCcw size={16} /> Ujian Baru
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => router.push('/ujian-kps/riwayat')}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600 transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md"
                  >
                    <History size={14} /> Riwayat
                  </button>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center justify-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-600 transition-all hover:-translate-y-0.5 hover:bg-stone-50 hover:shadow-md"
                  >
                    <LayoutDashboard size={14} /> Dashboard
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KPSResultsPage;
