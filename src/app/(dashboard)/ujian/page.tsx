'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { collection, getDocs, query, where } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, AlertCircle, Loader2, Shield, Brain, Clock, RotateCcw, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HistoryRow {
  id: string;
  title: string;
  status: string;
  score: number | null;
  maxScore: number;
  at: number;
}

const toMs = (value: unknown): number => {
  const v = value as { toDate?: () => Date; _seconds?: number; seconds?: number } | null | undefined;
  if (!v) return 0;
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  const sec = v._seconds ?? v.seconds;
  return typeof sec === 'number' ? sec * 1000 : 0;
};

const UjianPage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'entry' | 'confirm'>('entry');
  const [scheduleInfo, setScheduleInfo] = useState<{ title: string; durationMinutes: number; totalQuestions: number; sessionId?: string; resumed?: boolean } | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const uid = user?.uid;
  const fetchHistory = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(query(collection(db, 'exam_sessions'), where('studentId', '==', uid)));
      const rows = snap.docs.map((d) => {
        const data = d.data();
        const custom = data.examType === 'custom' || data.examType === 'manual';
        return {
          id: d.id,
          title: (data.examTitle as string) || 'Ujian kelas',
          status: data.status as string,
          score: typeof data.numericScore === 'number' ? data.numericScore : null,
          maxScore: custom ? 100 : 120,
          at: toMs(data.completedAt) || toMs(data.startedAt),
        } as HistoryRow;
      });
      setHistory(rows.sort((a, b) => b.at - a.at));
    } catch {
      setHistory([]);
    }
  }, [uid]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useLivePoll(fetchHistory, 30_000);

  const handleValidate = async () => {
    if (!token.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/exam-sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ examToken: token.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (res.status === 409 && data.completed) {
        // Already completed, go straight to results
        router.push(`/ujian/${data.sessionId}/results`);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Token tidak valid');
        setLoading(false);
        return;
      }

      const isCustom = data.mode === 'custom' || data.mode === 'manual';

      if (data.resumed) {
        router.push(`/ujian/${data.sessionId}/session`);
        return;
      }

      setScheduleInfo({
        title: data.schedule.title,
        durationMinutes: data.schedule.durationMinutes,
        totalQuestions: isCustom
          ? (data.customQuestions?.length ?? 0)
          : (data.schedule.domainIds?.length || 0) * 3,
        sessionId: data.sessionId,
      });
      setStep('confirm');
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    }
    setLoading(false);
  };

  const handleStart = () => {
    if (scheduleInfo?.sessionId) {
      router.push(`/ujian/${scheduleInfo.sessionId}/session`);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {step === 'entry' ? (
          <>
            {/* Hero */}
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                <KeyRound size={32} />
              </div>
              <h1 className="mb-2 font-display text-2xl font-extrabold">Masuk Ujian</h1>
              <p className="text-sm text-white/70">Masukkan token ujian yang diberikan oleh gurumu</p>
            </div>

            {/* Token Input */}
            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-gray-700">Token Ujian</label>
              <input
                value={token}
                onChange={e => { setToken(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleValidate()}
                placeholder="Contoh: ABC123"
                maxLength={8}
                className="mb-4 w-full rounded-xl border border-gray-200 px-4 py-3 text-center font-mono text-2xl font-black tracking-widest text-violet-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <button
                onClick={handleValidate}
                disabled={loading || token.trim().length < 4}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3.5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-40 hover:bg-violet-700"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                {loading ? 'Memeriksa...' : 'Masuk Ujian'}
              </button>
            </div>

            {/* Rules */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Brain, text: 'Soal adaptif menyesuaikan kemampuanmu', color: 'text-violet-500 bg-violet-50' },
                { icon: Clock, text: 'Durasi mengikuti jadwal dari gurumu', color: 'text-blue-500 bg-blue-50' },
                { icon: RotateCcw, text: 'Backtrack diizinkan dalam tiap kompetensi', color: 'text-emerald-500 bg-emerald-50' },
                { icon: Shield, text: 'Jangan tinggalkan tab selama ujian', color: 'text-amber-500 bg-amber-50' },
              ].map((rule, i) => {
                const Icon = rule.icon;
                return (
                  <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${rule.color}`}>
                      <Icon size={16} />
                    </div>
                    <span className="text-xs text-gray-600">{rule.text}</span>
                  </div>
                );
              })}
            </div>

            {history.length > 0 && (
              <div className="mt-8">
                <h2 className="mb-3 text-sm font-bold text-gray-900">Riwayat ujian</h2>
                <div className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white shadow-sm">
                  {history.map((row) => {
                    const running = row.status === 'in_progress';
                    const done = row.status === 'completed' || row.status === 'flagged' || (row.status === 'timed_out' && row.score !== null);
                    return (
                      <button
                        key={row.id}
                        onClick={() => router.push(running ? `/ujian/${row.id}/session` : `/ujian/${row.id}/results`)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-800">{row.title}</p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {row.at ? new Date(row.at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                            {' · '}
                            {running ? 'Sedang berjalan' : done ? 'Selesai' : row.status === 'timed_out' ? 'Waktu habis' : 'Dihentikan'}
                          </p>
                        </div>
                        {done && row.score !== null && (
                          <p className="text-sm font-bold tabular-nums text-violet-700">{row.score}<span className="text-xs font-medium text-gray-400">/{row.maxScore}</span></p>
                        )}
                        <ChevronRight size={16} className="shrink-0 text-gray-300" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Confirmation */}
            <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
              <h2 className="mb-1 font-display text-xl font-extrabold">{scheduleInfo?.title}</h2>
              <p className="text-sm text-white/80">Token diverifikasi ✓</p>
            </div>

            <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">{scheduleInfo?.totalQuestions || 0}</p>
                  <p className="text-xs text-gray-500">Total Soal</p>
                </div>
                <div className="rounded-xl bg-gray-50 p-4 text-center">
                  <p className="text-2xl font-black text-gray-900">{scheduleInfo?.durationMinutes}</p>
                  <p className="text-xs text-gray-500">Menit</p>
                </div>
              </div>

              <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠ Setelah dimulai, ujian tidak bisa di-pause. Pastikan koneksi internet stabil.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('entry'); setScheduleInfo(null); }}
                  className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Kembali
                </button>
                <button
                  onClick={handleStart}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-sm hover:opacity-90"
                >
                  Mulai Sekarang
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default UjianPage;
