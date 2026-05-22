'use client';

import { FC } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Zap, Clock, Trophy } from 'lucide-react';

const quizzes = [
  {
    id: 'easy',
    title: 'Latihan Dasar',
    description: 'Soal-soal fundamental stoikiometri',
    difficulty: 'Easy',
    questions: 32,
    time: 20,
    color: 'from-emerald-500 to-teal-400',
    shadow: 'shadow-emerald-200/50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'moderate',
    title: 'Latihan Menengah',
    description: 'Perhitungan stoikiometri tingkat lanjut',
    difficulty: 'Moderate',
    questions: 32,
    time: 30,
    color: 'from-amber-500 to-orange-400',
    shadow: 'shadow-amber-200/50',
    badge: 'bg-amber-100 text-amber-700',
  },
  {
    id: 'hard',
    title: 'Latihan Sulit',
    description: 'Soal kompleks: limiting reagent, multi-step',
    difficulty: 'Hard',
    questions: 32,
    time: 45,
    color: 'from-rose-500 to-pink-400',
    shadow: 'shadow-rose-200/50',
    badge: 'bg-rose-100 text-rose-700',
  },
];

const LatihanPage: FC = () => {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
          Practice Quiz
        </h1>
        <p className="text-sm text-gray-500">
          Uji pemahamanmu dengan latihan soal interaktif
        </p>
      </motion.div>

      <div className="space-y-5">
        {quizzes.map((quiz, i) => (
          <motion.div
            key={quiz.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link
              href={`/latihan/${quiz.id}`}
              className={`group relative block overflow-hidden rounded-3xl bg-gradient-to-r ${quiz.color} p-7 text-white shadow-lg ${quiz.shadow} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              {/* Decorative */}
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 right-20 h-16 w-16 rounded-full bg-white/5" />

              <div className="relative flex items-center justify-between">
                <div>
                  <span
                    className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${quiz.badge}`}
                  >
                    {quiz.difficulty}
                  </span>
                  <h2 className="mb-1 text-xl font-extrabold">{quiz.title}</h2>
                  <p className="text-sm text-white/80">{quiz.description}</p>

                  <div className="mt-4 flex items-center gap-4 text-sm text-white/70">
                    <span className="flex items-center gap-1.5">
                      <Zap size={14} /> {quiz.questions} soal
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} /> ~{quiz.time} min
                    </span>
                  </div>
                </div>

                <div className="hidden items-center gap-2 rounded-2xl bg-white/20 px-5 py-3 backdrop-blur-sm transition-all group-hover:bg-white/30 sm:flex">
                  <Trophy size={18} />
                  <span className="text-sm font-bold">Start</span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default LatihanPage;
