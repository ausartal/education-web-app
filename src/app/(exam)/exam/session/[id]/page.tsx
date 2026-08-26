'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wifi, WifiOff, ChevronLeft, ChevronRight, AlertTriangle, X, Loader2, Send } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import type { MSATAnswerKey, MSATStageDifficulty } from '@/types/msat';

const QuestionRenderer = dynamic(() => import('@/components/shared/QuestionRenderer'), { ssr: false });

interface Question {
  id: string;
  stem: string;
  options: Record<string, string>;
  cognitiveDomain: string;
  cognitiveLevel: string;
  difficulty: string;
  tierPath: string;
  categoryLabel: string;
}

interface SessionData {
  sessionId: string;
  status: string;
  currentStage: number;
  currentStageDifficulty: string;
  stagePath: string[];
  exam: {
    id: string;
    title: string;
    totalStages: number;
    questionsPerStage: number;
    durationPerStage: number;
    breakDuration: number;
  } | null;
}

const ExamSessionPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [tabWarning, setTabWarning] = useState(false);
  const [tabCount, setTabCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const questionStartRef = useRef(Date.now());

  // Fetch session + questions
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const idToken = await user.getIdToken();

        // Get session status
        const sessionRes = await fetch(`/api/msat/sessions/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!sessionRes.ok) { router.push('/exam'); return; }
        const sessionData = await sessionRes.json();

        if (sessionData.status === 'completed') {
          router.push(`/exam/results/${id}`);
          return;
        }
        if (sessionData.status === 'on_break') {
          router.push(`/exam/break/${id}`);
          return;
        }

        setSession(sessionData);
        setTimeLeft((sessionData.exam?.durationPerStage ?? 30) * 60);

        // Fetch questions for current stage
        const qRes = await fetch(`/api/msat/sessions/${id}/questions`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          setQuestions(qData.questions ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, [user, id, router]);

  // Timer
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  // Track time per question
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [currentIdx]);

  // Anti-cheat
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setTabCount(c => c + 1);
        setTabWarning(true);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const handleAnswer = (questionId: string, answer: string) => {
    // Record time for previous answer
    const prevQ = questions[currentIdx];
    if (prevQ) {
      setTimeSpent(prev => ({
        ...prev,
        [prevQ.id]: (prev[prevQ.id] ?? 0) + (Date.now() - questionStartRef.current),
      }));
    }
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting) return;
    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answers[q.id]).length;
      if (unanswered > 0 && !showConfirm) {
        setShowConfirm(true);
        return;
      }
    }

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const idToken = await user!.getIdToken();
      const payload = {
        answers: questions.map(q => ({
          questionId: q.id,
          selectedAnswer: answers[q.id] ?? 'A',
          timeSpentMs: timeSpent[q.id] ?? 0,
        })),
      };

      const res = await fetch(`/api/msat/sessions/${id}/submit-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.completed) {
          // Auto-complete
          await fetch(`/api/msat/sessions/${id}/complete`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${idToken}` },
          });
          router.push(`/exam/results/${id}`);
        } else if (data.break?.active) {
          router.push(`/exam/break/${id}`);
        }
      }
    } catch { /* ignore */ }
    setSubmitting(false);
  }, [submitting, questions, answers, timeSpent, user, id, router, showConfirm]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF]">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (!session || questions.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F7FF] text-center">
        <p className="text-gray-500">Soal tidak ditemukan</p>
        <button onClick={() => router.push('/exam')} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">
          Kembali
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerDanger = timeLeft < 300;
  const stageDiff = session.currentStageDifficulty as MSATStageDifficulty;
  const diffLabel = { rendah: 'Rendah', medium: 'Medium', tinggi: 'Tinggi' }[stageDiff] ?? stageDiff;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FF]">
      {/* Tab Warning */}
      <AnimatePresence>
        {tabWarning && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-[2px]" onClick={() => setTabWarning(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <AlertTriangle className="text-amber-500" size={20} />
                </div>
                <button onClick={() => setTabWarning(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <h3 className="mb-1 text-base font-bold text-gray-900">Perpindahan Tab Terdeteksi</h3>
              <p className="mb-4 text-sm text-gray-500">Pelanggaran ke-<strong className="text-amber-600">{tabCount}</strong>. Hindari berpindah tab.</p>
              <button onClick={() => setTabWarning(false)} className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white">Saya Mengerti</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Confirm */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/60 backdrop-blur-[2px]" onClick={() => setShowConfirm(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()} className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-2 text-base font-bold text-gray-900">Kumpulkan Jawaban?</h3>
              <p className="mb-1 text-sm text-gray-500">Kamu sudah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> soal.</p>
              {answeredCount < questions.length && (
                <p className="mb-4 text-sm text-amber-600">Masih ada {questions.length - answeredCount} soal yang belum dijawab.</p>
              )}
              {!answeredCount || answeredCount >= questions.length ? <div className="mb-4" /> : null}
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Kembali</button>
                <button onClick={() => handleSubmit(true)} className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-sm font-bold text-white hover:bg-[#4D38D4]">Kumpulkan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/90 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              Stage {session.currentStage}/{session.exam?.totalStages ?? 3}
            </span>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-bold text-stone-500">{diffLabel}</span>
            <span className="hidden text-xs text-gray-400 sm:block">{answeredCount}/{questions.length} terjawab</span>
          </div>
          <div className="flex items-center gap-3">
            {online ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-rose-400" />}
            <div className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold tabular-nums ${timerDanger ? 'animate-pulse bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-700'}`}>
              <Clock size={14} />
              {mins}:{secs.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mx-auto mt-2 max-w-4xl">
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" animate={{ width: `${(answeredCount / questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 gap-6 px-4 py-6">
        {/* Question Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {currentQ && (
              <motion.div key={currentQ.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.15 }}>
                {/* Question header */}
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-600">
                    Soal {currentIdx + 1} dari {questions.length}
                  </span>
                  <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                    {currentQ.cognitiveDomain}
                  </span>
                  <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">
                    {currentQ.difficulty}
                  </span>
                </div>

                {/* Question stem */}
                <div className="mb-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                  <QuestionRenderer content={currentQ.stem} className="text-[15px] font-medium leading-relaxed text-gray-800" />
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {(['A', 'B', 'C', 'D', 'E'] as const).map(key => {
                    const optText = currentQ.options[key];
                    if (!optText) return null;
                    const selected = answers[currentQ.id] === key;
                    return (
                      <motion.button
                        key={key}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleAnswer(currentQ.id, key)}
                        className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                          selected ? 'border-violet-500 bg-violet-50 shadow-sm' : 'border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50/50'
                        }`}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                          selected ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
                        }`}>{key}</span>
                        <QuestionRenderer content={optText} className="mt-1 flex-1 text-sm leading-relaxed text-gray-700" />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-40 hover:bg-gray-200"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx(i => i + 1)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Berikutnya <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={submitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-700"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Mengirim...' : 'Kumpulkan Jawaban'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar — Question dots */}
        <div className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-28 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-400">Navigasi Soal</h4>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                    i === currentIdx ? 'bg-violet-600 text-white shadow-md' :
                    answers[q.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 text-[10px] text-gray-400">
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-violet-600" /> Soal aktif</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-emerald-100" /> Sudah dijawab</div>
              <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-gray-100" /> Belum dijawab</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSessionPage;
