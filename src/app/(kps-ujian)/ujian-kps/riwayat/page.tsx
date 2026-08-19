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
  ArrowLeft,
  Trophy,
  Calendar,
  Target,
  ChevronDown,
  ChevronUp,
  Inbox,
} from 'lucide-react';

interface HistorySession {
  id: string;
  completedAt: string | null;
  finalLevel: KPSDifficultyLevel;
  numericScore: number;
  totalCorrect: number;
  totalQuestions: number;
  indicatorScores: Record<KPSIndicator, number> | null;
}

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
        const res = await fetch('/api/kps/history', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setSessions(data.sessions || []);
        }
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5841EA] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8fc]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <button
            onClick={() => router.push('/ujian-kps')}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-[#5841EA]"
          >
            <ArrowLeft size={16} />
            Kembali
          </button>
          <span className="text-sm font-bold text-gray-900">Riwayat Ujian KPS</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <Inbox size={64} className="mb-4 text-gray-300" />
            <h2 className="mb-2 text-lg font-bold text-gray-700">Belum Ada Riwayat</h2>
            <p className="mb-6 text-sm text-gray-500">Kamu belum pernah mengikuti ujian KPS</p>
            <button
              onClick={() => router.push('/ujian-kps')}
              className="rounded-xl bg-[#5841EA] px-6 py-2.5 text-sm font-semibold text-white"
            >
              Mulai Ujian
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, idx) => {
              const colors = KPS_LEVEL_COLORS[session.finalLevel];
              const label = KPS_LEVEL_LABELS[session.finalLevel];
              const isExpanded = expandedId === session.id;

              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm"
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.bg}`}>
                        <Trophy size={24} className={colors.text} />
                      </div>
                      <div>
                        <p className={`text-lg font-bold ${colors.text}`}>{label}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {session.completedAt
                              ? new Date(session.completedAt).toLocaleDateString('id-ID', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })
                              : '-'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Target size={12} />
                            Skor: {session.numericScore}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-600">
                        {session.totalCorrect}/{session.totalQuestions}
                      </span>
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && session.indicatorScores && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="border-t border-gray-100 px-5 pb-5 pt-3"
                    >
                      <p className="mb-3 text-xs font-semibold text-gray-500">Skor per Indikator</p>
                      <div className="space-y-2">
                        {Object.entries(session.indicatorScores).map(([key, score]) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="w-48 text-xs text-gray-600">
                              {KPS_INDICATOR_LABELS[key as KPSIndicator]}
                            </span>
                            <div className="flex-1">
                              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                <div
                                  className="h-full rounded-full bg-[#5841EA]"
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                            </div>
                            <span className="w-10 text-right text-xs font-bold text-[#5841EA]">
                              {score}%
                            </span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => router.push(`/ujian-kps/${session.id}/results`)}
                        className="mt-4 w-full rounded-lg bg-gray-50 py-2 text-center text-sm font-semibold text-[#5841EA] transition-colors hover:bg-gray-100"
                      >
                        Lihat Detail Lengkap
                      </button>
                    </motion.div>
                  )}
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
