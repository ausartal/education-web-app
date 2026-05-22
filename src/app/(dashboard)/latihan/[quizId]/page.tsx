'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { getQuestionsByDifficulty } from '@/services/questions';
import { Question, Difficulty, AnswerKey } from '@/types/firestore';

const QuizPage: FC = () => {
  const params = useParams();
  const router = useRouter();
  const difficulty = params.quizId as Difficulty;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(0);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch questions
  useEffect(() => {
    const fetch = async () => {
      const qs = await getQuestionsByDifficulty('stoikiometri', difficulty, 10);
      setQuestions(qs);
      setTimer(qs[0]?.baseTime || 60);
      setLoading(false);
    };
    fetch();
  }, [difficulty]);

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

  const currentQ = questions[currentIdx];

  const handleSubmit = useCallback(() => {
    if (!currentQ || submitted) return;
    setSubmitted(true);
    if (selected === currentQ.correctAnswer) {
      setScore((s) => s + 1);
    }
  }, [currentQ, selected, submitted]);

  const handleNext = () => {
    if (currentIdx >= questions.length - 1) {
      setFinished(true);
      return;
    }
    setCurrentIdx((i) => i + 1);
    setSelected(null);
    setSubmitted(false);
    setTimer(questions[currentIdx + 1]?.baseTime || 60);
  };

  const handleRetake = () => {
    setCurrentIdx(0);
    setSelected(null);
    setSubmitted(false);
    setScore(0);
    setFinished(false);
    setTimer(questions[0]?.baseTime || 60);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

  const options: AnswerKey[] = ['A', 'B', 'C', 'D', 'E'];
  const isCorrect = selected === currentQ.correctAnswer;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-500">
          {currentIdx + 1}/{questions.length}
        </span>

        {/* Timer */}
        <div
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${
            timer <= 10
              ? 'bg-rose-100 text-rose-600'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Clock size={14} />
          {timer}s
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8 h-1.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-cyan"
          animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-8 rounded-3xl bg-white p-8 shadow-sm">
            <p className="font-display text-lg font-bold leading-relaxed text-gray-900">
              {currentQ.stem}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {options.map((key) => {
              if (!currentQ.options[key]) return null;

              const isSelected = selected === key;
              const isAnswer = key === currentQ.correctAnswer;
              let optionStyle = 'bg-white hover:bg-gray-50 border-gray-100';

              if (submitted) {
                if (isAnswer) {
                  optionStyle = 'bg-emerald-50 border-emerald-300';
                } else if (isSelected && !isAnswer) {
                  optionStyle = 'bg-rose-50 border-rose-300';
                } else {
                  optionStyle = 'bg-gray-50 border-gray-100 opacity-50';
                }
              } else if (isSelected) {
                optionStyle =
                  'bg-primary/5 border-primary ring-2 ring-primary/20';
              }

              return (
                <motion.button
                  key={key}
                  whileTap={!submitted ? { scale: 0.98 } : {}}
                  onClick={() => !submitted && setSelected(key)}
                  disabled={submitted}
                  className={`flex w-full items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${optionStyle}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      submitted && isAnswer
                        ? 'bg-emerald-500 text-white'
                        : submitted && isSelected && !isAnswer
                          ? 'bg-rose-500 text-white'
                          : isSelected
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {key}
                  </span>
                  <span className="flex-1 text-sm font-medium text-gray-800">
                    {currentQ.options[key]}
                  </span>
                  {submitted && isAnswer && (
                    <CheckCircle size={20} className="text-emerald-500" />
                  )}
                  {submitted && isSelected && !isAnswer && (
                    <XCircle size={20} className="text-rose-500" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 rounded-2xl p-5 ${
                isCorrect
                  ? 'animate-[bounceIn_0.4s_ease-out] bg-emerald-50'
                  : 'animate-[shake_0.4s_ease-out] bg-rose-50'
              }`}
            >
              <p
                className={`mb-1 text-sm font-bold ${
                  isCorrect ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
              </p>
              <p className="text-sm text-gray-600">{currentQ.explanation}</p>
            </motion.div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selected}
                className="flex-1 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all disabled:opacity-40 disabled:shadow-none hover:enabled:-translate-y-0.5"
              >
                Submit Answer
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
              >
                {currentIdx >= questions.length - 1 ? 'See Results' : 'Next'}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default QuizPage;
