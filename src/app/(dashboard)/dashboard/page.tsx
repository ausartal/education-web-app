'use client';

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getMaterials } from '@/services/materials';
import { Material } from '@/types/firestore';
import { deriveTopics, studyStats, type DerivedTopic } from '@/lib/learning';
import { bestQuizScore, deriveBadges, greeting, motivation } from '@/lib/gamification';
import { BadgeShelf } from '@/components/shared/BadgeShelf';
import { BookOpen, Target, Flame, ChevronLeft, ChevronRight, GraduationCap, Users, Check } from 'lucide-react';
import { doc, getDoc } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';

interface EnrolledClass {
  id: string;
  name: string;
  subject: string;
  teacherName: string;
  studentCount: number;
}

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
  'from-blue-600 to-cyan-500',
  'from-indigo-600 to-violet-500',
  'from-teal-600 to-emerald-500',
  'from-sky-600 to-indigo-500',
];

const DEFAULT_DAILY_GOAL = 10;

const DashboardPage: FC = () => {
  const router = useRouter();
  const reduce = useReducedMotion();
  const { profile, user } = useAuth();
  const [topics, setTopics] = useState<DerivedTopic[]>([]);
  const [studyLog, setStudyLog] = useState<Record<string, number>>({});
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_DAILY_GOAL);
  const [bestScore, setBestScore] = useState(0);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [classes, setClasses] = useState<EnrolledClass[]>([]);
  const [active, setActive] = useState(0);
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

        const isStudent = !profile.role || profile.role === 'student';
        if (isStudent && userData.settings?.onboardingComplete !== true) {
          router.replace('/onboarding');
          return;
        }

        const completed: string[] = userData.completedMaterials ?? [];
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
  const totalMaterials = materials.length;
  const materialsPct = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0;
  const cards = topics.map((topic, i) => ({
    ...topic,
    icon: TOPIC_ICONS[topic.id] ?? FALLBACK_ICONS[i % FALLBACK_ICONS.length],
    gradient: TOPIC_GRADIENTS[i % TOPIC_GRADIENTS.length],
  }));
  const current = cards.length > 0 ? cards[Math.min(active, cards.length - 1)] : null;
  const step = (dir: 1 | -1) => setActive((a) => (a + dir + cards.length) % cards.length);
  const badges = deriveBadges({
    quizzes: quizCount,
    completedMaterials: completedCount,
    streak: stats.streak,
    classes: classes.length,
    bestScore,
  });
  const firstName = profile.displayName.split(' ')[0];

  const summary = [
    { label: 'Materi selesai', value: `${completedCount}/${totalMaterials}`, icon: BookOpen, soft: 'bg-blue-50', color: 'text-blue-600' },
    { label: 'Latihan selesai', value: String(quizCount), icon: Target, soft: 'bg-emerald-50', color: 'text-emerald-600' },
    { label: 'Hari berturut-turut', value: String(stats.streak), icon: Flame, soft: 'bg-amber-50', color: stats.streak > 0 ? 'text-amber-600' : 'text-gray-400' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid items-stretch gap-x-8 gap-y-6 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <header className="flex min-h-[60px] flex-col justify-end">
            <h1 className="font-display text-3xl font-extrabold text-gray-900">Halo, {firstName}!</h1>
            <p className="mt-1 text-sm text-gray-500">
              {greeting()}. {motivation({ streak: stats.streak, todayMinutes: stats.todayMinutes, dailyGoal, quizzes: quizCount })}
            </p>
          </header>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="font-display text-lg font-extrabold text-gray-900">Progres belajar</h2>

            <ul className="mt-4 grid grid-cols-3 gap-3">
              {summary.map(({ label, value, icon: Icon, soft, color }) => (
                <li key={label} className={`flex flex-col items-start rounded-2xl ${soft} p-4`}>
                  <Icon size={18} className={color} aria-hidden="true" />
                  <p className="mt-3 font-display text-2xl font-extrabold leading-none text-gray-900">{value}</p>
                  <p className="mt-1.5 text-xs text-gray-500">{label}</p>
                </li>
              ))}
            </ul>

            <div className="mt-5 rounded-2xl bg-gray-50 p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-bold text-gray-900">Target hari ini</p>
                <p className="text-xs text-gray-500">
                  <span className="font-bold text-gray-900">{stats.todayMinutes}</span> / {dailyGoal} menit
                </p>
              </div>
              <div
                className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-gray-200"
                role="progressbar"
                aria-valuenow={goalPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progres target belajar harian"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ${goalPct >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                  style={{ width: `${goalPct}%` }}
                />
              </div>
              <div className="mt-4 flex h-10 items-end gap-1.5" aria-label="Menit belajar 7 hari terakhir">
                {stats.last7.map((d) => (
                  <div key={d.key} className="flex h-full flex-1 flex-col justify-end" title={`${d.key}: ${d.minutes} menit`}>
                    <div
                      className={`w-full rounded-sm ${d.minutes > 0 ? 'bg-primary/70' : 'bg-gray-200'}`}
                      style={{ height: `${Math.max(10, (d.minutes / maxDay) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                {goalPct >= 100 ? 'Target hari ini tercapai.' : 'Kerjakan latihan soal untuk menambah menit belajarmu.'}
              </p>
            </div>

            {totalMaterials > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${materialsPct}%` }} />
                </div>
                <span className="text-xs font-semibold tabular-nums text-gray-500">{materialsPct}% materi</span>
              </div>
            )}
          </div>

          <div className="flex flex-1 flex-col rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold text-gray-900">Kelas saya</h2>
              <Link href="/kelas" className="text-xs font-semibold text-primary hover:underline">Lihat semua</Link>
            </div>
            {classes.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
                <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
                  <Users size={20} aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-gray-700">Belum mengikuti kelas</p>
                <p className="mt-1 text-xs text-gray-400">Gabung kelas dengan kode dari gurumu.</p>
                <Link href="/kelas" className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:opacity-90">
                  Masukkan kode kelas
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {classes.slice(0, 4).map((cls) => (
                  <li key={cls.id}>
                    <Link
                      href={`/kelas/${cls.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-gray-100 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <GraduationCap size={18} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{cls.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {cls.subject || 'Tanpa mata pelajaran'} · {cls.teacherName}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                        <Users size={12} aria-hidden="true" />
                        {cls.studentCount}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <header className="flex min-h-[60px] items-end justify-between">
            <h2 className="font-display text-2xl font-extrabold text-gray-900">Lanjutkan belajar</h2>
            {cards.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => step(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
                  aria-label="Topik sebelumnya"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => step(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50"
                  aria-label="Topik berikutnya"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </header>

          {current ? (
            <>
              <div className="relative min-h-[520px] flex-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.article
                    key={current.id}
                    initial={reduce ? false : { opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduce ? undefined : { opacity: 0, x: -24 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className={`absolute inset-0 flex flex-col rounded-3xl bg-gradient-to-br ${current.gradient} p-7 text-white shadow-lg shadow-black/10`}
                  >
                    <div className="text-center">
                      <p className="text-sm font-medium text-white/75">{current.total} materi</p>
                      <h3 className="mt-1 font-display text-3xl font-extrabold">{current.name}</h3>
                      <p className="mt-1 text-sm text-white/80">{current.completed} dari {current.total} selesai</p>
                    </div>

                    <div className="flex flex-1 items-center justify-center py-4">
                      <Image src={current.icon} alt="" width={132} height={132} className="drop-shadow-xl" />
                    </div>

                    <ul className="space-y-2.5">
                      {current.lessons.slice(0, 3).map((lesson, i) => {
                        const done = i < current.completed;
                        return (
                          <li key={lesson} className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3">
                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-white text-emerald-600' : 'border border-white/50'}`}>
                              {done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
                            </span>
                            <span className="truncate text-sm font-medium">{lesson}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <Link
                      href={current.nextMaterialId ? `/materi/${current.nextMaterialId}` : '/materi'}
                      className="mt-5 block rounded-2xl bg-white py-3.5 text-center text-sm font-extrabold text-gray-900 shadow-sm transition-transform hover:-translate-y-0.5"
                    >
                      {current.completed === 0 ? 'Mulai belajar' : current.completed >= current.total ? 'Ulangi materi' : 'Lanjutkan belajar'}
                    </Link>
                  </motion.article>
                </AnimatePresence>
              </div>

              {cards.length > 1 && (
                <div className="flex justify-center gap-2.5" role="tablist" aria-label="Pilih topik">
                  {cards.map((topic, i) => (
                    <button
                      key={topic.id}
                      role="tab"
                      aria-selected={i === active}
                      aria-label={topic.name}
                      onClick={() => setActive(i)}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white transition-shadow ${
                        i === active ? 'ring-2 ring-primary shadow-md' : 'ring-1 ring-gray-100 hover:shadow-sm'
                      }`}
                    >
                      <Image src={topic.icon} alt="" width={26} height={26} />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <BookOpen size={32} className="mb-3 text-gray-300" aria-hidden="true" />
              <p className="text-sm font-semibold text-gray-700">Belum ada materi</p>
              <p className="mt-1 text-xs text-gray-400">Materi akan muncul di sini setelah dipublikasikan.</p>
            </div>
          )}
        </section>
      </div>

      <div className="mt-8">
        <BadgeShelf badges={badges} />
      </div>
    </div>
  );
};

export default DashboardPage;
