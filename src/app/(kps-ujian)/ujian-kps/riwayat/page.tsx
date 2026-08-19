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
import { ArrowLeft, Trophy, Calendar, Target, ChevronDown, ChevronUp, Inbox } from 'lucide-react';

interface HistorySession {
  id: string;
  completedAt: string | null;
  finalLevel: KPSDifficultyLevel;
  numericScore: number;
  totalCorrect: number;
  totalQuestions: number;
  indicatorScores: Record<KPSIndicator, number> | null;
}

const LEVEL_GRADIENTS: Record<KPSDifficultyLevel, string> = {
  tetap_tinggi: 'from-emerald-500 to-teal-500',
  tinggi: 'from-blue-500 to-cyan-500',
  menengah_lebih_tinggi: 'from-indigo-500 to-blue-500',
  menengah: 'from-violet-500 to-indigo-500',
  menengah_lebih_rendah: 'from-amber-500 to-orange-500',
  rendah: 'from-orange-500 to-red-400',
  tetap_rendah: 'from-rose-500 to-pink-500',
};

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

const KPSRiwayatPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchHistory = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/kps/history', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) { const data = await res.json(); setSessions(data.sessions || []); }
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f5f2]">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 lg:px-8">
          <button onClick={() => router.push('/ujian-kps')} className="flex items-center gap-1.5 text-sm font-semibold text-stone-500 hover:text-violet-600">
            <ArrowLeft size={15} /> Kembali
          </button>
          <span className="font-display text-sm font-extrabold text-stone-800">Riwayat Ujian KPS</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 lg:px-8">
        {sessions.length === 0 ? (
          <motion.div {...fade(0)} className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-stone-100">
              <Inbox size={40} className="text-stone-300" />
            </div>
            <h2 className="font-display text-lg font-extrabold text-stone-700">Belum Ada Riwayat</h2>
            <p className="mt-1 text-sm text-stone-400">Kamu belum pernah mengikuti ujian KPS</p>
            <button
              onClick={() => router.push('/ujian-kps')}
              className="mt-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5"
            >
              Mulai Ujian
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, idx) => {
              const colors = KPS_LEVEL_COLORS[session.finalLevel];
              const label = KPS_LEVEL_LABELS[session.finalLevel];
              const gradient = LEVEL_GRADIENTS[session.finalLevel];
              const isExpanded = expandedId === session.id;
              const percentage = Math.round((session.totalCorrect / session.totalQuestions) * 100);

              return (
                <motion.div key={session.id} {...fade(idx * 0.05)}>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100/80 transition-all hover:shadow-md">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      className="flex w-full items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-sm`}>
                          <Trophy size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="font-display text-sm font-extrabold text-stone-800">{label}</p>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-stone-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={11} />
                              {session.completedAt ? new Date(session.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Target size={11} />
                              Skor: {session.numericScore}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-display text-lg font-extrabold text-stone-800">{session.totalCorrect}/{session.totalQuestions}</span>
                          <p className="text-[11px] text-stone-400">{percentage}% akurasi</p>
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-stone-300" /> : <ChevronDown size={16} className="text-stone-300" />}
                      </div>
                    </button>

                    {isExpanded && session.indicatorScores && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="border-t border-stone-100 px-5 pb-5 pt-4"
                      >
                        <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Skor per Indikator</p>
                        <div className="space-y-2.5">
                          {Object.entries(session.indicatorScores).map(([key, score]) => (
                            <div key={key} className="flex items-center gap-3">
                              <span className="w-44 text-xs font-medium text-stone-500">
                                {KPS_INDICATOR_LABELS[key as KPSIndicator]}
                              </span>
                              <div className="flex-1">
                                <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${score}%` }} />
                                </div>
                              </div>
                              <span className="w-9 text-right text-[11px] font-bold text-violet-600">{score}%</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => router.push(`/ujian-kps/${session.id}/results`)}
                          className="mt-4 w-full rounded-xl bg-stone-50 py-2.5 text-center text-xs font-bold text-violet-600 transition-colors hover:bg-violet-50"
                        >
                          Lihat Detail Lengkap
                        </button>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default KPSRiwayatPage;
