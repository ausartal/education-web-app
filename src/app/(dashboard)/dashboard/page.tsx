'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLivePoll } from '@/hooks/useLivePoll';
import { doc, getDoc } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';
import { deriveTopics, type DerivedTopic } from '@/lib/learning';
import { getMaterials } from '@/services/materials';
import { Material } from '@/types/firestore';
import {
  BookOpen,
  Target,
  Clock,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const TOPIC_ICONS: Record<string, string> = {
  stoikiometri: '/icons/topic-calculus.svg',
  'atom-model': '/icons/topic-atom-model.svg',
  larutan: '/icons/topic-chemistry-flask.svg',
  'ikatan-kimia': '/icons/topic-coordinate-geometry.svg',
  'reaksi-redoks': '/icons/topic-coordinate-transformations.svg',
  kesetimbangan: '/icons/topic-exponential-functions.svg',
  'geometri-molekul': '/icons/topic-geometric-thinking.svg',
};
const FALLBACK_ICONS = Object.values(TOPIC_ICONS);

const TOPIC_GRADIENTS = [
  'bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400',
  'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-400',
  'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-400',
  'bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400',
  'bg-gradient-to-br from-amber-500 via-orange-500 to-red-400',
  'bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-400',
  'bg-gradient-to-br from-lime-500 via-green-500 to-emerald-400',
];

const DashboardPage: FC = () => {
  const router = useRouter();
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [topics, setTopics] = useState<DerivedTopic[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [loading, setLoading] = useState(true);

  const profileUid = profile?.uid;
  const profileRole = profile?.role;
  const fetchData = useCallback(async () => {
    if (!profileUid) return;
    try {
      const [mats, userSnap] = await Promise.all([
        getMaterials(),
        getDoc(doc(db, 'users', profileUid)),
      ]);
      const userData = (userSnap?.data() ?? {}) as {
        completedMaterials?: string[];
        settings?: { selectedTopics?: string[]; onboardingComplete?: boolean };
        stats?: { totalQuizzes?: number };
      };
      const isStudent = !profileRole || profileRole === 'student';
      if (isStudent && userData.settings?.onboardingComplete !== true) {
        router.replace('/onboarding');
        return;
      }
      const completed = userData.completedMaterials ?? [];
      const validIds = new Set(mats.map((m) => m.id));
      setMaterials(mats);
      setCompletedCount(completed.filter((id) => validIds.has(id)).length);
      setTopics(deriveTopics(mats, completed, userData.settings?.selectedTopics ?? []));
      setQuizCount(userData.stats?.totalQuizzes ?? 0);
    } catch { /* keep the last data on error */ } finally {
      setLoading(false);
    }
  }, [profileUid, profileRole, router]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useLivePoll(fetchData);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalMaterials = materials.length;
  const materialsPct = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0;
  const cards = topics.map((topic, i) => ({
    ...topic,
    icon: TOPIC_ICONS[topic.id] ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length],
    gradient: TOPIC_GRADIENTS[i % TOPIC_GRADIENTS.length],
  }));
  const safeIdx = cards.length > 0 ? Math.min(activeCourseIdx, cards.length - 1) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header Row - Welcome + Lanjutkan belajar aligned */}
      <div className="mb-8 grid animate-[fadeIn_0.5s_ease-out] gap-8 lg:grid-cols-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Halo, {profile.displayName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Siap belajar sesuatu yang baru hari ini?
          </p>
        </div>
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold text-gray-900">Jump back in</h2>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setActiveCourseIdx(
                  (safeIdx - 1 + cards.length) %
                    Math.max(cards.length, 1)
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:scale-105"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() =>
                setActiveCourseIdx((safeIdx + 1) % Math.max(cards.length, 1))
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
          {/* Progress Overview - Soft card */}
          <div className="animate-[fadeIn_0.7s_ease-out] rounded-3xl bg-white p-6 shadow-sm shadow-gray-100">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Progres belajar</h3>
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
                    <p className="text-xs text-gray-500">Materi selesai</p>
                    <p className="text-sm font-bold text-gray-900">
                      {completedCount} dari {totalMaterials}
                    </p>
                  </div>
                  <div className="h-2 w-20 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${materialsPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50/80 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
                    <Target size={16} className="text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Latihan selesai</p>
                    <p className="text-sm font-bold text-gray-900">
                      {quizCount}
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
                        strokeDasharray={`${(materialsPct / 100) * 88} 88`}
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
                        {materialsPct}%
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-xs text-gray-600">
                        Selesai ({completedCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                      <span className="text-xs text-gray-600">
                        Belum ({totalMaterials - completedCount})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bar Chart - Stats comparison */}
                <div className="space-y-2.5">
                  {[
                    {
                      label: 'Latihan',
                      value: quizCount,
                      max: 20,
                      color: 'from-emerald-400 to-teal-400',
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
          </div>
        </div>

        {/* RIGHT COLUMN - Jump Back In */}
        <div className="space-y-5">
          {/* Stacked Card Carousel */}
          <div className="relative h-[580px]">
            {cards.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl bg-gray-50 p-8 text-center">
                <BookOpen size={32} className="mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">Belum ada materi</p>
                <p className="mt-1 text-sm text-gray-500">Materi dari gurumu akan muncul di sini.</p>
              </div>
            )}
            <AnimatePresence mode="popLayout">
              {cards.map((topic, i) => {
                const offset = i - safeIdx;
                const isActive = offset === 0;
                const isVisible = Math.abs(offset) <= 1;

                if (!isVisible) return null;

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
                            {topic.total} materi
                          </p>
                          <h3 className="mb-1 font-display text-2xl font-extrabold text-white">
                            {topic.name}
                          </h3>
                          <p className="text-sm font-medium text-white/70">
                            {topic.completed} dari {topic.total} selesai
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
                              return (
                                <div
                                  key={li}
                                  className="flex items-center gap-3 rounded-2xl bg-white/15 px-5 py-3.5 backdrop-blur-sm"
                                >
                                  <div className="h-3 w-3 rounded-full bg-white/40" />
                                  <span className="flex-1 text-sm font-medium text-white/90">
                                    {lesson}
                                  </span>
                                </div>
                              );
                            })}

                            {/* Start / Continue Button */}
                            <Link
                              href={topic.nextMaterialId ? `/materi/${topic.nextMaterialId}` : '/materi'}
                              className="mt-4 block w-full rounded-2xl bg-white py-4 text-center text-sm font-extrabold text-gray-900 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                            >
                              {topic.completed > 0 ? 'Lanjutkan belajar' : 'Mulai belajar'}
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
            {cards.map((topic, i) => (
              <button
                key={topic.id}
                onClick={() => setActiveCourseIdx(i)}
                className={`flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                  safeIdx === i
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
