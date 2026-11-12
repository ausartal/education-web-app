'use client';

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getMaterials } from '@/services/materials';
import { Material } from '@/types/firestore';
import { deriveTopics, studyStats, type DerivedTopic } from '@/lib/learning';
import { bestQuizScore, deriveBadges, greeting, motivation } from '@/lib/gamification';
import { PageHero } from '@/components/ui/PageHero';
import { BadgeShelf } from '@/components/shared/BadgeShelf';
import { TONE_STYLES, type Tone } from '@/components/ui/tones';
import {
  BookOpen,
  Target,
  Clock,
  BarChart3,
  PieChart,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Users,
  Flame,
  Brain,
  ClipboardList,
  Trophy,
} from 'lucide-react';
import { doc, getDoc } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';

interface EnrolledClass {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  studentCount: number;
}

// Icon and gradient per known topic; the content of each card comes from real materials.
const topicStyles = [
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

function styleFor(id: string, index: number) {
  return topicStyles.find((s) => s.id === id) ?? topicStyles[index % topicStyles.length];
}

const DEFAULT_DAILY_GOAL = 10;

const DashboardPage: FC = () => {
  const router = useRouter();
  const { profile, user } = useAuth();
  const [topics, setTopics] = useState<DerivedTopic[]>([]);
  const [studyLog, setStudyLog] = useState<Record<string, number>>({});
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [bestScore, setBestScore] = useState(0);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [activeCourseIdx, setActiveCourseIdx] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetchData = async () => {
      try {
        const [mats, userSnap, classRes] = await Promise.all([
          getMaterials(),
          getDoc(doc(db, 'users', profile.uid)),
          fetch('/api/student/classes', {
            headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
          }).then(r => (r.ok ? r.json() : { classes: [] })).catch(() => ({ classes: [] })),
        ]);
        setMaterials(mats);

        const userData = (userSnap?.data() ?? {}) as {
          completedMaterials?: string[];
          studyMinutes?: Record<string, number>;
          settings?: { dailyGoal?: number; selectedTopics?: string[]; onboardingComplete?: boolean };
          stats?: { totalQuizzes?: number };
          topicProgress?: Record<string, Record<string, { score?: number }>>;
          lastQuiz_easy?: { score?: number };
          lastQuiz_moderate?: { score?: number };
          lastQuiz_hard?: { score?: number };
        };

        // Students who have not done the setup yet are sent there once (it can be skipped).
        const isStudent = !profile.role || profile.role === 'student';
        if (isStudent && userData.settings?.onboardingComplete !== true) {
          router.replace('/onboarding');
          return;
        }

        const completed: string[] = userData.completedMaterials ?? [];
        // Only count completions that still match existing materials
        const validIds = new Set(mats.map(m => m.id));
        setCompletedCount(completed.filter(id => validIds.has(id)).length);
        setTopics(deriveTopics(mats, completed, userData.settings?.selectedTopics ?? []));
        setStudyLog(userData.studyMinutes ?? {});
        setDailyGoal(userData.settings?.dailyGoal ?? DEFAULT_DAILY_GOAL);
        setBestScore(bestQuizScore(userData));
        setQuizCount(userData.stats?.totalQuizzes ?? profile.stats?.totalQuizzes ?? 0);
        setClasses((classRes.classes ?? []) as EnrolledClass[]);
      } catch { /* leave empty on error */ } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = studyStats(studyLog);
  const goalPct = Math.min(100, Math.round((stats.todayMinutes / Math.max(1, dailyGoal)) * 100));
  const maxDay = Math.max(1, ...stats.last7.map((d) => d.minutes));
  const cards = topics.map((topic, i) => ({
    ...topic,
    icon: styleFor(topic.id, i).icon,
    gradient: styleFor(topic.id, i).gradient,
    subtitle: `${topic.total} materi`,
  }));
  const cardCount = Math.max(cards.length, 1);
  const badges = deriveBadges({
    quizzes: quizCount,
    completedMaterials: completedCount,
    streak: stats.streak,
    classes: classes.length,
    bestScore,
  });
  const firstName = profile.displayName.split(' ')[0];
  const quickActions: Array<{ href: string; label: string; desc: string; icon: typeof Brain; tone: Tone }> = [
    { href: '/latihan', label: 'Latihan Soal', desc: 'Asah kemampuanmu', icon: Brain, tone: 'violet' },
    { href: '/materi', label: 'Materi', desc: 'Pelajari konsep', icon: BookOpen, tone: 'teal' },
    { href: '/kelas', label: 'Kelas Saya', desc: 'Tugas dan chat kelas', icon: Users, tone: 'emerald' },
    { href: '/ujian', label: 'Ujian', desc: 'Masuk dengan token', icon: ClipboardList, tone: 'amber' },
  ];
  const totalMaterials = materials.length;
  const materialsPct = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero */}
      <PageHero
        tone="blue"
        eyebrow={greeting()}
        title={`Halo, ${firstName}!`}
        description={motivation({ streak: stats.streak, todayMinutes: stats.todayMinutes, dailyGoal, quizzes: quizCount })}
        image="/icons/hero-pelajar-aktif.svg"
        chips={[
          { icon: <Flame size={13} aria-hidden="true" />, label: `${stats.streak} hari berturut-turut` },
          { icon: <Clock size={13} aria-hidden="true" />, label: `${stats.todayMinutes}/${dailyGoal} menit hari ini` },
          { icon: <Trophy size={13} aria-hidden="true" />, label: `${badges.filter((b) => b.earned).length} pencapaian` },
        ]}
        className="mb-6"
      />

      {/* Quick actions */}
      <nav aria-label="Pintasan" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {quickActions.map(({ href, label, desc, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${TONE_STYLES[tone].soft} ${TONE_STYLES[tone].icon} transition-transform group-hover:scale-110`}>
              <Icon size={20} aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-gray-900">{label}</span>
              <span className="block truncate text-xs text-gray-500">{desc}</span>
            </span>
          </Link>
        ))}
      </nav>

      {/* Daily goal */}
      <div className="mb-8 rounded-3xl bg-white p-5 shadow-sm shadow-gray-100">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div className="min-w-[200px] flex-1">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-sm font-bold text-gray-900">Target belajar hari ini</p>
              <p className="text-xs text-gray-500">
                <span className="font-bold text-gray-900">{stats.todayMinutes}</span> / {dailyGoal} menit
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progres target belajar harian">
              <div className={`h-full rounded-full transition-all duration-700 ${goalPct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${goalPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {goalPct >= 100 ? 'Target hari ini tercapai.' : 'Kerjakan latihan soal untuk menambah menit belajarmu.'}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5">
            <Flame size={18} className={stats.streak > 0 ? 'text-amber-500' : 'text-gray-300'} aria-hidden="true" />
            <div>
              <p className="text-sm font-black leading-none text-gray-900">{stats.streak} hari</p>
              <p className="text-[10px] text-gray-500">berturut-turut</p>
            </div>
          </div>
          <div className="flex h-12 items-end gap-1.5" aria-label="Menit belajar 7 hari terakhir">
            {stats.last7.map((d) => (
              <div key={d.key} className="flex h-full w-4 flex-col justify-end" title={`${d.key}: ${d.minutes} menit`}>
                <div className={`w-full rounded-sm ${d.minutes > 0 ? 'bg-primary/70' : 'bg-gray-100'}`} style={{ height: `${Math.max(8, (d.minutes / maxDay) * 100)}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <BadgeShelf badges={badges} />
      </div>

      {/* Header Row - Summary + Jump back in aligned */}
      <div className="mb-8 grid animate-[fadeIn_0.5s_ease-out] gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Ringkasan belajar</h2>
          <p className="mt-1 text-sm text-gray-500">Perkembanganmu sejauh ini</p>
        </div>
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-bold text-gray-900">Jump back in</h2>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setActiveCourseIdx(
                  (activeCourseIdx - 1 + cardCount) %
                    cardCount
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-all hover:bg-gray-200 hover:scale-105"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() =>
                setActiveCourseIdx((activeCourseIdx + 1) % cardCount)
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
                      {completedCount} of {totalMaterials}
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
                    <p className="text-xs text-gray-500">Quiz Completed</p>
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
                        Completed ({completedCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-gray-200" />
                      <span className="text-xs text-gray-600">
                        Remaining ({Math.max(totalMaterials - completedCount, 0)})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bar Chart - Stats comparison */}
                <div className="space-y-2.5">
                  {[
                    {
                      label: 'Quiz',
                      value: quizCount,
                      max: Math.max(quizCount, 20),
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

          {/* Kelas yang diikuti */}
          <div className="animate-[fadeIn_0.8s_ease-out] rounded-3xl bg-white p-6 shadow-sm shadow-gray-100">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap size={18} className="text-primary" />
              <h3 className="font-bold text-gray-900">Kelas Saya</h3>
            </div>
            {classes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <Users size={20} />
                </div>
                <p className="text-sm font-semibold text-gray-700">Belum mengikuti kelas</p>
                <p className="mt-1 text-xs text-gray-400">
                  Gabung kelas dengan kode dari gurumu untuk mulai belajar.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {classes.map((cls) => (
                  <Link
                    key={cls.id}
                    href={`/kelas/${cls.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <GraduationCap size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-900">{cls.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {cls.subject || 'Tanpa mata pelajaran'} · Guru: {cls.teacherName}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                      <Users size={12} />
                      {cls.studentCount}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Jump Back In */}
        <div className="space-y-5">
          {/* Stacked Card Carousel */}
          {cards.length === 0 && (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <BookOpen size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">Belum ada materi</p>
              <p className="mt-1 text-xs text-gray-400">Materi akan muncul di sini setelah dipublikasikan.</p>
            </div>
          )}
          <div className={`relative ${cards.length > 0 ? 'h-[580px]' : ''}`}>
            <AnimatePresence mode="popLayout">
              {cards.map((topic, i) => {
                const offset = i - activeCourseIdx;
                const isActive = offset === 0;
                const isVisible = Math.abs(offset) <= 1;

                if (!isVisible) return null;

                const hasProgress = false;

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
                            {topic.completed} dari {topic.total} materi selesai
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
                              {topic.completed === 0 ? 'Mulai belajar' : topic.completed >= topic.total ? 'Ulangi materi' : 'Lanjutkan belajar'}
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
