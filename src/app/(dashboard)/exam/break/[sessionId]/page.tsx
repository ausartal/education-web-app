'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Coffee, Clock, ArrowRight, Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { MASTStageResult } from '@/types/mast';

interface BreakData {
  stageResult: MASTStageResult;
  break: {
    active: boolean;
    durationMinutes: number;
    endsAt: string;
  };
}

const BreakPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [breakData, setBreakData] = useState<BreakData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Load break data ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      // Check for cached break data from stage submit
      const cached = sessionStorage.getItem(`mast_break_${sessionId}`);
      if (cached) {
        sessionStorage.removeItem(`mast_break_${sessionId}`);
        const parsed = JSON.parse(cached) as BreakData;
        setBreakData(parsed);

        // Calculate time left from endsAt
        const endsAt = new Date(parsed.break.endsAt).getTime();
        const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
        setTimeLeft(remaining);
        setLoading(false);
        return;
      }

      // Fallback: fetch session to get break state
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/mast/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const sessionData = await res.json();

        // If not on_break anymore, redirect accordingly
        if (sessionData.status === 'in_progress') {
          router.push(`/exam/session/${sessionId}`);
          return;
        }
        if (sessionData.status === 'completed' || sessionData.status === 'flagged') {
          router.push(`/exam/results/${sessionId}`);
          return;
        }

        // Calculate time left from breakEndsAt
        let remaining = 0;
        if (sessionData.breakEndsAt) {
          const endsAt = new Date(sessionData.breakEndsAt).getTime();
          remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
          setTimeLeft(remaining);
        }

        // Build stage result from stageResponses
        const lastStageResponse = sessionData.stageResponses?.[sessionData.stageResponses.length - 1];
        if (lastStageResponse) {
          setBreakData({
            stageResult: {
              stageNumber: lastStageResponse.stageNumber,
              stageDifficulty: lastStageResponse.stageDifficulty,
              knowingCorrect: lastStageResponse.knowingCorrect,
              applyingCorrect: lastStageResponse.applyingCorrect,
              reasoningCorrect: lastStageResponse.reasoningCorrect,
              totalCorrect: lastStageResponse.totalCorrect,
              passed: lastStageResponse.passed,
              nextStageDifficulty: sessionData.currentStageDifficulty || null,
            },
            break: {
              active: true,
              durationMinutes: Math.ceil(remaining / 60) || 5,
              endsAt: sessionData.breakEndsAt,
            },
          });
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // ── Countdown timer ───────────────────────────────────────────────
  useEffect(() => {
    if (loading || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          // Auto-redirect when break ends
          router.push(`/exam/session/${sessionId}`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, timeLeft > 0]);

  // ── Poll session status (admin might skip break) ──────────────────
  const pollSession = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/mast/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const data = await res.json();

      // If admin skipped break or break ended, redirect immediately
      if (data.status === 'in_progress') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        router.push(`/exam/session/${sessionId}`);
      } else if (data.status === 'completed' || data.status === 'flagged') {
        if (pollRef.current) clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        router.push(`/exam/results/${sessionId}`);
      }
    } catch {
      // ignore polling errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  useEffect(() => {
    if (loading) return;

    pollRef.current = setInterval(pollSession, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loading, pollSession]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  const stageResult = breakData?.stageResult;
  const difficultyLabel: Record<string, string> = {
    low: 'Mudah',
    medium: 'Sedang',
    high: 'Sulit',
  };

  const nextDifficulty = stageResult?.nextStageDifficulty;
  const stageNum = stageResult?.stageNumber || 1;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

        {/* Hero */}
        <div className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"
          >
            <Coffee size={32} />
          </motion.div>
          <h1 className="mb-2 font-display text-2xl font-extrabold">Istirahat</h1>
          <p className="text-sm text-white/80">
            Stage {stageNum} telah selesai. Istirahatlah sejenak, minum air, dan bersiap untuk stage berikutnya.
          </p>
        </div>

        {/* Timer */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-stone-100 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Waktu Istirahat Tersisa
          </p>
          <div className="flex items-center justify-center gap-2">
            <Clock size={24} className="text-violet-500" />
            <span className="font-display text-5xl font-black tabular-nums text-gray-900">
              {timerStr}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / (breakData?.break.durationMinutes ?? 5) / 60) * 100}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>

        {/* Stage summary */}
        {stageResult && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              Ringkasan Stage {stageNum}
            </h3>

            <div className="mb-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-violet-50 p-3 text-center">
                <p className="text-lg font-black text-violet-700">
                  {stageResult.totalCorrect}/12
                </p>
                <p className="text-[10px] font-semibold text-violet-500">Total Benar</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-lg font-black text-blue-700">
                  {difficultyLabel[stageResult.stageDifficulty]}
                </p>
                <p className="text-[10px] font-semibold text-blue-500">Kesulitan</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-lg font-black text-emerald-700">
                  {stageResult.passed ? 'Lulus' : 'Tidak'}
                </p>
                <p className="text-[10px] font-semibold text-emerald-500">Status</p>
              </div>
            </div>

            {/* Cognitive breakdown */}
            <div className="space-y-2">
              {[
                { label: 'Knowing', value: stageResult.knowingCorrect, color: 'bg-violet-500' },
                { label: 'Applying', value: stageResult.applyingCorrect, color: 'bg-blue-500' },
                { label: 'Reasoning', value: stageResult.reasoningCorrect, color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-20 text-xs font-semibold text-gray-500">{item.label}</span>
                  <div className="flex-1 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${(item.value / 4) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-bold text-gray-700">
                    {item.value}/4
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next stage info */}
        {nextDifficulty && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
                {stageResult?.passed ? (
                  <TrendingUp size={20} className="text-violet-500" />
                ) : (
                  <TrendingDown size={20} className="text-amber-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Stage {stageNum + 1}: {difficultyLabel[nextDifficulty]}
                </p>
                <p className="text-xs text-gray-500">
                  {stageResult?.passed
                    ? 'Kamu naik ke tingkat kesulitan berikutnya!'
                    : 'Tetap semangat! Kamu akan lanjut di tingkat yang sesuai.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
          <p className="text-sm text-amber-800">
            <strong>Tips:</strong> Gunakan waktu istirahat ini untuk meregangkan badan, minum air, dan
            menyegarkan pikiran. Ujian akan berlanjut otomatis setelah waktu habis.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default BreakPage;
