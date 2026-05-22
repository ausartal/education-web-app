'use client';

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress } from '@/services/progress';
import { getMaterials } from '@/services/materials';
import { Material, UserProgress } from '@/types/firestore';
import {
  Zap,
  TrendingUp,
  BookOpen,
  Target,
  Clock,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const courseTopics = [
  {
    id: 'stoikiometri',
    name: 'Stoikiometri',
    subtitle: 'Perhitungan Kimia',
    icon: '/icons/topic-calculus.svg',
    gradient: 'bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400',
    lessons: [
      'Konsep Mol & Bilangan Avogadro',
      'Massa Molar & Perhitungan',
      'Pereaksi Pembatas',
    ],
  },
  {
    id: 'atom-model',
    name: 'Model Atom',
    subtitle: 'Struktur Materi',
    icon: '/icons/topic-atom-model.svg',
    gradient: 'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-400',
    lessons: [
      'Teori Atom Dalton & Thomson',
      'Model Atom Bohr',
      'Konfigurasi Elektron',
    ],
  },
  {
    id: 'larutan',
    name: 'Larutan',
    subtitle: 'Konsentrasi & Campuran',
    icon: '/icons/topic-chemistry-flask.svg',
    gradient: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400',
    lessons: [
      'Molaritas & Molalitas',
      'Pengenceran Larutan',
      'Sifat Koligatif',
    ],
  },
  {
    id: 'ikatan-kimia',
    name: 'Ikatan Kimia',
    subtitle: 'Gaya Antar Atom',
    icon: '/icons/topic-coordinate-geometry.svg',
    gradient: 'bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400',
    lessons: ['Ikatan Ion', 'Ikatan Kovalen', 'Ikatan Logam'],
  },
  {
    id: 'reaksi-redoks',
    name: 'Reaksi Redoks',
    subtitle: 'Transfer Elektron',
    icon: '/icons/topic-coordinate-transformations.svg',
    gradient: 'bg-gradient-to-br from-amber-500 via-orange-500 to-red-400',
    lessons: ['Oksidasi & Reduksi', 'Bilangan Oksidasi', 'Penyetaraan Redoks'],
  },
  {
    id: 'kesetimbangan',
    name: 'Kesetimbangan',
    subtitle: 'Reaksi Reversibel',
    icon: '/icons/topic-exponential-functions.svg',
    gradient: 'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-400',
    lessons: [
      'Hukum Kesetimbangan',
      'Konstanta Kc & Kp',
      'Pergeseran Kesetimbangan',
    ],
  },
  {
    id: 'geometri-molekul',
    name: 'Geometri Molekul',
    subtitle: 'Bentuk & Sudut',
    icon: '/icons/topic-geometric-thinking.svg',
    gradient: 'bg-gradient-to-br from-lime-500 via-green-500 to-emerald-400',
    lessons: ['Teori VSEPR', 'Hibridisasi', 'Polaritas Molekul'],
  },
];

const DashboardPage: FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      const [mats, prog] = await Promise.all([
        getMaterials(),
        getUserProgress(profile.uid),
      ]);
      setMaterials(mats);
      setProgress(prog);
      setLoading(false);
    };
    fetchData();
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const completedCount = progress.filter(
    (p) => p.status === 'completed'
  ).length;
  const nextMaterial = materials.find(
    (m) =>
      !progress.find((p) => p.materialId === m.id && p.status === 'completed')
  );
  const totalTimeSpent = progress.reduce(
    (acc, p) => acc + (p.timeSpent || 0),
    0
  );

  const days = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
  const today = new Date().getDay();
  const streakDays = days.map((_, i) => i < profile.stats.streak % 7);

  // Calculate weekly activity from real progress data
  const weeklyXP = (() => {
    const now = new Date();
    const weekData = [0, 0, 0, 0, 0, 0, 0]; // M T W Th F S Su
    progress.forEach((p) => {
      const accessedAt = p.lastAccessedAt?.toDate?.();
      if (!accessedAt) return;
      const diffDays = Math.floor(
        (now.getTime() - accessedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 7) {
        const dayIdx = (accessedAt.getDay() + 6) % 7; // Convert Sun=0 to Mon=0
        weekData[dayIdx] += p.status === 'completed' ? 50 : 10;
      }
    });
    return weekData;
  })();
  const maxXP = Math.max(...weeklyXP, 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header Row - Welcome + Jump back in aligned */}
      <div className="mb-8 grid animate-[fadeIn_0.5s_ease-out] gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile.displayName.split(' ')[0]} ✨
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Ready to learn something new today?
          </p>
        </div>
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold text-gray-900">Jump back in</h2>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setActiveCourseIdx(
                  (activeCourseIdx - 1 + courseTopics.length) %
                    courseTopics.length
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:scale-105"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() =>
                setActiveCourseIdx((activeCourseIdx + 1) % courseTopics.length)
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:scale-105"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Streak - Gradient card, no border */}
          <div className="animate-[fadeIn_0.6s_ease-out] rounded-3xl bg-gradient-to-br from-amber-400 via-orange-400 to-red-400 p-6 text-white shadow-lg shadow-orange-200/50">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">
                Daily Streak
              </span>
              <Zap size={20} className="fill-white text-white" />
            </div>
            <p className="mb-4 text-5xl font-black">{profile.stats.streak}</p>
            <div className="flex gap-2">
              {days.map((day, i) => (
                <div key={day} className="flex flex-col items-center gap-1">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-300 ${
                      streakDays[i]
                        ? 'bg-white/30 backdrop-blur-sm'
                        : i === (today === 0 ? 6 : today - 1)
                          ? 'bg-white/20 ring-2 ring-white'
                          : 'bg-white/10'
                    }`}
                  >
                    <Zap
                      size={14}
                      className={
                        streakDays[i]
                          ? 'fill-white text-white'
                          : 'text-white/40'
                      }
                    />
                  </div>
                  <span className="text-[10px] font-medium text-white/70">
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Overview - Soft card */}
          <div className="animate-[fadeIn_0.7s_ease-out] rounded-3xl bg-white p-6 shadow-sm shadow-gray-100">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Your Progress</h3>
              {/* Toggle Switch: List ↔ Chart */}
              <button
                onClick={() =>
                  setViewMode(viewMode === 'list' ? 'chart' : 'list')
                }
                className="relative flex h-8 w-16 items-center rounded-full bg-gray-100 p-1 transition-colors"
                aria-label="Toggle view mode"
              >
                <div
                  className={`absolute h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                    viewMode === 'chart' ? 'left-[34px]' : 'left-[4px]'
                  }`}
                />
                <BarChart3
                  size={12}
                  className={`relative z-10 ml-1.5 transition-colors ${
                    viewMode === 'list' ? 'text-primary' : 'text-gray-400'
                  }`}
                />
                <PieChart
                  size={12}
                  className={`relative z-10 ml-4 transition-colors ${
                    viewMode === 'chart' ? 'text-primary' : 'text-gray-400'
                  }`}
                />
              </button>
            </div>

            {viewMode === 'list' ? (
              /* List View - Colorful pills */
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl bg-blue-50/80 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                    <BookOpen size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Materi Selesai</p>
                    <p className="text-sm font-bold text-gray-900">
                      {completedCount} of {materials.length}
                    </p>
                  </div>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{
                        width: `${materials.length > 0 ? (completedCount / materials.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-amber-50/80 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                    <Zap size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Total XP</p>
                    <p className="text-sm font-bold text-gray-900">
                      {profile.stats.xp.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <Target size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Quiz Completed</p>
                    <p className="text-sm font-bold text-gray-900">
                      {profile.stats.totalQuizzes}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-violet-50/80 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100">
                    <Clock size={16} className="text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Time Spent</p>
                    <p className="text-sm font-bold text-gray-900">
                      {Math.round(totalTimeSpent / 60)} min
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Chart View - Donut + Bar */
              <div className="space-y-5">
                {/* Donut Chart - Materials Progress */}
                <div className="flex items-center gap-5">
                  <div className="relative h-24 w-24 shrink-0">
                    <svg
                      viewBox="0 0 36 36"
                      className="h-full w-full -rotate-90"
                    >
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="#E5E7EB"
                        strokeWidth="4"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke="url(#progressGradient)"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${materials.length > 0 ? (completedCount / materials.length) * 88 : 0} 88`}
                        className="transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="progressGradient">
                          <stop offset="0%" stopColor="#1A73E8" />
                          <stop offset="100%" stopColor="#00C2FF" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-black text-gray-900">
                        {materials.length > 0
                          ? Math.round(
                              (completedCount / materials.length) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-gray-600">
                        Completed ({completedCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                      <span className="text-xs text-gray-600">
                        Remaining ({materials.length - completedCount})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bar Chart - Stats comparison */}
                <div className="space-y-2.5">
                  {[
                    {
                      label: 'XP',
                      value: profile.stats.xp,
                      max: 500,
                      color: 'from-amber-400 to-orange-400',
                    },
                    {
                      label: 'Quiz',
                      value: profile.stats.totalQuizzes,
                      max: 20,
                      color: 'from-emerald-400 to-teal-400',
                    },
                    {
                      label: 'Time',
                      value: Math.round(totalTimeSpent / 60),
                      max: 120,
                      color: 'from-violet-400 to-purple-400',
                    },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-gray-500">{stat.label}</span>
                        <span className="font-semibold text-gray-700">
                          {stat.value}
                        </span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${stat.color} transition-all duration-1000`}
                          style={{
                            width: `${Math.min((stat.value / stat.max) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Activity Graph (always visible) */}
            <div className="mt-5 border-t border-gray-50 pt-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-primary" />
                  <span className="text-xs font-bold text-gray-700">
                    This Week
                  </span>
                </div>
                <span className="text-xs text-gray-400">Activity</span>
              </div>
              <div className="flex items-end gap-3">
                {weeklyXP.map((xp, i) => {
                  const isToday = i === (today === 0 ? 6 : today - 1);
                  return (
                    <div
                      key={i}
                      className="flex flex-1 flex-col items-center gap-2"
                    >
                      <span
                        className={`text-[9px] font-semibold ${isToday ? 'text-primary' : 'text-gray-300'}`}
                      >
                        {xp > 0 ? xp : ''}
                      </span>
                      <div
                        className={`w-full rounded-xl transition-all duration-500 ${
                          isToday
                            ? 'bg-gradient-to-t from-primary to-primary-cyan shadow-sm shadow-primary/20'
                            : xp > 0
                              ? 'bg-gradient-to-t from-gray-200 to-gray-100'
                              : 'bg-gray-100'
                        }`}
                        style={{
                          height: `${Math.max((xp / maxXP) * 64, 8)}px`,
                        }}
                      />
                      <span
                        className={`text-[10px] font-medium ${isToday ? 'text-primary' : 'text-gray-400'}`}
                      >
                        {days[i]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Jump Back In */}
        <div className="space-y-5">
          {/* Stacked Card Carousel */}
          <div className="relative h-[580px]">
            <AnimatePresence mode="popLayout">
              {courseTopics.map((topic, i) => {
                const offset = i - activeCourseIdx;
                const isActive = offset === 0;
                const isVisible = Math.abs(offset) <= 1;

                if (!isVisible) return null;

                const hasProgress = i === 0 && completedCount > 0;

                return (
                  <motion.div
                    key={topic.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{
                      scale: isActive ? 1 : 0.92,
                      x: offset * 40,
                      opacity: isActive ? 1 : 0.5,
                      zIndex: isActive ? 10 : 5,
                    }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => !isActive && setActiveCourseIdx(i)}
                  >
                    <div
                      className={`relative h-full overflow-hidden rounded-3xl transition-shadow duration-300 ${
                        isActive
                          ? 'shadow-2xl shadow-indigo-200/40'
                          : 'shadow-lg'
                      }`}
                    >
                      {/* Background gradient */}
                      <div className={`absolute inset-0 ${topic.gradient}`} />
                      {/* Decorative circles */}
                      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
                      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />
                      <div className="absolute right-1/4 top-1/3 h-16 w-16 rounded-full bg-white/5" />

                      <div className="relative flex h-full flex-col p-8">
                        {/* Header */}
                        <div className="text-center">
                          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-white/60">
                            {topic.subtitle}
                          </p>
                          <h3 className="mb-1 font-display text-2xl font-extrabold text-white">
                            {topic.name}
                          </h3>
                          <p className="text-sm font-medium text-white/70">
                            Level {Math.min(completedCount + 1, 10)}
                          </p>
                        </div>

                        {/* Icon */}
                        <motion.div
                          className="mx-auto my-6 flex h-36 w-36 items-center justify-center"
                          whileHover={{ scale: 1.08, rotate: 2 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Image
                            src={topic.icon}
                            alt={topic.name}
                            width={130}
                            height={130}
                            className="drop-shadow-2xl"
                          />
                        </motion.div>

                        {/* Lessons preview (active only) */}
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mt-auto space-y-3"
                          >
                            {topic.lessons.map((lesson, li) => {
                              const lessonDone =
                                i === 0 &&
                                materials[li] &&
                                progress.find(
                                  (p) =>
                                    p.materialId === materials[li].id &&
                                    p.status === 'completed'
                                );
                              return (
                                <div
                                  key={li}
                                  className="flex items-center gap-3 rounded-2xl bg-white/15 px-5 py-3.5 backdrop-blur-sm"
                                >
                                  <div
                                    className={`h-3 w-3 rounded-full ${
                                      lessonDone
                                        ? 'bg-emerald-300'
                                        : 'bg-white/40'
                                    }`}
                                  />
                                  <span className="flex-1 text-sm font-medium text-white/90">
                                    {lesson}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Start / Continue Button */}
                            <Link
                              href={
                                nextMaterial
                                  ? `/materi/${nextMaterial.id}`
                                  : '/materi'
                              }
                              className="mt-4 block w-full rounded-2xl bg-white py-4 text-center text-sm font-extrabold text-gray-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                              {hasProgress
                                ? 'Continue Learning'
                                : 'Start Learning'}
                            </Link>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Thumbnail Selector */}
          <div className="flex justify-center gap-2.5">
            {courseTopics.map((topic, i) => (
              <button
                key={topic.id}
                onClick={() => setActiveCourseIdx(i)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                  activeCourseIdx === i
                    ? 'scale-110 bg-white ring-2 ring-primary shadow-lg'
                    : 'bg-gray-50 hover:bg-white hover:shadow-md hover:scale-105'
                }`}
              >
                <Image
                  src={topic.icon}
                  alt={topic.name}
                  width={26}
                  height={26}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
