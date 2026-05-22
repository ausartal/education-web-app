'use client';

import { FC, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Wifi, WifiOff } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { getQuestionsByDifficulty } from '@/services/questions';
import { ScientificCalculator } from '@/components/tools/ScientificCalculator';
import { PeriodicTableRef } from '@/components/tools/PeriodicTableRef';
import {
  createExamSession,
  saveResponse,
  completeExamSession,
} from '@/services/exam';
import {
  getNextDifficulty,
  updateTheta,
  calculateConfidence,
  getCurrentStage,
  getProficiencyLevel,
  detectAnomalies,
  TOTAL_QUESTIONS,
  STAGES,
} from '@/lib/msat-engine';
import {
  Question,
  Difficulty,
  AnswerKey,
  ExamResponse,
  ConfidenceLabel,
} from '@/types/firestore';

const ExamSessionPage: FC = () => {
  const router = useRouter();
  const { profile } = useAuth();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('moderate');
  const [theta, setTheta] = useState(0);
  const [responses, setResponses] = useState<ExamResponse[]>([]);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [tabWarning, setTabWarning] = useState(false);
  const [showCalc, setShowCalc] = useState(false);
  const [showPeriodic, setShowPeriodic] = useState(false);

  const questionStartTime = useRef(Date.now());
  const allQuestions = useRef<Question[]>([]);

  // Initialize session
  useEffect(() => {
    if (!profile) return;
    const init = async () => {
      const id = await createExamSession(profile.uid, 'msat-stoikiometri');
      setSessionId(id);

      // Load initial questions (moderate)
      const qs = await getQuestionsByDifficulty(
        'stoikiometri',
        'moderate',
        TOTAL_QUESTIONS
      );
      // Also preload easy and hard
      const [easyQs, hardQs] = await Promise.all([
        getQuestionsByDifficulty('stoikiometri', 'easy', TOTAL_QUESTIONS),
        getQuestionsByDifficulty('stoikiometri', 'hard', TOTAL_QUESTIONS),
      ]);
      allQuestions.current = [...easyQs, ...qs, ...hardQs];
      setQuestions(qs.slice(0, 1));
      setTimer(qs[0]?.baseTime || 60);
      questionStartTime.current = Date.now();
      setLoading(false);
    };
    init();
  }, [profile]);

  // Timer
  useEffect(() => {
    if (loading || !questions[currentIdx]) return;
    if (timer <= 0) {
      handleSubmit();
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, loading, currentIdx, questions]);

  // Anti-cheat: tab visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setTabWarning(true);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Anti-cheat: beforeunload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // Online status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getNextQuestion = useCallback(
    (nextDiff: Difficulty): Question | null => {
      const usedIds = responses.map((r) => r.questionId);
      const available = allQuestions.current.filter(
        (q) => q.difficulty === nextDiff && !usedIds.includes(q.id)
      );
      return available[Math.floor(Math.random() * available.length)] || null;
    },
    [responses]
  );

  const handleSubmit = useCallback(() => {
    const currentQ = questions[currentIdx];
    if (!currentQ || !sessionId) return;

    const answer = selected || ('A' as AnswerKey); // Default if timer expired
    const timeSpentMs = Date.now() - questionStartTime.current;
    const isCorrect = answer === currentQ.correctAnswer;

    // Calculate confidence
    const confidence = calculateConfidence(isCorrect, timeSpentMs, difficulty);

    // Update theta
    const newTheta = updateTheta(theta, isCorrect, difficulty);
    setTheta(newTheta);

    // Build response
    const response: ExamResponse = {
      questionId: currentQ.id,
      selectedAnswer: answer,
      isCorrect,
      difficulty,
      timeSpent: Math.round(timeSpentMs / 1000),
      confidenceScore: confidence.score,
      confidenceLabel: confidence.label,
      timestamp: Timestamp.now(),
    };

    const newResponses = [...responses, response];
    setResponses(newResponses);

    // Get next difficulty
    const nextDiff = getNextDifficulty(difficulty, isCorrect);
    setDifficulty(nextDiff);

    // Detect anomalies
    const anomalies = detectAnomalies(
      newResponses.map((r) => ({
        timeSpentMs: r.timeSpent * 1000,
        isCorrect: r.isCorrect,
      }))
    );

    // Auto-save to Firestore
    const stage = getCurrentStage(newResponses.length);
    saveResponse(sessionId, newResponses, newTheta, nextDiff, stage, anomalies);

    // Check if exam is complete
    if (newResponses.length >= TOTAL_QUESTIONS) {
      finishExam(newResponses, newTheta, anomalies);
      return;
    }

    // Load next question
    const nextQ = getNextQuestion(nextDiff);
    if (nextQ) {
      setQuestions((prev) => [...prev, nextQ]);
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setTimer(nextQ.baseTime || 60);
      questionStartTime.current = Date.now();
    } else {
      finishExam(newResponses, newTheta, anomalies);
    }
  }, [
    selected,
    questions,
    currentIdx,
    sessionId,
    difficulty,
    theta,
    responses,
    getNextQuestion,
  ]);

  const finishExam = async (
    finalResponses: ExamResponse[],
    finalTheta: number,
    anomalies: string[]
  ) => {
    if (!sessionId) return;

    const correctCount = finalResponses.filter((r) => r.isCorrect).length;
    const confidenceDist: Record<ConfidenceLabel, number> = {
      mahir: 0,
      paham_lambat: 0,
      tebak: 0,
      tidak_paham: 0,
    };
    const misconceptions: string[] = [];

    finalResponses.forEach((r) => {
      confidenceDist[r.confidenceLabel]++;
    });

    const result = {
      finalTheta,
      proficiencyLevel: getProficiencyLevel(finalTheta),
      accuracy: correctCount / finalResponses.length,
      misconceptions,
      confidenceDistribution: confidenceDist,
    };

    await completeExamSession(sessionId, result, anomalies);
    router.push(`/ujian/msat-stoikiometri/results?session=${sessionId}`);
  };

  if (loading || !questions[currentIdx]) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const stage = getCurrentStage(responses.length);
  const options: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="min-h-screen bg-[#F8F9FB] px-4 py-6">
      <div className="mx-auto max-w-5xl">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
              Stage {stage}/{STAGES}
            </span>
            <span className="text-sm text-gray-500">
              Q{responses.length + 1}/{TOTAL_QUESTIONS}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {online ? (
              <Wifi size={14} className="text-emerald-500" />
            ) : (
              <WifiOff size={14} className="text-rose-500" />
            )}
            <div
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${
                timer <= 10
                  ? 'bg-rose-100 text-rose-600 animate-pulse'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              <Clock size={14} />
              {timer}s
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
            animate={{
              width: `${((responses.length + 1) / TOTAL_QUESTIONS) * 100}%`,
            }}
          />
        </div>

        {/* Tab Warning */}
        {tabWarning && (
          <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            ⚠️ Tab switch detected.
            <button
              onClick={() => setTabWarning(false)}
              className="ml-2 font-bold underline"
            >
              OK
            </button>
          </div>
        )}

        {/* 2-column layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
          {/* Left - Question + Options */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-6">
                <p className="mb-1 text-xs text-gray-400">
                  Question {responses.length + 1} of {TOTAL_QUESTIONS}
                </p>
                <p className="font-display text-lg font-bold leading-relaxed text-gray-900">
                  {currentQ.stem}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {options.map((key) => {
                  if (!currentQ.options[key]) return null;
                  const isSelected = selected === key;
                  return (
                    <motion.button
                      key={key}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelected(key)}
                      className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-left transition-all ${
                        isSelected
                          ? 'bg-violet-50 shadow-md'
                          : 'bg-white shadow-sm hover:shadow-md'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          isSelected
                            ? 'bg-violet-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {key}
                      </span>
                      <span className="flex-1 text-sm font-medium text-gray-800">
                        {currentQ.options[key]}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-5">
                <button
                  onClick={handleSubmit}
                  disabled={!selected}
                  className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200/40 transition-all disabled:opacity-30 hover:enabled:-translate-y-0.5"
                >
                  Submit & Next
                </button>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right - Stats + Tools */}
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                Exam Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Stage</span>
                  <span className="font-bold text-violet-600">
                    {stage}/{STAGES}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-bold text-primary">
                    {responses.length + 1}/{TOTAL_QUESTIONS}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Theta</span>
                  <span className="font-bold text-gray-900">
                    {theta.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>

            {/* Calculator */}
            <div className="rounded-2xl bg-white shadow-sm">
              <button
                onClick={() => setShowCalc(!showCalc)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700"
              >
                Calculator
                <span className="text-gray-400">{showCalc ? '▲' : '▼'}</span>
              </button>
              {showCalc && (
                <div className="border-t border-gray-50 p-3">
                  <ScientificCalculator />
                </div>
              )}
            </div>

            {/* Periodic Table */}
            <div className="rounded-2xl bg-white shadow-sm">
              <button
                onClick={() => setShowPeriodic(!showPeriodic)}
                className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700"
              >
                Periodic Table
                <span className="text-gray-400">
                  {showPeriodic ? '▲' : '▼'}
                </span>
              </button>
              {showPeriodic && (
                <div className="border-t border-gray-50 p-3">
                  <PeriodicTableRef />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSessionPage;
