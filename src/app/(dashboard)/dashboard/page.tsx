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
} from 'lucide-react';

const courseTopics = [
  {
    id: 'stoikiometri',
    name: 'Stoikiometri',
    icon: '/icons/topic-calculus.svg',
  },
  { id: 'atom-model', name: 'Model Atom', icon: '/icons/topic-atom-model.svg' },
  {
    id: 'larutan',
    name: 'Larutan & Konsentrasi',
    icon: '/icons/topic-chemistry-flask.svg',
  },
  {
    id: 'ikatan-kimia',
    name: 'Ikatan Kimia',
    icon: '/icons/topic-coordinate-geometry.svg',
  },
  {
    id: 'reaksi-redoks',
    name: 'Reaksi Redoks',
    icon: '/icons/topic-coordinate-transformations.svg',
  },
  {
    id: 'kesetimbangan',
    name: 'Kesetimbangan Kimia',
    icon: '/icons/topic-exponential-functions.svg',
  },
  {
    id: 'geometri-molekul',
    name: 'Geometri Molekul',
    icon: '/icons/topic-geometric-thinking.svg',
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

  const weeklyXP = [20, 35, 15, 50, 40, 30, profile.stats.xp > 0 ? 45 : 0];
  const maxXP = Math.max(...weeklyXP, 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Greeting */}
      <div className="mb-8 animate-[fadeIn_0.5s_ease-out]">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {profile.displayName.split(' ')[0]} ✨
        </h1>
        <p className="mt-1 text-gray-500">
          Ready to learn something new today?
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
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
            <div className="mt-5 border-t border-gray-50 pt-4">
              <div className="mb-3 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">
                  This Week
                </span>
              </div>
              <div className="flex items-end gap-2">
                {weeklyXP.map((xp, i) => (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-full rounded-lg transition-all duration-500 ${
                        i === (today === 0 ? 6 : today - 1)
                          ? 'bg-gradient-to-t from-primary to-primary-cyan'
                          : 'bg-gradient-to-t from-primary/20 to-primary/10'
                      }`}
                      style={{
                        height: `${Math.max((xp / maxXP) * 56, 6)}px`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                    <span className="text-[10px] text-gray-400">{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Jump Back In */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Jump back in</h2>

          {/* Stacked Card Carousel */}
          <div className="relative h-[420px]">
            <AnimatePresence mode="popLayout">
              {courseTopics.map((topic, i) => {
                const offset = i - activeCourseIdx;
                const isActive = offset === 0;
                const isVisible = Math.abs(offset) <= 2;

                if (!isVisible) return null;

                return (
                  <motion.div
                    key={topic.id}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{
                      scale: isActive ? 1 : 0.95 - Math.abs(offset) * 0.03,
                      x: offset * 24,
                      opacity: isActive ? 1 : 0.6 - Math.abs(offset) * 0.15,
                      zIndex: 10 - Math.abs(offset),
                    }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-0 cursor-pointer"
                    onClick={() => setActiveCourseIdx(i)}
                  >
                    <div
                      className={`h-full overflow-hidden rounded-3xl bg-white shadow-lg transition-shadow ${
                        isActive ? 'shadow-xl shadow-gray-200/60' : ''
                      }`}
                    >
                      <div className="flex h-full flex-col bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50">
                        {/* Card Header */}
                        <div className="flex-1 p-8 text-center">
                          <h3 className="mb-1 text-2xl font-black text-gray-900">
                            {topic.name}
                          </h3>
                          <p className="mb-6 text-sm font-semibold text-primary">
                            LEVEL {Math.min(completedCount + 1, 10)}
                          </p>

                          <motion.div
                            className="mx-auto mb-4 flex h-40 w-40 items-center justify-center"
                            whileHover={{ scale: 1.05 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Image
                              src={topic.icon}
                              alt={topic.name}
                              width={140}
                              height={140}
                              className="drop-shadow-lg"
                            />
                          </motion.div>

                          <p className="text-sm text-gray-500">
                            {isActive && nextMaterial
                              ? `Next: ${nextMaterial.title}`
                              : 'Tap to explore'}
                          </p>
                        </div>

                        {/* Lessons + Start (only on active) */}
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white/80 px-6 pb-6 pt-4 backdrop-blur-sm"
                          >
                            {materials.slice(0, 2).map((m) => {
                              const status = progress.find(
                                (p) => p.materialId === m.id
                              )?.status;
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-3 py-2"
                                >
                                  <div
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      status === 'completed'
                                        ? 'bg-emerald-400'
                                        : status === 'in_progress'
                                          ? 'bg-primary'
                                          : 'bg-gray-200'
                                    }`}
                                  />
                                  <span className="flex-1 text-sm text-gray-600">
                                    {m.title}
                                  </span>
                                </div>
                              );
                            })}
                            <Link
                              href={
                                nextMaterial
                                  ? `/materi/${nextMaterial.id}`
                                  : '/materi'
                              }
                              className="mt-3 block w-full rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                              Start
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
          <div className="flex justify-center gap-2">
            {courseTopics.map((topic, i) => (
              <button
                key={topic.id}
                onClick={() => setActiveCourseIdx(i)}
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-300 ${
                  activeCourseIdx === i
                    ? 'scale-110 bg-primary/10 ring-2 ring-primary shadow-md'
                    : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'
                }`}
              >
                <Image
                  src={topic.icon}
                  alt={topic.name}
                  width={30}
                  height={30}
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
