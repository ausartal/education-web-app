'use client';

import { FC, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Trophy, ArrowLeft, Home } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MSATExamSession } from '@/types/firestore';

const ResultsPage: FC = () => {
  const { examId: sessionId } = useParams<{ examId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<MSATExamSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    const fetchSession = async () => {
      const snap = await getDoc(doc(db, 'exam_sessions', sessionId));
      if (snap.exists()) setSession(snap.data() as MSATExamSession);
      setLoading(false);
    };
    fetchSession();
  }, [sessionId]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  if (!session) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-gray-500">Hasil ujian tidak ditemukan.</p>
      <button onClick={() => router.push('/dashboard')} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">
        Kembali ke Dashboard
      </button>
    </div>
  );

  const score = session.numericScore ?? 0;
  const total = 120;
  const pct = Math.round((score / total) * 100);
  const domains = session.domainResponses || [];
  const isCompleted = session.status === 'completed' || session.status === 'flagged';

  // Score color
  const scoreColor = score >= 96 ? 'from-emerald-500 to-teal-500'
    : score >= 72 ? 'from-blue-500 to-cyan-500'
    : score >= 48 ? 'from-amber-500 to-orange-500'
    : 'from-rose-500 to-pink-500';

  const scoreLabel = score >= 96 ? 'Sangat Baik'
    : score >= 72 ? 'Baik'
    : score >= 48 ? 'Cukup'
    : 'Perlu Ditingkatkan';

  if (!isCompleted) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">Ujian masih berlangsung atau belum selesai.</p>
        <button onClick={() => router.push(`/ujian/${sessionId}/session`)} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">
          Lanjutkan Ujian
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Score header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`mb-8 rounded-3xl bg-gradient-to-br ${scoreColor} p-8 text-center text-white shadow-lg`}
      >
        <Trophy size={40} className="mx-auto mb-3 opacity-90" />
        <p className="mb-1 text-sm font-medium text-white/70">Ujian Selesai</p>
        <p className="font-display text-6xl font-black">{score}</p>
        <p className="text-lg text-white/80">/ {total}</p>
        <div className="mt-3 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold">
          {scoreLabel}
        </div>
      </motion.div>

      {/* Per-question breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        <h3 className="mb-4 text-sm font-bold text-gray-900">Jawaban per Soal</h3>
        {domains.length === 0 ? (
          <p className="text-sm text-gray-400">Tidak ada data jawaban.</p>
        ) : (
          <div className="space-y-4">
            {domains.map((dr, di) => (
              <div key={di}>
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  Kompetensi {di + 1} — {dr.domainName}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[dr.tier1, dr.tier2, dr.tier3].map((tier, ti) => (
                    <div
                      key={ti}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold ${
                        tier?.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}
                      title={`Soal ${ti + 1}: ${tier?.isCorrect ? 'Benar' : 'Salah'} (Jawaban: ${tier?.selectedAnswer})`}
                    >
                      {ti + 1}
                    </div>
                  ))}
                  <div className={`flex h-10 items-center rounded-xl px-3 text-xs font-semibold ${
                    dr.cri === 'yakin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {dr.cri === 'yakin' ? 'Yakin' : 'Tdk Yakin'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Detail analisis pemahaman (Paham Konsep, Miskonsepsi, dll.) hanya tersedia untuk guru.
        </p>
      </motion.div>

      {/* Progress bar visual */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-gray-600">Skor Total</span>
          <span className="font-bold text-gray-900">{pct}%</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full rounded-full bg-gradient-to-r ${scoreColor}`}
          />
        </div>
        <div className="mt-3 flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>Rata-rata kelas tersedia di rekap guru</span>
          <span>120</span>
        </div>
      </motion.div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 py-4 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
        >
          <Home size={16} /> Dashboard
        </button>
        <button
          onClick={() => router.push('/ujian')}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5"
        >
          <ArrowLeft size={16} /> Ujian Lain
        </button>
      </div>
    </div>
  );
};

export default ResultsPage;
