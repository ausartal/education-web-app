'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wifi, WifiOff, ChevronLeft, ChevronRight, AlertTriangle, X, Loader2, Send, Shield, Maximize } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { ExamUtilityTools } from '@/components/exam/ExamUtilityTools';

const QuestionRenderer = dynamic(() => import('@/components/shared/QuestionRenderer'), { ssr: false });

interface Question {
  id: string;
  stem: string;
  options: Record<string, string>;
  cognitiveDomain: string;
}

interface SessionData {
  sessionId: string;
  status: string;
  currentStage: number;
  currentStageDifficulty: string;
  stagePath: string[];
  stageResponses: Array<{ stageNumber: number; totalCorrect: number; passed: boolean }>;
  exam: {
    id: string;
    title: string;
    totalStages: number;
    questionsPerStage: number;
    durationPerStage: number;
    breakDuration: number;
  } | null;
}

const STORAGE_KEY = (id: string) => `msat_exam_${id}`;

interface StoredState {
  answers: Record<string, string>;
  timeSpent: Record<string, number>;
  savedAt: number;
  stage: number;
}

const ANSWER_KEYS = ['A', 'B', 'C', 'D', 'E'];

function saveState(id: string, state: StoredState) {
  try { localStorage.setItem(STORAGE_KEY(id), JSON.stringify(state)); } catch { /* ignore */ }
}

function loadState(id: string): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function clearState(id: string) {
  try { localStorage.removeItem(STORAGE_KEY(id)); } catch { /* ignore */ }
}

const ExamSessionPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [session, setSession] = useState<SessionData | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [online, setOnline] = useState(true);
  const [tabWarning, setTabWarning] = useState(false);
  const [tabCount, setTabCount] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [terminated, setTerminated] = useState(false);

  const deadlineRef = useRef<number | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const timeSpentRef = useRef<Record<string, number>>({});
  const questionStartRef = useRef(Date.now());
  const prevIdxRef = useRef(0);
  const dirtyRef = useRef(false);
  const autoSubmittedRef = useRef(false);
  const submittingRef = useRef(false);
  const terminatedRef = useRef(false);
  const userRef = useRef(user);
  const questionsRef = useRef<Question[]>([]);
  const handleSubmitRef = useRef<(auto?: boolean) => void>(() => {});
  answersRef.current = answers;
  userRef.current = user;
  questionsRef.current = questions;

  const goToResults = useCallback(() => router.push(`/exam/results/${id}`), [router, id]);

  // ── Init: fetch session, then the fixed question set for this stage ──
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const idToken = await user.getIdToken();
        const headers = { Authorization: `Bearer ${idToken}` };

        const sessionRes = await fetch(`/api/msat/sessions/${id}`, { headers });
        if (!sessionRes.ok) { router.push('/exam'); return; }
        const sessionData: SessionData & { violations?: number; terminated?: boolean } = await sessionRes.json();

        if (sessionData.status === 'completed' || sessionData.terminated) { goToResults(); return; }
        if (sessionData.status === 'on_break') { router.push(`/exam/break/${id}`); return; }
        if (sessionData.status === 'waiting') { router.push('/exam'); return; }

        setSession(sessionData);
        setTabCount(sessionData.violations ?? 0);

        const qRes = await fetch(`/api/msat/sessions/${id}/questions`, { headers });
        const qData = await qRes.json().catch(() => ({}));
        if (!qRes.ok) {
          if (qData.status === 'on_break') { router.push(`/exam/break/${id}`); return; }
          if (qData.status === 'completed') { goToResults(); return; }
          setLoadError(qData.error || 'Soal tidak dapat dimuat. Coba muat ulang halaman.');
          setLoading(false);
          return;
        }

        const loaded: Question[] = qData.questions ?? [];
        const served = new Set(loaded.map(q => q.id));
        deadlineRef.current = Date.now() + (qData.endsAt - qData.serverNow);

        // Restore answers: newest of the server draft and the local copy.
        let restoredAnswers: Record<string, string> = {};
        let restoredTime: Record<string, number> = {};
        let newest = 0;
        const draft = qData.draft as { answers: Record<string, string>; timeSpent: Record<string, number>; savedAtMs: number } | null;
        if (draft) {
          restoredAnswers = draft.answers;
          restoredTime = draft.timeSpent;
          newest = draft.savedAtMs;
        }
        const local = loadState(id);
        if (local && local.stage === sessionData.currentStage && local.savedAt > newest) {
          restoredAnswers = local.answers;
          restoredTime = local.timeSpent;
        }
        const cleanAnswers: Record<string, string> = {};
        for (const [qid, value] of Object.entries(restoredAnswers ?? {})) {
          if (served.has(qid) && ANSWER_KEYS.includes(value)) cleanAnswers[qid] = value;
        }
        const cleanTime: Record<string, number> = {};
        for (const [qid, value] of Object.entries(restoredTime ?? {})) {
          if (served.has(qid) && Number.isFinite(value)) cleanTime[qid] = value;
        }

        timeSpentRef.current = cleanTime;
        setAnswers(cleanAnswers);
        setQuestions(loaded);
        setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
      } catch {
        setLoadError('Koneksi bermasalah. Coba muat ulang halaman.');
      }
      setLoading(false);
    };
    init();
  }, [user, id, router, goToResults]);

  // ── Time spent per question ──
  const commitTime = useCallback(() => {
    const q = questionsRef.current[prevIdxRef.current];
    const now = Date.now();
    if (q) {
      timeSpentRef.current[q.id] = (timeSpentRef.current[q.id] ?? 0) + (now - questionStartRef.current);
    }
    questionStartRef.current = now;
  }, []);

  useEffect(() => {
    commitTime();
    prevIdxRef.current = currentIdx;
  }, [currentIdx, commitTime]);

  // ── Autosave: local copy every 5s, server draft every 8s when changed ──
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const stage = session?.currentStage ?? 1;
    const writeLocal = () => saveState(id, { answers: answersRef.current, timeSpent: timeSpentRef.current, savedAt: Date.now(), stage });

    const local = setInterval(writeLocal, 5000);
    const remote = setInterval(async () => {
      const currentUser = userRef.current;
      if (!dirtyRef.current || !currentUser || submittingRef.current) return;
      dirtyRef.current = false;
      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/api/msat/sessions/${id}/progress`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ answers: answersRef.current, timeSpent: timeSpentRef.current }),
        });
        if (!res.ok) dirtyRef.current = true;
      } catch {
        dirtyRef.current = true;
      }
    }, 8000);

    window.addEventListener('beforeunload', writeLocal);
    return () => {
      clearInterval(local);
      clearInterval(remote);
      window.removeEventListener('beforeunload', writeLocal);
    };
  }, [loading, questions.length, id, session]);

  // ── Timer: counts down to the deadline set by the server ──
  useEffect(() => {
    if (loading || questions.length === 0) return;
    const tick = () => {
      if (deadlineRef.current === null) return;
      const left = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0 && !autoSubmittedRef.current && !terminatedRef.current) {
        autoSubmittedRef.current = true;
        handleSubmitRef.current(true);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [loading, questions.length]);

  // ── Fullscreen ──
  useEffect(() => {
    if (loading) return;
    if (!document.fullscreenElement) {
      setShowFullscreen(true);
    }
    const onFsChange = () => {
      if (!document.fullscreenElement && !loading) setShowFullscreen(true);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [loading]);

  // ── Anti-cheat: violations are counted on the server ──
  useEffect(() => {
    const reportViolation = async () => {
      if (terminatedRef.current) return;
      try {
        const currentUser = userRef.current;
        if (!currentUser) throw new Error('no user');
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/api/msat/sessions/${id}/violation`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error('violation failed');
        const data: { violations: number; terminated: boolean } = await res.json();
        setTabCount(data.violations);
        if (data.terminated) {
          terminatedRef.current = true;
          setTerminated(true);
          return;
        }
      } catch {
        setTabCount(c => c + 1);
      }
      setTabWarning(true);
    };

    const onVis = () => {
      if (document.hidden) reportViolation();
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onPopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, '', window.location.href);
    };

    // Push state to block back button
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', onPopState);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Disable right-click
    const onContext = (e: Event) => e.preventDefault();
    document.addEventListener('contextmenu', onContext);

    // Disable common keyboard shortcuts
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('contextmenu', onContext);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [id]);

  // ── The server ended the exam: show the notice, then go to the results page ──
  useEffect(() => {
    if (!terminated) return;
    const timeout = setTimeout(() => {
      clearState(id);
      goToResults();
    }, 3000);
    return () => clearTimeout(timeout);
  }, [terminated, id, goToResults]);

  const handleAnswer = (questionId: string, answer: string) => {
    dirtyRef.current = true;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submittingRef.current || terminatedRef.current) return;
    if (!autoSubmit) {
      const unanswered = questions.filter(q => !answersRef.current[q.id]).length;
      if (unanswered > 0 && !showConfirm) {
        setShowConfirm(true);
        return;
      }
    }

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    setShowConfirm(false);
    commitTime();

    try {
      const idToken = await user!.getIdToken();
      const payload = {
        answers: questions.map(q => ({
          questionId: q.id,
          selectedAnswer: answersRef.current[q.id] ?? null,
          timeSpentMs: Math.round(timeSpentRef.current[q.id] ?? 0),
        })),
      };

      const res = await fetch(`/api/msat/sessions/${id}/submit-stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        clearState(id);
        if (data.completed) {
          try {
            await fetch(`/api/msat/sessions/${id}/complete`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${idToken}` },
            });
          } catch { /* the results page finalises again */ }
          goToResults();
          return;
        }
        if (data.break?.active) {
          router.push(`/exam/break/${id}`);
          return;
        }
        setSubmitError('Respons server tidak dikenali. Muat ulang halaman.');
      } else if (res.status === 409 && data.status === 'completed') {
        goToResults();
        return;
      } else if (res.status === 409 && data.status === 'on_break') {
        router.push(`/exam/break/${id}`);
        return;
      } else {
        setSubmitError(data.error || 'Gagal mengirim jawaban. Coba lagi.');
      }
    } catch {
      setSubmitError('Koneksi terputus. Jawabanmu masih tersimpan, coba kirim lagi.');
    }
    submittingRef.current = false;
    setSubmitting(false);
  }, [questions, user, id, router, showConfirm, commitTime, goToResults]);
  handleSubmitRef.current = handleSubmit;

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
        <p className="max-w-xs text-gray-500">{loadError || 'Soal tidak ditemukan'}</p>
        <button onClick={() => router.push('/exam')} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">Kembali</button>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerDanger = timeLeft < 300;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8F7FF]">
      <ExamUtilityTools />
      {/* Fullscreen Gate */}
      <AnimatePresence>
        {showFullscreen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
                <Maximize className="text-violet-600" size={24} />
              </div>
              <h2 className="mb-2 text-lg font-bold text-gray-900">Layar Penuh Diperlukan</h2>
              <p className="mb-6 text-sm text-gray-500">Ujian harus dijalankan dalam mode layar penuh.</p>
              <button onClick={async () => { try { await document.documentElement.requestFullscreen(); setShowFullscreen(false); } catch { setShowFullscreen(false); } }} className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg">
                Masuk Layar Penuh
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Warning */}
      <AnimatePresence>
        {tabWarning && !terminated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/60 backdrop-blur-[2px]" onClick={() => setTabWarning(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} className="mx-4 w-full max-w-xs rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><AlertTriangle className="text-amber-500" size={20} /></div>
                <button onClick={() => setTabWarning(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100"><X size={16} /></button>
              </div>
              <h3 className="mb-1 text-base font-bold text-gray-900">Perpindahan Tab Terdeteksi</h3>
              <p className="mb-4 text-sm text-gray-500">Pelanggaran ke-<strong className="text-amber-600">{tabCount}</strong>. Hindari berpindah tab.</p>
              <p className="mb-4 text-xs text-rose-500 font-semibold">Pelanggaran melebihi 3x akan mengakhiri ujian secara paksa.</p>
              <button onClick={() => setTabWarning(false)} className="w-full rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white">Saya Mengerti</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Termination Popup */}
      <AnimatePresence>
        {terminated && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/90 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="mx-4 w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100">
                <Shield className="text-rose-600" size={24} />
              </div>
              <h2 className="mb-2 text-lg font-bold text-gray-900">Ujian Diakhiri Paksa</h2>
              <p className="mb-2 text-sm text-gray-500">Kamu telah melakukan pelanggaran sebanyak <strong className="text-rose-600">{tabCount}</strong> kali.</p>
              <p className="mb-6 text-xs text-gray-400">Ujian akan ditandai dan dikumpulkan secara otomatis.</p>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Mengumpulkan jawaban...
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Confirm */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/60 backdrop-blur-[2px]" onClick={() => setShowConfirm(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="mb-2 text-base font-bold text-gray-900">Kumpulkan Jawaban?</h3>
              <p className="mb-1 text-sm text-gray-500">Kamu sudah menjawab <strong>{answeredCount}</strong> dari <strong>{questions.length}</strong> soal.</p>
              {answeredCount < questions.length && <p className="mb-4 text-sm text-amber-600">Masih ada {questions.length - answeredCount} soal yang belum dijawab.</p>}
              {answeredCount >= questions.length && <div className="mb-4" />}
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700">Kembali</button>
                <button onClick={() => handleSubmit(true)} className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-sm font-bold text-white">Kumpulkan</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar — minimal, no distractions */}
      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 px-4 py-2.5 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-700">
              Stage {session.currentStage}/{session.exam?.totalStages ?? 3}
            </span>
            <span className="text-[11px] text-gray-400">{answeredCount}/{questions.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {online ? <Wifi size={13} className="text-emerald-400" /> : <WifiOff size={13} className="text-rose-400" />}
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold tabular-nums ${timerDanger ? 'animate-pulse bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-700'}`}>
              <Clock size={13} />
              {mins}:{secs.toString().padStart(2, '0')}
            </div>
          </div>
        </div>
        {submitError && (
          <div role="alert" className="mx-auto mt-2 flex max-w-4xl items-center justify-between gap-3 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <span>{submitError}</span>
            <button onClick={() => handleSubmit(true)} disabled={submitting} className="shrink-0 rounded-lg bg-rose-600 px-3 py-1 font-semibold text-white disabled:opacity-50">
              {submitting ? 'Mengirim...' : 'Coba lagi'}
            </button>
          </div>
        )}
        <div className="mx-auto mt-2 max-w-4xl">
          <div className="h-1 overflow-hidden rounded-full bg-gray-100">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" animate={{ width: `${(answeredCount / questions.length) * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-1 gap-6 px-4 py-5">
        {/* Question Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {currentQ && (
              <motion.div key={currentQ.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.12 }}>
                {/* Question number only — no cognitiveDomain, no difficulty */}
                <div className="mb-3">
                  <span className="rounded-lg bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                    Soal {currentIdx + 1} dari {questions.length}
                  </span>
                </div>

                {/* Question stem */}
                <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                  <QuestionRenderer content={currentQ.stem} className="text-[15px] font-medium leading-relaxed text-gray-800" />
                </div>

                {/* Options */}
                <div className="space-y-2">
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
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
              className="flex items-center gap-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-40"
            >
              <ChevronLeft size={16} /> Sebelumnya
            </button>
            {currentIdx < questions.length - 1 ? (
              <button onClick={() => setCurrentIdx(i => i + 1)} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">
                Berikutnya <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={() => handleSubmit()} disabled={submitting} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white disabled:opacity-50 hover:bg-emerald-700">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {submitting ? 'Mengirim...' : 'Kumpulkan Jawaban'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar — Question dots */}
        <div className="hidden w-44 shrink-0 lg:block">
          <div className="sticky top-20 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <h4 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Navigasi</h4>
            <div className="grid grid-cols-4 gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(i)}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold transition-colors ${
                    i === currentIdx ? 'bg-violet-600 text-white shadow-md' :
                    answers[q.id] ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSessionPage;
