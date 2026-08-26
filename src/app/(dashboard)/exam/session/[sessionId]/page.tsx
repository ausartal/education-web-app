'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  AlertTriangle,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Send,
  Wifi,
  WifiOff,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import type {
  MASTExam,
  MASTQuestionForStudent,
  MASTAnswerKey,
  MASTSubmitStageResponse,
} from '@/types/mast';

const QuestionRenderer = dynamic(() => import('@/components/shared/QuestionRenderer'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────
interface QuestionState {
  question: MASTQuestionForStudent;
  selectedAnswer: MASTAnswerKey | null;
  timeSpentMs: number;
  viewStartMs: number;
}

// ── Component ──────────────────────────────────────────────────────
const MastSessionPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [exam, setExam] = useState<MASTExam | null>(null);
  const [questions, setQuestions] = useState<QuestionState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [stageDifficulty, setStageDifficulty] = useState<string>('medium');
  const [durationPerStage, setDurationPerStage] = useState(20);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [tabWarningCount, setTabWarningCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [online, setOnline] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionViewRef = useRef(Date.now());

  // ── Load session data ─────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const init = async () => {
      try {
        const token = await user.getIdToken();

        // Check for initial data from join (auto_start)
        const cached = sessionStorage.getItem(`mast_init_${sessionId}`);
        if (cached) {
          sessionStorage.removeItem(`mast_init_${sessionId}`);
          const parsed = JSON.parse(cached) as {
            exam: MASTExam;
            questions: MASTQuestionForStudent[];
          };
          setExam(parsed.exam);
          setDurationPerStage(parsed.exam.durationPerStage);
          setTimeLeft(parsed.exam.durationPerStage * 60);
          setCurrentStage(1);
          setStageDifficulty('medium');
          setQuestions(
            parsed.questions.map((q) => ({
              question: q,
              selectedAnswer: null,
              timeSpentMs: 0,
              viewStartMs: Date.now(),
            })),
          );
          setLoading(false);
          return;
        }

        // Fetch session from API
        const res = await fetch(`/api/mast/sessions/${sessionId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setLoading(false);
          return;
        }

        const sessionData = await res.json();

        // If session is completed, redirect to results
        if (sessionData.status === 'completed' || sessionData.status === 'flagged') {
          router.push(`/exam/results/${sessionId}`);
          return;
        }

        // If session is on_break, redirect to break page
        if (sessionData.status === 'on_break') {
          router.push(`/exam/break/${sessionId}`);
          return;
        }

        // If session is waiting, redirect to waiting page
        if (sessionData.status === 'waiting') {
          router.push(`/exam/waiting/${sessionId}`);
          return;
        }

        setCurrentStage(sessionData.currentStage || 1);
        setStageDifficulty(sessionData.currentStageDifficulty || 'medium');

        // Fetch questions for current stage
        const questionsRes = await fetch(`/api/mast/sessions/${sessionId}/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (questionsRes.ok) {
          const qData = await questionsRes.json();
          setExam(qData.exam);
          setDurationPerStage(qData.exam?.durationPerStage || 20);
          setTimeLeft((qData.exam?.durationPerStage || 20) * 60);
          setQuestions(
            (qData.questions as MASTQuestionForStudent[]).map((q) => ({
              question: q,
              selectedAnswer: null,
              timeSpentMs: 0,
              viewStartMs: Date.now(),
            })),
          );
        } else {
          setDurationPerStage(20);
          setTimeLeft(20 * 60);
        }

        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // ── Timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || timeLeft <= 0 || submitting) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitting]);

  // ── Track time spent per question ─────────────────────────────────
  useEffect(() => {
    if (questions.length === 0) return;

    const now = Date.now();
    questionViewRef.current = now;

    return () => {
      // Save time spent when leaving this question
      const elapsed = Date.now() - questionViewRef.current;
      setQuestions((prev) => {
        const updated = [...prev];
        if (updated[currentIdx]) {
          updated[currentIdx] = {
            ...updated[currentIdx],
            timeSpentMs: updated[currentIdx].timeSpentMs + elapsed,
            viewStartMs: Date.now(),
          };
        }
        return updated;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx]);

  // ── Anti-cheat: tab switch detection ──────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        setTabWarningCount((c) => c + 1);
        setShowTabWarning(true);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  // ── Select answer ─────────────────────────────────────────────────
  const selectAnswer = (answer: MASTAnswerKey) => {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[currentIdx] = {
        ...updated[currentIdx],
        selectedAnswer: answer,
      };
      return updated;
    });
  };

  // ── Navigate question ─────────────────────────────────────────────
  const goToQuestion = (idx: number) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIdx(idx);
  };

  // ── Submit stage ──────────────────────────────────────────────────
  const submitStage = useCallback(async () => {
    if (submitting || !user) return;
    setSubmitting(true);

    // Finalize time for current question
    const now = Date.now();
    const finalQuestions = questions.map((q, i) => {
      if (i === currentIdx) {
        return {
          ...q,
          timeSpentMs: q.timeSpentMs + (now - questionViewRef.current),
        };
      }
      return q;
    });

    try {
      const token = await user.getIdToken();
      const answers = finalQuestions
        .filter((q) => q.selectedAnswer)
        .map((q) => ({
          questionId: q.question.id,
          selectedAnswer: q.selectedAnswer!,
          timeSpentMs: q.timeSpentMs,
        }));

      const res = await fetch(`/api/mast/sessions/${sessionId}/submit-stage`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ answers }),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Gagal mengumpulkan jawaban');
        setSubmitting(false);
        return;
      }

      const result: MASTSubmitStageResponse = await res.json();

      // Stop timer
      if (timerRef.current) clearInterval(timerRef.current);

      // Determine next destination
      if (result.break && result.break.active) {
        // Store break info and redirect
        sessionStorage.setItem(
          `mast_break_${sessionId}`,
          JSON.stringify({
            stageResult: result.stageResult,
            break: result.break,
          }),
        );
        router.push(`/exam/break/${sessionId}`);
      } else {
        // Stage 3 done — complete the exam
        const completeRes = await fetch(`/api/mast/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        if (completeRes.ok) {
          router.push(`/exam/results/${sessionId}`);
        } else {
          // Try fetching results directly (might already be completed)
          router.push(`/exam/results/${sessionId}`);
        }
      }
    } catch {
      alert('Terjadi kesalahan saat mengumpulkan jawaban');
      setSubmitting(false);
    }
  }, [submitting, user, questions, currentIdx, sessionId, router]);

  // ── Auto-submit on time up ────────────────────────────────────────
  const handleAutoSubmit = useCallback(() => {
    void submitStage();
  }, [submitStage]);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 size={32} className="mx-auto mb-4 animate-spin text-violet-500" />
          <p className="text-sm text-gray-500">Memuat soal ujian...</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center bg-gray-50">
        <p className="text-gray-500">Soal ujian tidak ditemukan.</p>
        <button
          onClick={() => router.push('/exam')}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────
  const currentQ = questions[currentIdx];
  const answeredCount = questions.filter((q) => q.selectedAnswer !== null).length;
  const allAnswered = answeredCount === questions.length;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const timerDanger = timeLeft < 300; // < 5 min
  const options: MASTAnswerKey[] = ['A', 'B', 'C', 'D', 'E'];

  const difficultyLabel: Record<string, string> = {
    low: 'Mudah',
    medium: 'Sedang',
    high: 'Sulit',
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f8fc]">
      {/* ── Tab Warning Popup ── */}
      <AnimatePresence>
        {showTabWarning && (
          <motion.div
            key="tab-warn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-[2px]"
            onClick={() => setShowTabWarning(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle className="text-amber-500" size={20} />
                </div>
                <button
                  onClick={() => setShowTabWarning(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              </div>
              <h3 className="mb-1 text-base font-bold text-gray-900">Perpindahan Tab Terdeteksi</h3>
              <p className="mb-4 text-sm leading-relaxed text-gray-500">
                Tindakan ini telah dicatat. Pelanggaran ke-{' '}
                <strong className="text-amber-600">{tabWarningCount}</strong> — hindari berpindah tab
                selama ujian berlangsung.
              </p>
              <button
                onClick={() => setShowTabWarning(false)}
                className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submit Confirmation Dialog ── */}
      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            key="submit-confirm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-[2px]"
            onClick={() => setShowSubmitConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            >
              <h3 className="mb-2 text-lg font-bold text-gray-900">Kumpulkan Stage {currentStage}?</h3>
              <p className="mb-2 text-sm text-gray-500">
                Kamu sudah menjawab <strong className="text-gray-700">{answeredCount}/{questions.length}</strong> soal.
              </p>
              {answeredCount < questions.length && (
                <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  Masih ada {questions.length - answeredCount} soal yang belum dijawab. Soal yang tidak dijawab
                  akan dianggap salah.
                </p>
              )}
              {!allAnswered && answeredCount === questions.length - 0 ? null : answeredCount < questions.length ? null : (
                <p className="mb-4 text-sm text-gray-500">
                  Jawaban tidak bisa diubah setelah dikumpulkan.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSubmitConfirm(false)}
                  className="flex-1 rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                >
                  Kembali
                </button>
                <button
                  onClick={() => {
                    setShowSubmitConfirm(false);
                    void submitStage();
                  }}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {submitting ? 'Mengumpulkan...' : 'Ya, Kumpulkan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              Stage {currentStage}
            </span>
            <span className="hidden text-sm font-medium text-gray-500 sm:block">
              {difficultyLabel[stageDifficulty] || stageDifficulty}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {online ? (
              <Wifi size={14} className="text-emerald-400" />
            ) : (
              <WifiOff size={14} className="text-rose-400" />
            )}
            <div
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold tabular-nums ${
                timerDanger
                  ? 'animate-pulse bg-rose-50 text-rose-600'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock size={14} />
              {timerStr}
            </div>
            <span className="text-xs text-gray-400">
              {answeredCount}/{questions.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_200px]">
          {/* ── Question area ── */}
          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.15 }}
              >
                {/* Question stem */}
                <div className="mb-5 rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-500">
                    Soal {currentIdx + 1} dari {questions.length}
                  </p>
                  <QuestionRenderer
                    content={currentQ.question.stem}
                    className="font-display text-[17px] font-semibold leading-relaxed text-gray-900"
                  />
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {options.map((key) => {
                    const optText = currentQ.question.options[key];
                    if (!optText) return null;
                    const isSelected = currentQ.selectedAnswer === key;

                    return (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.975 }}
                        onClick={() => selectAnswer(key)}
                        className={`group flex w-full items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition-all ${
                          isSelected
                            ? 'bg-white shadow-md ring-2 ring-violet-400'
                            : 'bg-white shadow-sm ring-1 ring-gray-100 hover:ring-violet-200 hover:shadow-md'
                        }`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                            isSelected
                              ? 'bg-violet-500 text-white'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-violet-50 group-hover:text-violet-600'
                          }`}
                        >
                          {key}
                        </span>
                        <QuestionRenderer
                          content={optText}
                          className={`flex-1 text-sm font-medium leading-snug ${
                            isSelected ? 'text-gray-900' : 'text-gray-700'
                          }`}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Navigation buttons */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={() => goToQuestion(currentIdx - 1)}
                    disabled={currentIdx === 0}
                    className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-50"
                  >
                    <ChevronLeft size={16} />
                    Sebelumnya
                  </button>
                  {currentIdx < questions.length - 1 ? (
                    <button
                      onClick={() => goToQuestion(currentIdx + 1)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700"
                    >
                      Berikutnya
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowSubmitConfirm(true)}
                      disabled={submitting}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Send size={16} />
                      Kumpulkan Stage {currentStage}
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Question navigation sidebar ── */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Navigasi Soal
              </h3>
              <div className="grid grid-cols-4 gap-2 lg:grid-cols-3">
                {questions.map((q, i) => {
                  const isCurrent = i === currentIdx;
                  const isAnswered = q.selectedAnswer !== null;

                  return (
                    <button
                      key={q.question.id}
                      onClick={() => goToQuestion(i)}
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                        isCurrent
                          ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                          : isAnswered
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded-md bg-violet-600 text-[9px] font-bold text-white">
                    1
                  </span>
                  Soal saat ini
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded-md bg-emerald-100 text-[9px] font-bold text-emerald-700">
                    1
                  </span>
                  Sudah dijawab
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="flex h-4 w-4 items-center justify-center rounded-md bg-gray-100 text-[9px] font-bold text-gray-500">
                    1
                  </span>
                  Belum dijawab
                </div>
              </div>
            </div>

            {/* Submit button in sidebar */}
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {submitting ? 'Mengumpulkan...' : `Kumpulkan Stage ${currentStage}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MastSessionPage;
