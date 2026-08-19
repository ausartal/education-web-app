'use client';

import { FC, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { KPSQuestionClient, KPS_CONFIG, KPS_INDICATOR_LABELS } from '@/types/kps';
import { KPSQuestionRenderer } from '@/components/kps/KPSQuestionRenderer';
import { KPSStageIndicator } from '@/components/kps/KPSStageIndicator';
import { KPSTimer } from '@/components/kps/KPSTimer';
import { KPSBreakScreen } from '@/components/kps/KPSBreakScreen';
import QuestionRenderer from '@/components/shared/QuestionRenderer';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Maximize,
  AlertTriangle,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface SessionInitData {
  sessionId: string;
  resumed: boolean;
  durationMinutes: number;
  currentStage: 1 | 2 | 3;
  stage2Path: 'tinggi' | 'rendah' | null;
  stimulus: { id: string; title: string; content: string } | null;
  questions: KPSQuestionClient[];
  timeLeftMs?: number;
}

const KPSSessionPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [stage2Path, setStage2Path] = useState<'tinggi' | 'rendah' | null>(null);
  const [stimulus, setStimulus] = useState<{ id: string; title: string; content: string } | null>(null);
  const [questions, setQuestions] = useState<KPSQuestionClient[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [timeLeftMs, setTimeLeftMs] = useState(KPS_CONFIG.totalDurationMinutes * 60 * 1000);
  const [isBreak, setIsBreak] = useState(false);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showFullscreenGate, setShowFullscreenGate] = useState(false);
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseStartRef = useRef<number>(Date.now());

  // Initialize session
  useEffect(() => {
    if (!user) return;

    const initSession = async () => {
      try {
        // Check sessionStorage for init data (from landing page)
        const initKey = `exam_init_${sessionId}`;
        const initDataStr = sessionStorage.getItem(initKey);

        if (initDataStr) {
          const data: SessionInitData = JSON.parse(initDataStr);
          setCurrentStage(data.currentStage || 1);
          setStage2Path(data.stage2Path || null);
          setStimulus(data.stimulus);
          setQuestions(data.questions || []);
          setTimeLeftMs(data.timeLeftMs || KPS_CONFIG.totalDurationMinutes * 60 * 1000);
          sessionStorage.removeItem(initKey);
          setLoading(false);
          return;
        }

        // Resume: fetch session data, then fetch questions for current stage
        const token = await user.getIdToken();
        const res = await fetch(`/api/kps/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setError('Session tidak ditemukan');
          setLoading(false);
          return;
        }

        const data = await res.json();

        // If already completed, redirect to results
        if (data.status !== 'in_progress') {
          router.push(`/ujian-kps/${sessionId}/results`);
          return;
        }

        setCurrentStage(data.currentStage || 1);
        setStage2Path(data.stage2Path || null);
        setCompletedStages(
          (data.stageResponses || []).map((sr: { stage: number }) => sr.stage)
        );

        // Calculate time left
        const startedAt = data.startedAt ? new Date(data.startedAt).getTime() : Date.now();
        const durationMs = (data.durationMinutes || KPS_CONFIG.totalDurationMinutes) * 60 * 1000;
        const remaining = Math.max(0, startedAt + durationMs - Date.now());
        setTimeLeftMs(remaining);

        // Fetch questions for current stage via resume endpoint
        const resumeRes = await fetch(`/api/kps/sessions/${sessionId}/resume`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (resumeRes.ok) {
          const resumeData = await resumeRes.json();
          setStimulus(resumeData.stimulus);
          setQuestions(resumeData.questions || []);
        }

        setLoading(false);
      } catch (err) {
        console.error('Init session error:', err);
        setError('Gagal memuat sesi ujian');
        setLoading(false);
      }
    };

    initSession();
  }, [user, sessionId, router]);

  // Timer countdown
  useEffect(() => {
    if (loading || isBreak) return;

    timerRef.current = setInterval(() => {
      setTimeLeftMs((prev) => {
        if (prev <= 1000) {
          handleTimeUp();
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isBreak]);

  // Fullscreen detection
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !loading) {
        setShowFullscreenGate(true);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [loading]);

  // Tab switch detection
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && !loading && !isBreak) {
        setTabWarningCount((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            // Auto-flag
            addToast('error', 'Ujian ditandai karena terlalu banyak berpindah tab');
          }
          return next;
        });
        setShowTabWarning(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [loading, isBreak, addToast]);

  // Online/offline detection
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // beforeunload handler
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // Back button lock — push state and intercept popstate
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const onPopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleTimeUp = useCallback(async () => {
    addToast('error', 'Waktu habis! Jawaban otomatis dikumpulkan.');
    await handleCompleteExam();
  }, []);

  const handleEnterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setShowFullscreenGate(false);
    } catch {
      // Fullscreen not supported
      setShowFullscreenGate(false);
    }
  };

  const handleAnswer = (questionId: string, answer: Record<string, unknown>) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitStage = async () => {
    if (!user) return;

    // Guard: questions must be loaded
    if (questions.length === 0) {
      addToast('error', 'Soal belum dimuat. Silakan refresh halaman.');
      return;
    }

    // Check all questions answered
    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      addToast('error', `Masih ada ${unanswered.length} soal yang belum dijawab`);
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const responses = questions.map((q) => ({
        questionId: q.id,
        answer: {
          questionId: q.id,
          indicator: q.indicator,
          questionType: q.questionType,
          ...(answers[q.id] || {}),
        },
        timeSpentMs: Date.now() - phaseStartRef.current,
      }));

      const res = await fetch(`/api/kps/sessions/${sessionId}/stage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: currentStage, responses }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast('error', data.error || 'Gagal mengumpulkan tahap');
        setSubmitting(false);
        return;
      }

      if (data.completed) {
        // Stage 3 done — complete exam
        setCompletedStages((prev) => [...prev, currentStage]);
        await handleCompleteExam();
        return;
      }

      // Show break screen
      setCompletedStages((prev) => [...prev, currentStage]);
      setIsBreak(true);

      // Store next stage data
      sessionStorage.setItem(`kps_next_${sessionId}`, JSON.stringify({
        nextStage: data.nextStage,
        nextPath: data.nextPath,
        stimulus: data.stimulus,
        questions: data.questions,
      }));
    } catch (err) {
      console.error('Submit stage error:', err);
      addToast('error', 'Terjadi kesalahan saat mengumpulkan jawaban');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBreakEnd = () => {
    const nextData = sessionStorage.getItem(`kps_next_${sessionId}`);
    if (!nextData) return;

    const data = JSON.parse(nextData);
    sessionStorage.removeItem(`kps_next_${sessionId}`);

    setCurrentStage(data.nextStage);
    setStage2Path(data.nextPath || stage2Path);
    setStimulus(data.stimulus);
    setQuestions(data.questions || []);
    setCurrentIdx(0);
    setAnswers({});
    setIsBreak(false);
    phaseStartRef.current = Date.now();
  };

  const handleCompleteExam = async () => {
    if (!user) return;

    try {
      const token = await user.getIdToken();
      await fetch(`/api/kps/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      localStorage.removeItem(`kps_session_${sessionId}`);
      router.push(`/ujian-kps/${sessionId}/results`);
    } catch {
      addToast('error', 'Gagal menyelesaikan ujian');
    }
  };

  // Break screen
  if (isBreak) {
    return (
      <KPSBreakScreen
        completedStage={currentStage as 1 | 2}
        onBreakEnd={handleBreakEnd}
        timeLeftMs={timeLeftMs}
      />
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[#5841EA] border-t-transparent" />
          <p className="text-sm text-gray-500">Memuat ujian...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
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

  const currentQuestion = questions[currentIdx];
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;

  return (
    <>
      {/* Fullscreen Gate */}
      <AnimatePresence>
        {showFullscreenGate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="mx-4 max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
              <Maximize size={48} className="mx-auto mb-4 text-[#5841EA]" />
              <h2 className="mb-2 text-xl font-bold text-gray-900">Fullscreen Diperlukan</h2>
              <p className="mb-6 text-sm text-gray-500">
                Ujian ini memerlukan mode fullscreen untuk menjaga integritas ujian.
              </p>
              <button
                onClick={handleEnterFullscreen}
                className="w-full rounded-xl bg-[#5841EA] px-6 py-3 text-sm font-semibold text-white shadow-lg"
              >
                Masuk Fullscreen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Warning */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="mx-4 max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
              <AlertTriangle size={40} className="mx-auto mb-3 text-amber-500" />
              <h2 className="mb-2 text-lg font-bold text-gray-900">Peringatan</h2>
              <p className="mb-1 text-sm text-gray-600">
                Anda terdeteksi berpindah tab.
              </p>
              <p className="mb-4 text-sm font-semibold text-red-600">
                Peringatan {tabWarningCount}/3
              </p>
              <button
                onClick={() => setShowTabWarning(false)}
                className="rounded-xl bg-[#5841EA] px-6 py-2.5 text-sm font-semibold text-white"
              >
                Kembali ke Ujian
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Exam UI */}
      <div className="flex min-h-screen flex-col bg-[#f8f8fc]">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
            <KPSStageIndicator currentStage={currentStage} completedStages={completedStages} />
            <div className="flex items-center gap-3">
              {!isOnline && (
                <WifiOff size={16} className="text-red-500" />
              )}
              <KPSTimer timeLeftMs={timeLeftMs} onTimeUp={handleTimeUp} />
            </div>
          </div>
        </header>

        {/* Question Dots */}
        <div className="border-b border-gray-50 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-center gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`h-9 w-9 rounded-full text-xs font-bold transition-all ${
                  idx === currentIdx
                    ? 'bg-[#5841EA] text-white shadow-lg shadow-[#5841EA]/30'
                    : answers[q.id]
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
              <p className="mt-3 text-sm text-stone-400">Memuat soal...</p>
            </div>
          ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentStage}-${currentIdx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Stimulus */}
              {stimulus && (
                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-blue-600">
                    <span>Stimulus</span>
                    {stimulus.title && <span>— {stimulus.title}</span>}
                  </div>
                  <div className="max-h-60 overflow-y-auto text-sm">
                    <QuestionRenderer content={stimulus.content} />
                  </div>
                </div>
              )}

              {/* Question */}
              {currentQuestion && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#5841EA]">
                      {KPS_INDICATOR_LABELS[currentQuestion.indicator]}
                    </span>
                    <span className="text-xs text-gray-400">
                      Soal {currentIdx + 1} dari {questions.length}
                    </span>
                  </div>
                  <KPSQuestionRenderer
                    question={currentQuestion}
                    currentAnswer={answers[currentQuestion.id] || null}
                    onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
                    disabled={submitting}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          )}
        </main>

        {/* Bottom Navigation */}
        <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <button
              onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft size={16} />
              Sebelumnya
            </button>

            <div className="text-xs text-gray-400">
              {answeredCount}/{questions.length} terjawab
            </div>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx(currentIdx + 1)}
                className="flex items-center gap-1 rounded-lg bg-[#5841EA] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#4a36d4]"
              >
                Selanjutnya
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmitStage}
                disabled={!allAnswered || submitting}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Mengumpulkan...
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    Kumpulkan Tahap {currentStage}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default KPSSessionPage;
