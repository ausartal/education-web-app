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
} from '@/types/kps';
import { KPSScoreCard } from '@/components/kps/KPSScoreCard';
import { KPSIndicatorRadar } from '@/components/kps/KPSIndicatorRadar';
import { History, RotateCcw, LayoutDashboard, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

const KPSResultsPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
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

        if (!res.ok) {
          setError('Hasil ujian tidak ditemukan');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setSession(data);
        setLoading(false);
      } catch {
        setError('Gagal memuat hasil ujian');
        setLoading(false);
      }
    };

    fetchResults();
  }, [user, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#5841EA] border-t-transparent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error || 'Data tidak ditemukan'}</p>
          <button
            onClick={() => router.push('/ujian-kps')}
            className="rounded-xl bg-[#5841EA] px-6 py-2 text-sm font-semibold text-white"
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const stageResponses = session.stageResponses || [];
  const totalCorrect = stageResponses.reduce(
    (sum: number, sr: { correctCount: number }) => sum + sr.correctCount,
    0,
  );

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
          <span className="text-sm font-bold text-gray-900">Hasil Ujian KPS</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Score Card */}
        <div className="mb-8">
          <KPSScoreCard
            finalLevel={session.finalLevel as KPSDifficultyLevel}
            numericScore={session.numericScore || 0}
            totalCorrect={totalCorrect}
            totalQuestions={21}
          />
        </div>

        {/* Stage Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="mb-4 text-lg font-bold text-gray-900">Breakdown per Tahap</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {stageResponses.map((sr: { stage: number; path: string | null; correctCount: number; score: number }, idx: number) => (
              <div
                key={sr.stage}
                className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Tahap {sr.stage}</span>
                  {sr.path && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      sr.path === 'tinggi' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {sr.path === 'tinggi' ? 'Tinggi' : 'Rendah'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 7 }).map((_, qi) => (
                    <div
                      key={qi}
                      className={`h-3 w-3 rounded-full ${
                        qi < sr.correctCount ? 'bg-emerald-400' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  {sr.correctCount}/7 benar — Skor: {sr.score}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Radar Chart */}
        {session.indicatorScores && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 text-lg font-bold text-gray-900">Profil KPS</h3>
            <KPSIndicatorRadar
              scores={session.indicatorScores as Record<KPSIndicator, number>}
              size={280}
            />
          </motion.div>
        )}

        {/* Anomaly Flags */}
        {session.anomalyFlags && session.anomalyFlags.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4"
          >
            <p className="text-sm font-semibold text-amber-800">
              Catatan: Ujian ini ditandai karena: {session.anomalyFlags.join(', ')}
            </p>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-wrap justify-center gap-3"
        >
          <button
            onClick={() => router.push('/ujian-kps/riwayat')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
          >
            <History size={16} />
            Riwayat
          </button>
          <button
            onClick={() => router.push('/ujian-kps')}
            className="flex items-center gap-2 rounded-xl bg-[#5841EA] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5841EA]/25 transition-all hover:-translate-y-0.5"
          >
            <RotateCcw size={16} />
            Ujian Baru
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </button>
        </motion.div>
      </main>
    </div>
  );
};

export default KPSResultsPage;
