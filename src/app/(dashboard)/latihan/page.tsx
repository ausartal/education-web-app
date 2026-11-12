'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Lock, Trophy, CheckCircle2, ChevronRight, RotateCcw, Sprout, Flame, ListChecks, Timer, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';

const QUIZZES = [
  {
    id: 'easy',
    level: 1,
    title: 'Latihan Dasar',
    subtitle: 'Konsep fundamental stoikiometri',
    difficulty: 'Mudah',
    questions: 10,
    timePerQuestion: 45,
    icon: Sprout,
    accent: 'text-emerald-600',
    soft: 'bg-emerald-50',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    unlockHint: null,
  },
  {
    id: 'moderate',
    level: 2,
    title: 'Latihan Menengah',
    subtitle: 'Perhitungan stoikiometri lanjut',
    difficulty: 'Menengah',
    questions: 10,
    timePerQuestion: 60,
    icon: Zap,
    accent: 'text-amber-600',
    soft: 'bg-amber-50',
    bar: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
    button: 'bg-amber-600 hover:bg-amber-700',
    unlockHint: 'Selesaikan Latihan Dasar untuk membuka level ini',
  },
  {
    id: 'hard',
    level: 3,
    title: 'Latihan Sulit',
    subtitle: 'Pereaksi pembatas dan perhitungan bertahap',
    difficulty: 'Sulit',
    questions: 10,
    timePerQuestion: 90,
    icon: Flame,
    accent: 'text-rose-600',
    soft: 'bg-rose-50',
    bar: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    button: 'bg-rose-600 hover:bg-rose-700',
    unlockHint: 'Selesaikan Latihan Menengah untuk membuka level ini',
  },
];

const LatihanPage: FC = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [lastScores, setLastScores] = useState<Record<string, number>>({});
  const [easyDone, setEasyDone] = useState(false);
  const [moderateDone, setModerateDone] = useState(false);

  const loadScores = useCallback(async () => {
    if (!profile) return;
    {
      try {
        const snap = await getDoc(doc(db, 'users', profile.uid));
        const data = snap.data() || {};
        setEasyDone(!!data.easyQuizCompleted);
        setModerateDone(!!data.lastQuiz_moderate);
        const scores: Record<string, number> = {};
        if (data.lastQuiz_easy) scores.easy = data.lastQuiz_easy.score;
        if (data.lastQuiz_moderate) scores.moderate = data.lastQuiz_moderate.score;
        if (data.lastQuiz_hard) scores.hard = data.lastQuiz_hard.score;
        setLastScores(scores);
      } catch { /* leave defaults — levels stay locked */ }
    }
  }, [profile]);

  useEffect(() => { loadScores(); }, [loadScores]);
  useLivePoll(loadScores);

  const isLocked = (id: string) => {
    if (id === 'easy') return false;
    if (id === 'moderate') return !easyDone;
    if (id === 'hard') return !moderateDone;
    return true;
  };

  const selectedQuiz = QUIZZES.find(q => q.id === confirm);
  const completedLevels = QUIZZES.filter(q => lastScores[q.id] !== undefined).length;
  const scoreValues = Object.values(lastScores);
  const bestScore = scoreValues.length > 0 ? Math.max(...scoreValues) : null;
  const nextQuiz = QUIZZES.find(q => !isLocked(q.id) && lastScores[q.id] === undefined) ?? QUIZZES[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-gray-900">Latihan soal</h1>
        <p className="mt-1 text-sm text-gray-500">Uji pemahaman stoikiometri lewat soal berwaktu. Selesaikan satu level untuk membuka level berikutnya.</p>
      </motion.header>

      <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Level selesai', value: `${completedLevels}/${QUIZZES.length}`, icon: ListChecks },
          { label: 'Skor terbaik', value: bestScore !== null ? `${bestScore}%` : '-', icon: Trophy },
          { label: 'Waktu per soal', value: `${QUIZZES[0].timePerQuestion}-${QUIZZES[2].timePerQuestion} dtk`, icon: Timer },
        ].map(item => (
          <div key={item.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <item.icon size={16} className="text-primary" />
            <p className="mt-3 text-xl font-extrabold tabular-nums text-gray-900">{item.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{item.label}</p>
          </div>
        ))}
      </motion.section>

      <div className="space-y-3">
        {QUIZZES.map((quiz, i) => {
          const locked = isLocked(quiz.id);
          const score = lastScores[quiz.id];
          const done = score !== undefined;
          const Icon = quiz.icon;
          const isNext = !locked && !done && quiz.id === nextQuiz.id;

          return (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className={`flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 transition-shadow sm:p-5 ${
                isNext ? 'ring-2 ring-primary/40' : 'ring-gray-100'
              } ${locked ? 'opacity-70' : 'hover:shadow-md'}`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${locked ? 'bg-gray-100 text-gray-400' : `${quiz.soft} ${quiz.accent}`}`}>
                  {locked ? <Lock size={20} /> : <Icon size={22} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900">{quiz.title}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${quiz.badge}`}>{quiz.difficulty}</span>
                    {done && <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> Selesai</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{quiz.subtitle}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><ListChecks size={12} /> {quiz.questions} soal</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {quiz.timePerQuestion} dtk/soal</span>
                  </div>
                  {done && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div className={`h-full rounded-full ${quiz.bar}`} style={{ width: `${Math.min(score, 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-gray-700">{score}%</span>
                    </div>
                  )}
                  {locked && quiz.unlockHint && <p className="mt-2 text-xs text-gray-400">{quiz.unlockHint}</p>}
                </div>

                {!locked && (
                  <button
                    onClick={() => setConfirm(quiz.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors ${quiz.button}`}
                  >
                    {done ? <><RotateCcw size={14} /> Ulangi</> : <>Mulai <ChevronRight size={15} /></>}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-gray-400">
        <Zap size={12} /> Jawab lebih cepat untuk skor lebih tinggi. Soal yang melewati batas waktu dianggap salah.
      </p>

      <AnimatePresence>
        {confirm && selectedQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center"
            onClick={e => { if (e.target === e.currentTarget) setConfirm(null); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="latihan-confirm-title"
              className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${selectedQuiz.soft} ${selectedQuiz.accent}`}>
                  <selectedQuiz.icon size={22} />
                </div>
                <button onClick={() => setConfirm(null)} aria-label="Tutup" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
              </div>

              <h2 id="latihan-confirm-title" className="text-lg font-extrabold text-gray-900">{selectedQuiz.title}</h2>
              <p className="mb-5 mt-1 text-sm text-gray-500">Timer langsung berjalan setelah kamu mulai.</p>

              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Soal', value: `${selectedQuiz.questions}` },
                  { label: 'Waktu/soal', value: `${selectedQuiz.timePerQuestion} dtk` },
                  { label: 'Level', value: selectedQuiz.difficulty },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-sm font-bold text-gray-900">{item.value}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Nanti dulu
                </button>
                <button
                  onClick={() => { setConfirm(null); router.push(`/latihan/${selectedQuiz.id}`); }}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold text-white shadow-sm transition-colors ${selectedQuiz.button}`}
                >
                  Mulai sekarang
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LatihanPage;
