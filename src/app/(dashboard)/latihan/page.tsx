'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Clock, Lock, Trophy } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const quizzes = [
  {
    id: 'easy',
    title: 'Latihan Dasar',
    description: 'Soal-soal fundamental stoikiometri',
    difficulty: 'Easy',
    questions: 10,
    timePerQuestion: 45,
    color: 'from-emerald-500 to-teal-400',
    shadow: 'shadow-emerald-200/50',
    locked: false,
  },
  {
    id: 'moderate',
    title: 'Latihan Menengah',
    description: 'Perhitungan stoikiometri tingkat lanjut',
    difficulty: 'Moderate',
    questions: 10,
    timePerQuestion: 60,
    color: 'from-amber-500 to-orange-400',
    shadow: 'shadow-amber-200/50',
    locked: true,
  },
  {
    id: 'hard',
    title: 'Latihan Sulit',
    description: 'Soal kompleks: limiting reagent, multi-step',
    difficulty: 'Hard',
    questions: 10,
    timePerQuestion: 90,
    color: 'from-rose-500 to-pink-400',
    shadow: 'shadow-rose-200/50',
    locked: true,
  },
];

const LatihanPage: FC = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const [showIntro, setShowIntro] = useState(false);
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [easyCompleted, setEasyCompleted] = useState(false);
  const [lastScores, setLastScores] = useState<Record<string, number>>({});

  // Check if intro has been shown before
  useEffect(() => {
    if (!profile) return;
    const check = async () => {
      const snap = await getDoc(doc(db, 'users', profile.uid));
      const data = snap.data();
      if (!data?.latihanIntroSeen) {
        setShowIntro(true);
      }
      if (data?.easyQuizCompleted) {
        setEasyCompleted(true);
      }
      // Load last scores
      const scores: Record<string, number> = {};
      if (data?.lastQuiz_easy) scores.easy = data.lastQuiz_easy.score;
      if (data?.lastQuiz_moderate)
        scores.moderate = data.lastQuiz_moderate.score;
      if (data?.lastQuiz_hard) scores.hard = data.lastQuiz_hard.score;
      setLastScores(scores);
    };
    check();
  }, [profile]);

  const dismissIntro = async () => {
    setShowIntro(false);
    if (profile) {
      await updateDoc(doc(db, 'users', profile.uid), {
        latihanIntroSeen: true,
      });
    }
  };

  const handleStart = (quizId: string) => {
    setShowConfirm(null);
    router.push(`/latihan/${quizId}`);
  };

  const isLocked = (quiz: (typeof quizzes)[0]) => {
    if (quiz.id === 'easy') return false;
    return !easyCompleted;
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center"
      >
        <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
          Practice Quiz
        </h1>
        <p className="text-sm text-gray-500">
          Uji pemahamanmu dengan latihan soal interaktif
        </p>
      </motion.div>

      <div className="space-y-5">
        {quizzes.map((quiz, i) => {
          const locked = isLocked(quiz);
          return (
            <motion.div
              key={quiz.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => !locked && setShowConfirm(quiz.id)}
                disabled={locked}
                className={`group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-r ${quiz.color} p-7 text-left text-white shadow-lg ${quiz.shadow} transition-all duration-300 ${
                  locked
                    ? 'cursor-not-allowed opacity-50 grayscale'
                    : 'hover:-translate-y-1 hover:shadow-xl'
                }`}
              >
                {/* Decorative */}
                <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />

                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur-sm">
                        {quiz.difficulty}
                      </span>
                      {locked && <Lock size={14} className="text-white/60" />}
                    </div>
                    <h2 className="mb-1 text-xl font-extrabold">
                      {quiz.title}
                    </h2>
                    <p className="text-sm text-white/80">{quiz.description}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-white/70">
                      <span className="flex items-center gap-1">
                        <Zap size={12} /> {quiz.questions} soal
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {quiz.timePerQuestion}s/soal
                      </span>
                    </div>
                  </div>

                  {!locked && (
                    <div className="hidden items-center gap-2 rounded-2xl bg-white/20 px-5 py-3 backdrop-blur-sm sm:flex">
                      <Trophy size={18} />
                      <span className="text-sm font-bold">Start</span>
                    </div>
                  )}
                </div>

                {locked && (
                  <p className="mt-3 text-xs text-white/60">
                    🔒 Selesaikan Easy terlebih dahulu
                  </p>
                )}
                {lastScores[quiz.id] !== undefined && (
                  <p className="mt-3 text-xs text-white/70">
                    Last score:{' '}
                    <span className="font-bold text-white">
                      {lastScores[quiz.id]}%
                    </span>
                  </p>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Intro Popup - only shows once */}
      <Modal
        isOpen={showIntro}
        onClose={dismissIntro}
        title="Selamat Datang di Latihan!"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Halaman ini adalah tempat untuk <strong>melatih pemahamanmu</strong>{' '}
            tentang materi yang sudah dipelajari.
          </p>
          <p>
            Setiap soal memiliki <strong>batas waktu</strong>. Jika melebihi
            batas waktu, jawaban akan otomatis dianggap salah.
          </p>
          <p>
            Selesaikan level <strong>Easy</strong> terlebih dahulu untuk membuka
            level Moderate dan Hard.
          </p>
        </div>
        <div className="mt-5">
          <Button onClick={dismissIntro} className="w-full">
            Mengerti!
          </Button>
        </div>
      </Modal>

      {/* Confirmation Popup */}
      <Modal
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        title="Siap Mulai?"
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>Setiap soal memiliki batas waktu:</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Easy: 45 detik per soal</li>
            <li>Moderate: 60 detik per soal</li>
            <li>Hard: 90 detik per soal</li>
          </ul>
          <p className="text-rose-600 font-medium">
            ⚠️ Jika melebihi batas waktu, jawaban otomatis dianggap salah.
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <Button variant="secondary" onClick={() => setShowConfirm(null)}>
            Belum Siap
          </Button>
          <Button onClick={() => showConfirm && handleStart(showConfirm)}>
            Ya, Mulai!
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default LatihanPage;
