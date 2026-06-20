'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wifi, WifiOff, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ScientificCalculator } from '@/components/tools/ScientificCalculator';
import { PeriodicTableRef } from '@/components/tools/PeriodicTableRef';
import { getT2Path, getT3Path } from '@/lib/msat-engine';
import { AnswerKey, MSATTierPath } from '@/types/firestore';

// ── Types ──────────────────────────────────────────────────────────
interface QuestionData {
  id: string;
  stem: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey;
  tierPath: MSATTierPath;
  difficulty: string;
}

interface DomainQuestions {
  domainId: string;
  anchor: QuestionData;
  mudah: QuestionData;
  sukar: QuestionData;
  sangat_mudah: QuestionData;
  sedang_a: QuestionData;
  sedang_b: QuestionData;
  sangat_sukar: QuestionData;
}

type TierState = {
  question: QuestionData | null;
  answer: AnswerKey | null;
  submitted: boolean;
  isCorrect?: boolean;
  timeSpentMs: number;
};

type Phase = 'tier1' | 'tier2' | 'tier3' | 'cri' | 'done';

interface DomainProgress {
  domainId: string;
  domainName: string;
  t1: TierState;
  t2: TierState & { path: 'mudah' | 'sukar' | null };
  t3: TierState & { path: MSATTierPath | null };
  cri: 'yakin' | 'tidak_yakin' | null;
  phase: Phase;
  phaseStartTime: number;
}

const SESSION_KEY = (sessionId: string) => `msat_session_${sessionId}`;

// ── Component ──────────────────────────────────────────────────────
const ExamSessionPage: FC = () => {
  const { examId: sessionId } = useParams<{ examId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [domainList, setDomainList] = useState<string[]>([]);
  const [domainNames, setDomainNames] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Record<string, DomainQuestions>>({});
  const [durationMinutes, setDurationMinutes] = useState(50);
  const [currentDomainIdx, setCurrentDomainIdx] = useState(0);
  const [progress, setProgress] = useState<DomainProgress | null>(null);
  const [completedDomains, setCompletedDomains] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [tabWarning, setTabWarning] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showPeriodic, setShowPeriodic] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseStartRef = useRef(Date.now());

  // ── Load session from API ──
  useEffect(() => {
    if (!user) return;
    const init = async () => {
      const idToken = await user.getIdToken();
      // Try to get session data (reload scenario)
      // First check localStorage for cached data
      const cached = localStorage.getItem(SESSION_KEY(sessionId));
      if (cached) {
        const { domainList: dl, domainNames: dn, questions: q, durationMinutes: dur, completedDomains: cd, timeLeft: tl, currentDomainIdx: cdi } = JSON.parse(cached);
        setDomainList(dl);
        setDomainNames(dn);
        setQuestions(q);
        setDurationMinutes(dur);
        setCompletedDomains(cd);
        setCurrentDomainIdx(cdi);
        setTimeLeft(tl || dur * 60);
        // Build current domain progress from scratch
        initDomainProgress(cdi, dl, dn, q);
        setLoading(false);
        return;
      }

      // Restart from token — but session already exists, use start endpoint with same token
      // We need the token — redirect back to /ujian if no cache
      setLoading(false);
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  // Accept initial data passed via sessionStorage (from /ujian token-entry flow)
  useEffect(() => {
    const raw = sessionStorage.getItem(`exam_init_${sessionId}`);
    if (!raw) return;
    sessionStorage.removeItem(`exam_init_${sessionId}`);
    const { schedule, questions: qs } = JSON.parse(raw) as {
      schedule: { title: string; durationMinutes: number; domainIds: string[] };
      questions: Record<string, Record<string, QuestionData>>;
    };

    const dl = schedule.domainIds;
    const dn: Record<string, string> = {};
    dl.forEach(id => {
      const dq = qs[id];
      dn[id] = (dq?.anchor as QuestionData & { domainName?: string })?.domainName || id;
    });

    const typedQ = qs as unknown as Record<string, DomainQuestions>;
    const dur = schedule.durationMinutes;

    setDomainList(dl);
    setDomainNames(dn);
    setQuestions(typedQ);
    setDurationMinutes(dur);
    setTimeLeft(dur * 60);
    setCurrentDomainIdx(0);
    setCompletedDomains(0);

    localStorage.setItem(SESSION_KEY(sessionId), JSON.stringify({
      domainList: dl, domainNames: dn, questions: typedQ,
      durationMinutes: dur, completedDomains: 0, currentDomainIdx: 0,
      timeLeft: dur * 60,
    }));

    initDomainProgress(0, dl, dn, typedQ);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const initDomainProgress = useCallback((idx: number, dl: string[], dn: Record<string, string>, qs: Record<string, DomainQuestions>) => {
    const domainId = dl[idx];
    const dq = qs[domainId];
    if (!dq) return;
    phaseStartRef.current = Date.now();
    setProgress({
      domainId,
      domainName: dn[domainId] || domainId,
      t1: { question: dq.anchor, answer: null, submitted: false, timeSpentMs: 0 },
      t2: { question: null, answer: null, submitted: false, path: null, timeSpentMs: 0 },
      t3: { question: null, answer: null, submitted: false, path: null, timeSpentMs: 0 },
      cri: null,
      phase: 'tier1',
      phaseStartTime: Date.now(),
    });
  }, []);

  // ── Timer ──
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ── Anti-cheat ──
  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setTabWarning(true); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('online', () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, []);

  const getTimeSpent = () => Date.now() - phaseStartRef.current;

  // ── Submit T1 ──
  const submitT1 = useCallback(() => {
    if (!progress?.t1.answer || !progress.t1.question) return;
    const timeSpentMs = getTimeSpent();
    const isCorrect = progress.t1.answer === progress.t1.question.correctAnswer;
    const t2Path = getT2Path(isCorrect);
    const t2Question = questions[progress.domainId]?.[t2Path] || null;

    phaseStartRef.current = Date.now();
    setProgress(p => p ? {
      ...p,
      t1: { ...p.t1, submitted: true, isCorrect, timeSpentMs },
      t2: { ...p.t2, question: t2Question, path: t2Path },
      phase: 'tier2',
    } : p);
  }, [progress, questions, getTimeSpent]);

  // ── Submit T2 ──
  const submitT2 = useCallback(() => {
    if (!progress?.t2.answer || !progress.t2.question || !progress.t2.path) return;
    const timeSpentMs = getTimeSpent();
    const isCorrect = progress.t2.answer === progress.t2.question.correctAnswer;
    const t3Path = getT3Path(progress.t1.isCorrect!, isCorrect);
    const t3Question = questions[progress.domainId]?.[t3Path] || null;

    phaseStartRef.current = Date.now();
    setProgress(p => p ? {
      ...p,
      t2: { ...p.t2, submitted: true, isCorrect, timeSpentMs },
      t3: { ...p.t3, question: t3Question, path: t3Path },
      phase: 'tier3',
    } : p);
  }, [progress, questions, getTimeSpent]);

  // ── Submit T3 ──
  const submitT3 = useCallback(() => {
    if (!progress?.t3.answer || !progress.t3.question) return;
    const timeSpentMs = getTimeSpent();
    const isCorrect = progress.t3.answer === progress.t3.question.correctAnswer;

    phaseStartRef.current = Date.now();
    setProgress(p => p ? {
      ...p,
      t3: { ...p.t3, submitted: true, isCorrect, timeSpentMs },
      phase: 'cri',
    } : p);
  }, [progress, getTimeSpent]);

  // ── Submit CRI + save domain ──
  const submitCRI = useCallback(async (cri: 'yakin' | 'tidak_yakin') => {
    if (!progress || !user) return;
    setSubmitting(true);

    const domainResponse = {
      domainId: progress.domainId,
      domainName: progress.domainName,
      tier1: {
        questionId: progress.t1.question!.id,
        selectedAnswer: progress.t1.answer,
        isCorrect: progress.t1.isCorrect,
        timeSpentMs: progress.t1.timeSpentMs,
      },
      tier2: {
        questionId: progress.t2.question!.id,
        selectedAnswer: progress.t2.answer,
        isCorrect: progress.t2.isCorrect,
        timeSpentMs: progress.t2.timeSpentMs,
        path: progress.t2.path,
      },
      tier3: {
        questionId: progress.t3.question!.id,
        selectedAnswer: progress.t3.answer,
        isCorrect: progress.t3.isCorrect,
        timeSpentMs: progress.t3.timeSpentMs,
        path: progress.t3.path,
      },
      cri,
    };

    const idToken = await user.getIdToken();
    await fetch(`/api/exam-sessions/${sessionId}/domain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ domainResponse }),
    });

    const nextIdx = currentDomainIdx + 1;
    const newCompleted = completedDomains + 1;

    if (nextIdx >= domainList.length) {
      // All domains done — complete exam
      await completeExam(idToken);
      return;
    }

    // Move to next domain
    setCurrentDomainIdx(nextIdx);
    setCompletedDomains(newCompleted);

    // Update localStorage
    localStorage.setItem(SESSION_KEY(sessionId), JSON.stringify({
      domainList, domainNames, questions, durationMinutes,
      completedDomains: newCompleted, currentDomainIdx: nextIdx, timeLeft,
    }));

    initDomainProgress(nextIdx, domainList, domainNames, questions);
    setSubmitting(false);
  }, [progress, user, sessionId, currentDomainIdx, domainList, domainNames, questions, completedDomains, durationMinutes, timeLeft, initDomainProgress]);

  const completeExam = async (idToken: string) => {
    const res = await fetch(`/api/exam-sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({}),
    });
    localStorage.removeItem(SESSION_KEY(sessionId));
    if (res.ok) {
      router.push(`/ujian/${sessionId}/results`);
    }
  };

  const handleAutoSubmit = async () => {
    if (!user) return;
    const idToken = await user.getIdToken();
    await completeExam(idToken);
  };

  // ── Backtrack ──
  const goBackToTier = (tier: 1 | 2) => {
    if (!progress) return;
    phaseStartRef.current = Date.now();
    if (tier === 1) {
      setProgress(p => p ? {
        ...p,
        t1: { ...p.t1, submitted: false },
        t2: { question: null, answer: null, submitted: false, path: null, timeSpentMs: 0 },
        t3: { question: null, answer: null, submitted: false, path: null, timeSpentMs: 0 },
        phase: 'tier1',
      } : p);
    } else {
      setProgress(p => p ? {
        ...p,
        t2: { ...p.t2, submitted: false },
        t3: { question: null, answer: null, submitted: false, path: null, timeSpentMs: 0 },
        phase: 'tier2',
      } : p);
    }
  };

  // ── Loading / error ──
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
    </div>
  );

  if (!progress || domainList.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">Sesi ujian tidak ditemukan.</p>
        <button onClick={() => router.push('/ujian')} className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">
          Kembali ke Ujian
        </button>
      </div>
    );
  }

  // ── Format timer ──
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timerStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const timerDanger = timeLeft < 300;

  // ── Current question ──
  const currentPhase = progress.phase;
  const currentQ = currentPhase === 'tier1' ? progress.t1.question
    : currentPhase === 'tier2' ? progress.t2.question
    : currentPhase === 'tier3' ? progress.t3.question
    : null;

  const currentAnswer = currentPhase === 'tier1' ? progress.t1.answer
    : currentPhase === 'tier2' ? progress.t2.answer
    : currentPhase === 'tier3' ? progress.t3.answer
    : null;

  const setAnswer = (key: AnswerKey) => {
    if (!progress) return;
    setProgress(p => {
      if (!p) return p;
      if (currentPhase === 'tier1') return { ...p, t1: { ...p.t1, answer: key } };
      if (currentPhase === 'tier2') return { ...p, t2: { ...p.t2, answer: key } };
      if (currentPhase === 'tier3') return { ...p, t3: { ...p.t3, answer: key } };
      return p;
    });
  };

  const handleSubmitCurrent = () => {
    if (currentPhase === 'tier1') submitT1();
    else if (currentPhase === 'tier2') submitT2();
    else if (currentPhase === 'tier3') submitT3();
  };

  const options: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];
  const tierLabel = currentPhase === 'tier1' ? 'Soal 1' : currentPhase === 'tier2' ? 'Soal 2' : currentPhase === 'tier3' ? 'Soal 3' : '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="sticky top-0 z-30 border-b border-gray-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          {/* Domain progress */}
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              TP {currentDomainIdx + 1}/{domainList.length}
            </span>
            <span className="hidden text-sm font-medium text-gray-600 sm:block">
              {progress.domainName}
            </span>
          </div>

          {/* Timer + Online */}
          <div className="flex items-center gap-3">
            {online ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-rose-500" />}
            <div className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${timerDanger ? 'animate-pulse bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-700'}`}>
              <Clock size={14} />
              {timerStr}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-2 max-w-5xl">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${(completedDomains / domainList.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tab warning */}
      {tabWarning && (
        <div className="bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
          ⚠ Terdeteksi pindah tab. Hati-hati, tindakan ini dicatat.
          <button onClick={() => setTabWarning(false)} className="ml-3 font-bold underline">OK</button>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Question number strip */}
        <div className="mb-6 flex items-center gap-2">
          {[1, 2, 3].map(n => {
            const phase = n === 1 ? 'tier1' : n === 2 ? 'tier2' : 'tier3';
            const isDone = (n === 1 && progress.t1.submitted) || (n === 2 && progress.t2.submitted) || (n === 3 && progress.t3.submitted);
            const isCurrent = currentPhase === phase;
            const isLocked = (n === 2 && !progress.t1.submitted) || (n === 3 && !progress.t2.submitted);
            return (
              <button
                key={n}
                onClick={() => !isLocked && !isDone ? undefined : isDone && n < 3 ? goBackToTier(n as 1 | 2) : undefined}
                disabled={isLocked}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                  isDone ? 'bg-violet-100 text-violet-700 cursor-pointer hover:bg-violet-200'
                  : isCurrent ? 'bg-violet-600 text-white shadow-sm'
                  : isLocked ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-500'
                }`}
                title={isDone && n < 3 ? 'Klik untuk kembali dan ubah jawaban' : undefined}
              >
                {isDone ? '✓' : n}
              </button>
            );
          })}
          {currentPhase === 'cri' && (
            <span className="ml-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
              Pertanyaan Keyakinan
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {/* CRI Screen */}
          {currentPhase === 'cri' ? (
            <motion.div key="cri" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="mx-auto max-w-lg rounded-3xl bg-white p-8 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
                  <span className="text-3xl">🤔</span>
                </div>
                <h2 className="mb-2 font-display text-xl font-bold text-gray-900">Seberapa yakin?</h2>
                <p className="mb-6 text-sm text-gray-500">
                  Setelah mengerjakan <strong>{progress.domainName}</strong>, seberapa yakin kamu dengan jawaban-jawabanmu di kompetensi ini?
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => submitCRI('yakin')}
                    disabled={submitting}
                    className="flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-emerald-300 bg-emerald-50 py-5 font-semibold text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <span className="text-3xl">😊</span>
                    <span>Yakin</span>
                  </button>
                  <button
                    onClick={() => submitCRI('tidak_yakin')}
                    disabled={submitting}
                    className="flex flex-1 flex-col items-center gap-2 rounded-2xl border-2 border-gray-200 bg-gray-50 py-5 font-semibold text-gray-600 transition-all hover:bg-gray-100 disabled:opacity-50"
                  >
                    <span className="text-3xl">😕</span>
                    <span>Tidak Yakin</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key={currentPhase} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
                {/* Question area */}
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    {currentPhase !== 'tier1' && (
                      <button onClick={() => goBackToTier(currentPhase === 'tier2' ? 1 : 2)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                        <ChevronLeft size={14} /> Kembali
                      </button>
                    )}
                    <span className="text-xs font-semibold text-violet-500">{tierLabel}</span>
                  </div>

                  {currentQ ? (
                    <>
                      <p className="mb-6 font-display text-lg font-bold leading-relaxed text-gray-900">
                        {currentQ.stem}
                      </p>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {options.map(key => {
                          if (!currentQ.options[key]) return null;
                          const isSelected = currentAnswer === key;
                          return (
                            <motion.button
                              key={key}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setAnswer(key)}
                              className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-left transition-all ${
                                isSelected ? 'bg-violet-50 shadow-md ring-2 ring-violet-300' : 'bg-white shadow-sm hover:shadow-md'
                              }`}
                            >
                              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${isSelected ? 'bg-violet-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                {key}
                              </span>
                              <span className="flex-1 text-sm font-medium text-gray-800">{currentQ.options[key]}</span>
                            </motion.button>
                          );
                        })}
                      </div>

                      <button
                        onClick={handleSubmitCurrent}
                        disabled={!currentAnswer}
                        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200/40 transition-all disabled:opacity-30 hover:enabled:-translate-y-0.5"
                      >
                        {currentPhase === 'tier3' ? 'Selesai → Pertanyaan Keyakinan' : 'Lanjut ke Soal Berikutnya →'}
                      </button>
                    </>
                  ) : (
                    <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-400 shadow-sm">
                      Memuat soal...
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-3">
                  {/* Domain overview */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Progress</h3>
                    <div className="space-y-1.5">
                      {domainList.map((id, i) => (
                        <div key={id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${i < completedDomains ? 'text-emerald-600' : i === currentDomainIdx ? 'bg-violet-50 font-semibold text-violet-700' : 'text-gray-400'}`}>
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${i < completedDomains ? 'bg-emerald-100 text-emerald-600' : i === currentDomainIdx ? 'bg-violet-500 text-white' : 'bg-gray-100'}`}>
                            {i < completedDomains ? '✓' : i + 1}
                          </span>
                          <span className="truncate">{domainNames[id] || id}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Calculator */}
                  <div className="rounded-2xl bg-white shadow-sm">
                    <button onClick={() => setShowCalc(v => !v)} className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700">
                      Kalkulator <span className="text-gray-400">{showCalc ? '▲' : '▼'}</span>
                    </button>
                    {showCalc && <div className="border-t border-gray-50 p-3"><ScientificCalculator /></div>}
                  </div>

                  {/* Periodic Table */}
                  <div className="rounded-2xl bg-white shadow-sm">
                    <button onClick={() => setShowPeriodic(v => !v)} className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700">
                      Tabel Periodik <span className="text-gray-400">{showPeriodic ? '▲' : '▼'}</span>
                    </button>
                    {showPeriodic && <div className="border-t border-gray-50 p-3"><PeriodicTableRef /></div>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExamSessionPage;
