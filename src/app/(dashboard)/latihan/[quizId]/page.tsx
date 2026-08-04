'use client';

import { FC, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Clock, ArrowRight, RotateCcw } from 'lucide-react';
import { PracticeQuestion, Difficulty, AnswerKey } from '@/types/firestore';
import { ScientificCalculator } from '@/components/tools/ScientificCalculator';
import { PeriodicTableRef } from '@/components/tools/PeriodicTableRef';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const QuestionRenderer = dynamic(() => import('@/components/shared/QuestionRenderer'), { ssr: false });

const QuizPage: FC = () => {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const difficulty = params.quizId as Difficulty;

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCalc, setShowCalc] = useState(false);
  const [showPeriodic, setShowPeriodic] = useState(false);
  const [checking, setChecking] = useState(false);

  const currentQ = questions[currentIdx];
  const options: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];

  // Shuffle options order per question
  const shuffledOptions = useMemo(() => {
    if (!currentQ) return options;
    const filtered = options.filter((k) => currentQ.options[k]);
    const seed = currentIdx;
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (seed * 7 + i * 13) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [currentIdx, currentQ]);

  // Fetch questions from secure API (correctAnswer stripped server-side)
  useEffect(() => {
    if (!difficulty || !user) return;
    const fetchQuestions = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/practice-questions?topic=stoikiometri&difficulty=${difficulty}&count=10`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) throw new Error('Failed to fetch questions');
        const data = await res.json();
        setQuestions(data.questions);
        setTimer(data.questions[0]?.baseTime || 60);
      } catch { /* leave empty */ } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [difficulty, user]);

  // Timer countdown
  useEffect(() => {
    if (loading || submitted || finished) return;
    if (timer <= 0) {
      setSubmitted(true);
      return;
    }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, loading, submitted, finished]);

  // Check answer via server API
  const checkAnswer = useCallback(async (questionId: string, selectedAnswer: string): Promise<boolean> => {
    const idToken = await user!.getIdToken();
    const res = await fetch('/api/practice-questions/check-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ questionId, selectedAnswer }),
    });
    if (!res.ok) throw new Error('Failed to check answer');
    const data = await res.json();
    return data.isCorrect;
  }, [user]);

  const handleSubmit = useCallback(async () => {
    if (!currentQ || submitted || !selected || checking) return;
    setChecking(true);
    try {
      const correct = await checkAnswer(currentQ.id, selected);
      setIsCorrect(correct);
      setSubmitted(true);
      if (correct) {
        setScore((s) => s + 1);
      }
    } catch { /* handle error */ } finally {
      setChecking(false);
    }
  }, [currentQ, selected, submitted, checking, checkAnswer]);

  const handleNext = () => {
    if (currentIdx >= questions.length - 1) {
      setFinished(true);
      // Save completion to Firestore
      if (profile) {
        const finalScore = score;
        const percentage = Math.round((finalScore / questions.length) * 100);
        const data: Record<string, unknown> = {
          [`lastQuiz_${difficulty}`]: {
            score: percentage,
            completedAt: new Date().toISOString(),
            correct: finalScore,
            total: questions.length,
          },
          'stats.totalQuizzes': increment(1),
        };
        if (difficulty === 'easy') {
          data.easyQuizCompleted = true;
        }
        if (difficulty === 'moderate') {
          data.moderateQuizCompleted = true;
        }
        updateDoc(doc(db, 'users', profile.uid), data);
      }
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
    setIsCorrect(null);
    setTimer(questions[currentIdx + 1]?.baseTime || 60);
  };

  const handleRetake = () => {
    setCurrentIdx(0);
    setSelected(null);
    setSubmitted(false);
    setIsCorrect(null);
    setScore(0);
    setFinished(false);
    setTimer(questions[0]?.baseTime || 60);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">No questions available</p>
      </div>
    );
  }

  // Finished screen
  if (finished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-3xl bg-white p-10 text-center shadow-lg"
        >
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan">
            <span className="text-3xl font-black text-white">
              {percentage}%
            </span>
          </div>
          <h2 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
            Quiz Complete!
          </h2>
          <p className="mb-6 text-gray-500">
            {score} of {questions.length} correct
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3.5 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
            >
              <RotateCcw size={16} /> Retake
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
            >
              Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] px-4 py-6">
      <div className="mx-auto max-w-6xl">
        {/* Top bar */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/latihan')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
          >
            ← Back
          </button>
          <span className="rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold capitalize text-primary">
            {difficulty}
          </span>
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

        {/* Progress bar */}
        <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-cyan"
            animate={{
              width: `${((currentIdx + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        {/* 2-column layout */}
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Left - Question + Options */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 p-0">
                <p className="mb-1 text-xs text-gray-400">
                  Question {currentIdx + 1} of {questions.length}
                </p>
                <QuestionRenderer
                  content={currentQ.stem}
                  className="font-display text-base font-bold leading-relaxed text-gray-900"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {shuffledOptions.map((key) => {
                  const isSelected = selected === key;
                  let style = 'bg-white hover:border-primary/40 text-gray-800';
                  if (submitted) {
                    if (isCorrect && isSelected) style = 'bg-emerald-50 text-emerald-800';
                    else if (!isCorrect && isSelected) style = 'bg-rose-50 text-rose-800';
                    else style = 'bg-gray-50 text-gray-400';
                  } else if (isSelected) {
                    style = 'bg-primary/5 text-gray-900';
                  }
                  return (
                    <motion.button
                      key={key}
                      whileTap={!submitted ? { scale: 0.97 } : {}}
                      onClick={() => !submitted && setSelected(key)}
                      disabled={submitted}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-left transition-all ${style}`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          submitted && isCorrect && isSelected
                            ? 'bg-emerald-500 text-white'
                            : submitted && !isCorrect && isSelected
                              ? 'bg-rose-500 text-white'
                              : isSelected
                                ? 'bg-primary text-white'
                                : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {key}
                      </span>
                      <QuestionRenderer
                        content={currentQ.options[key]}
                        className="flex-1 text-sm font-medium"
                      />
                    </motion.button>
                  );
                })}
              </div>

              {submitted && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-xl p-4 ${isCorrect ? 'bg-emerald-50' : 'bg-rose-50'}`}
                >
                  <p
                    className={`mb-1 text-sm font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}
                  >
                    {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                  </p>
                  <QuestionRenderer content={currentQ.explanation} className="text-xs text-gray-600" />
                </motion.div>
              )}

              <div className="mt-5">
                {!submitted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!selected || checking}
                    className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all disabled:opacity-30 hover:enabled:-translate-y-0.5"
                  >
                    {checking ? 'Checking...' : 'Submit Answer'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-white shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                  >
                    {currentIdx >= questions.length - 1
                      ? 'See Results'
                      : 'Next Question'}
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Right - Stats + Tools */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/60 p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
                Quiz Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Score</span>
                  <span className="font-bold text-gray-900">
                    {score}/{currentIdx + (submitted ? 1 : 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Progress</span>
                  <span className="font-bold text-primary">
                    {currentIdx + 1}/{questions.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/60">
              <button
                onClick={() => setShowCalc(!showCalc)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700"
              >
                Calculator
                <span className="text-xs text-gray-400">
                  {showCalc ? '▲' : '▼'}
                </span>
              </button>
              {showCalc && (
                <div className="border-t p-4">
                  <ScientificCalculator />
                </div>
              )}
            </div>

            <div className="rounded-2xl bg-white/60">
              <button
                onClick={() => setShowPeriodic(!showPeriodic)}
                className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700"
              >
                Periodic Table
                <span className="text-xs text-gray-400">
                  {showPeriodic ? '▲' : '▼'}
                </span>
              </button>
              {showPeriodic && (
                <div className="border-t p-4">
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

export default QuizPage;
