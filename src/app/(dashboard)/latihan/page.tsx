'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, Zap, Lock, Trophy, CheckCircle, ChevronRight, RotateCcw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const QUIZZES = [
  {
    id: 'easy',
    title: 'Latihan Dasar',
    subtitle: 'Konsep fundamental stoikiometri',
    difficulty: 'Mudah',
    questions: 10,
    timePerQuestion: 45,
    gradient: 'from-emerald-500 to-teal-500',
    badge: 'bg-emerald-100 text-emerald-700',
    icon: '🌱',
    locked: false,
    unlockHint: null,
  },
  {
    id: 'moderate',
    title: 'Latihan Menengah',
    subtitle: 'Perhitungan stoikiometri lanjut',
    difficulty: 'Menengah',
    questions: 10,
    timePerQuestion: 60,
    gradient: 'from-amber-500 to-orange-500',
    badge: 'bg-amber-100 text-amber-700',
    icon: '⚡',
    locked: true,
    unlockHint: 'Selesaikan Latihan Dasar terlebih dahulu',
  },
  {
    id: 'hard',
    title: 'Latihan Sulit',
    subtitle: 'Limiting reagent & multi-step',
    difficulty: 'Sulit',
    questions: 10,
    timePerQuestion: 90,
    gradient: 'from-rose-500 to-pink-600',
    badge: 'bg-rose-100 text-rose-700',
    icon: '🔥',
    locked: true,
    unlockHint: 'Selesaikan Latihan Menengah terlebih dahulu',
  },
];

const LatihanPage: FC = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [lastScores, setLastScores] = useState<Record<string, number>>({});
  const [easyDone, setEasyDone] = useState(false);
  const [moderateDone, setModerateDone] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', profile.uid));
      const data = snap.data() || {};
      setEasyDone(!!data.easyQuizCompleted);
      setModerateDone(!!data.lastQuiz_moderate);
      const scores: Record<string, number> = {};
      if (data.lastQuiz_easy) scores.easy = data.lastQuiz_easy.score;
      if (data.lastQuiz_moderate) scores.moderate = data.lastQuiz_moderate.score;
      if (data.lastQuiz_hard) scores.hard = data.lastQuiz_hard.score;
      setLastScores(scores);
    })();
  }, [profile]);

  const isLocked = (id: string) => {
    if (id === 'easy') return false;
    if (id === 'moderate') return !easyDone;
    if (id === 'hard') return !moderateDone;
    return true;
  };

  const selectedQuiz = QUIZZES.find(q => q.id === confirm);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
            <Brain size={28} />
          </div>
          <h1 className="mb-1 font-display text-2xl font-extrabold">Latihan Soal</h1>
          <p className="text-sm text-white/70">Uji pemahamanmu dengan soal interaktif berwaktu</p>
        </div>

        {/* Rules */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { icon: Clock, text: 'Setiap soal ada batas waktu', color: 'text-violet-500' },
            { icon: Zap, text: 'Jawab cepat untuk skor lebih tinggi', color: 'text-amber-500' },
            { icon: Trophy, text: 'Buka level berikutnya dengan menyelesaikan level ini', color: 'text-emerald-500' },
            { icon: RotateCcw, text: 'Bisa diulang kapan saja', color: 'text-blue-500' },
          ].map((r, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-gray-100">
              <r.icon size={15} className={`mt-0.5 shrink-0 ${r.color}`} />
              <span className="text-xs text-gray-600 leading-snug">{r.text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Quiz cards */}
      <div className="space-y-3">
        {QUIZZES.map((quiz, i) => {
          const locked = isLocked(quiz.id);
          const score = lastScores[quiz.id];
          const done = score !== undefined;

          return (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <button
                onClick={() => !locked && setConfirm(quiz.id)}
                disabled={locked}
                className={`group w-full overflow-hidden rounded-2xl text-left transition-all duration-200 ${
                  locked ? 'cursor-not-allowed' : 'hover:-translate-y-0.5 hover:shadow-lg'
                }`}
              >
                <div className={`relative bg-gradient-to-r ${quiz.gradient} p-5 text-white ${locked ? 'opacity-50 grayscale' : ''}`}>
                  {/* Decorative circle */}
                  <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />

                  <div className="relative flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl backdrop-blur-sm">
                      {quiz.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="font-bold text-base">{quiz.title}</h2>
                        {done && <CheckCircle size={14} className="text-white/80" />}
                        {locked && <Lock size={13} className="text-white/60" />}
                      </div>
                      <p className="text-sm text-white/75">{quiz.subtitle}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
                        <span className="flex items-center gap-1"><Zap size={11} /> {quiz.questions} soal</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {quiz.timePerQuestion}s/soal</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${quiz.badge}`}>
                          {quiz.difficulty}
                        </span>
                      </div>
                    </div>
                    {!locked && (
                      <div className="shrink-0">
                        {done ? (
                          <div className="rounded-xl bg-white/20 px-3 py-2 text-center backdrop-blur-sm">
                            <p className="text-[10px] text-white/70">Terakhir</p>
                            <p className="font-black text-lg">{score}%</p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 font-semibold text-sm backdrop-blur-sm">
                            Mulai <ChevronRight size={15} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {locked && quiz.unlockHint && (
                    <p className="relative mt-2 text-xs text-white/60">🔒 {quiz.unlockHint}</p>
                  )}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Confirmation overlay */}
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
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl"
            >
              {/* Level badge */}
              <div className={`mb-4 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r ${selectedQuiz.gradient} px-4 py-2 text-white`}>
                <span className="text-lg">{selectedQuiz.icon}</span>
                <span className="font-bold text-sm">{selectedQuiz.title}</span>
              </div>

              <h2 className="mb-1 text-xl font-extrabold text-gray-900">Siap Memulai?</h2>
              <p className="mb-5 text-sm text-gray-500">Pastikan kamu dalam kondisi siap — timer akan langsung berjalan.</p>

              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Soal', value: `${selectedQuiz.questions}` },
                  { label: 'Waktu/Soal', value: `${selectedQuiz.timePerQuestion}s` },
                  { label: 'Level', value: selectedQuiz.difficulty },
                ].map(item => (
                  <div key={item.label} className="rounded-xl bg-gray-50 p-3 text-center">
                    <p className="text-sm font-black text-gray-900">{item.value}</p>
                    <p className="text-[10px] text-gray-400">{item.label}</p>
                  </div>
                ))}
              </div>

              <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700">
                ⚠ Soal yang melewati batas waktu otomatis dianggap salah.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Belum Siap
                </button>
                <button
                  onClick={() => { setConfirm(null); router.push(`/latihan/${selectedQuiz.id}`); }}
                  className={`flex-1 rounded-2xl bg-gradient-to-r ${selectedQuiz.gradient} py-3 text-sm font-bold text-white shadow-lg transition-all hover:-translate-y-0.5`}
                >
                  Mulai Sekarang
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
