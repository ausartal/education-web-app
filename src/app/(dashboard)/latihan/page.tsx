'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Lock, Trophy, CheckCircle2, ChevronRight, RotateCcw, Sprout, Flame, ListChecks, Timer, X, FlaskConical, Sparkles } from 'lucide-react';
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
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-20 h-40 w-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute right-6 top-6 hidden opacity-20 sm:block"><FlaskConical size={96} strokeWidth={1.2} /></div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            <Sparkles size={12} /> Stoikiometri
          </span>
          <h1 className="mt-3 font-display text-2xl font-extrabold sm:text-3xl">Latihan soal</h1>
          <p className="mt-2 text-sm leading-relaxed text-blue-100">
            Asah pemahamanmu lewat soal berwaktu. Selesaikan satu level untuk membuka level berikutnya.
          </p>
          <button
            onClick={() => setConfirm(nextQuiz.id)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-primary shadow-sm transition-transform hover:scale-[1.03]"
          >
            {completedLevels === 0 ? 'Mulai latihan pertama' : completedLevels === QUIZZES.length ? 'Ulangi latihan' : 'Lanjutkan latihan'} <ChevronRight size={16} />
          </button>
        </div>

        <div className="relative mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Level selesai', value: `${completedLevels}/${QUIZZES.length}`, icon: ListChecks },
            { label: 'Skor terbaik', value: bestScore !== null ? `${bestScore}%` : '-', icon: Trophy },
            { label: 'Waktu per soal', value: `${QUIZZES[0].timePerQuestion}-${QUIZZES[2].timePerQuestion} dtk`, icon: Timer },
          ].map(item => (
            <div key={item.label} className="rounded-2xl bg-white/15 p-3.5 backdrop-blur-sm">
              <item.icon size={15} className="text-blue-100" />
              <p className="mt-2 text-lg font-extrabold tabular-nums sm:text-xl">{item.value}</p>
              <p className="text-[11px] text-blue-100">{item.label}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="space-y-4">
        {QUIZZES.map((quiz, i) => {
          const locked = isLocked(quiz.id);
          const score = lastScores[quiz.id];
          const done = score !== undefined;
          const Icon = quiz.icon;
          const isNext = !locked && !done && quiz.id === nextQuiz.id;

          return (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className={`relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 transition-all ${
                isNext ? 'ring-2 ring-primary/50 shadow-md' : 'ring-gray-100'
              } ${locked ? '' : 'hover:-translate-y-0.5 hover:shadow-md'}`}
            >
              <div className={`absolute inset-y-0 left-0 w-1.5 ${locked ? 'bg-gray-200' : quiz.bar}`} />
              <span className={`pointer-events-none absolute -bottom-6 right-3 select-none text-[110px] font-black leading-none ${locked ? 'text-gray-100' : `${quiz.accent} opacity-[0.07]`}`}>{quiz.level}</span>

              <div className="relative flex items-center gap-4 p-5 pl-6">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${locked ? 'bg-gray-100 text-gray-400' : `${quiz.soft} ${quiz.accent}`}`}>
                  {locked ? <Lock size={22} /> : <Icon size={26} />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={`text-base font-bold ${locked ? 'text-gray-500' : 'text-gray-900'}`}>{quiz.title}</h2>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${locked ? 'bg-gray-50 text-gray-400 ring-gray-200' : quiz.badge}`}>{quiz.difficulty}</span>
                    {isNext && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Berikutnya</span>}
                    {done && <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> Selesai</span>}
                  </div>
                  <p className="mt-0.5 text-sm text-gray-500">{quiz.subtitle}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><ListChecks size={12} /> {quiz.questions} soal</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {quiz.timePerQuestion} dtk/soal</span>
                  </div>
                  {done && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
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
