'use client';

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress } from '@/services/progress';
import { getMaterials } from '@/services/materials';
import { Material, UserProgress } from '@/types/firestore';
import { Zap, TrendingUp, BookOpen, Target, Clock } from 'lucide-react';

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

  // Streak days
  const days = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
  const today = new Date().getDay();
  const streakDays = days.map((_, i) => i < profile.stats.streak % 7);

  // Mini bar chart data (simulated weekly XP — in production this would come from a weekly log)
  const weeklyXP = [20, 35, 15, 50, 40, 30, profile.stats.xp > 0 ? 45 : 0];
  const maxXP = Math.max(...weeklyXP, 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Welcome, {profile.displayName.split(' ')[0]}
        </h1>
        <h2 className="hidden text-xl font-bold text-gray-900 lg:block">
          Jump back in
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Streak Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-4xl font-bold text-gray-900">
                {profile.stats.streak}
              </span>
              <Zap size={28} className="fill-yellow-400 text-yellow-400" />
            </div>
            <div className="flex items-center gap-3">
              {days.map((day, i) => (
                <div key={day} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      streakDays[i]
                        ? 'bg-yellow-400'
                        : i === (today === 0 ? 6 : today - 1)
                          ? 'border-2 border-yellow-400 bg-yellow-50'
                          : 'bg-gray-100'
                    }`}
                  >
                    <Zap
                      size={18}
                      className={
                        streakDays[i]
                          ? 'fill-gray-900 text-gray-900'
                          : 'text-gray-400'
                      }
                    />
                  </div>
                  <span
                    className={`text-xs ${
                      i === (today === 0 ? 6 : today - 1)
                        ? 'font-bold text-gray-900'
                        : 'text-gray-500'
                    }`}
                  >
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Overview Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">
                Progress Overview
              </h3>
              <Link
                href="/profile"
                className="text-xs text-primary hover:underline"
              >
                Detail →
              </Link>
            </div>

            {/* Stats Grid */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-blue-50 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-primary" />
                  <span className="text-xs text-gray-500">Materi</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {completedCount}/{materials.length}
                </p>
              </div>
              <div className="rounded-xl bg-orange-50 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Zap size={14} className="text-primary-orange" />
                  <span className="text-xs text-gray-500">Total XP</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {profile.stats.xp.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Target size={14} className="text-success" />
                  <span className="text-xs text-gray-500">Quiz</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {profile.stats.totalQuizzes}
                </p>
              </div>
              <div className="rounded-xl bg-purple-50 p-3">
                <div className="mb-1 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#8B5CF6]" />
                  <span className="text-xs text-gray-500">Waktu</span>
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {Math.round(totalTimeSpent / 60)}m
                </p>
              </div>
            </div>

            {/* Weekly Activity Graph */}
            <div>
              <div className="mb-2 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-500">
                  Aktivitas Minggu Ini
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                {weeklyXP.map((xp, i) => (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className={`w-full rounded-sm transition-all ${
                        i === (today === 0 ? 6 : today - 1)
                          ? 'bg-primary'
                          : 'bg-primary/30'
                      }`}
                      style={{ height: `${Math.max((xp / maxXP) * 48, 4)}px` }}
                    />
                    <span className="text-[10px] text-gray-400">{days[i]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          {/* Current Course Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
            <h3 className="mb-1 text-2xl font-bold text-gray-900">
              {courseTopics[activeCourseIdx].name}
            </h3>
            <p className="mb-6 text-sm font-medium text-primary">
              LEVEL {Math.min(completedCount + 1, 10)}
            </p>

            <div className="mx-auto mb-6 flex h-48 w-48 items-center justify-center">
              <Image
                src={courseTopics[activeCourseIdx].icon}
                alt={courseTopics[activeCourseIdx].name}
                width={160}
                height={160}
              />
            </div>

            <p className="mb-6 text-sm text-gray-500">
              {nextMaterial
                ? `Selanjutnya: ${nextMaterial.title}`
                : 'Semua materi selesai! 🎉'}
            </p>

            {materials.slice(0, 3).map((m) => {
              const status = progress.find(
                (p) => p.materialId === m.id
              )?.status;
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 border-t border-gray-100 px-2 py-3 text-left"
                >
                  <div
                    className={`h-3 w-3 rounded-full ${
                      status === 'completed'
                        ? 'bg-success'
                        : status === 'in_progress'
                          ? 'bg-primary'
                          : 'bg-gray-200'
                    }`}
                  />
                  <span className="flex-1 text-sm text-gray-700">
                    {m.title}
                  </span>
                </div>
              );
            })}

            <Link
              href={nextMaterial ? `/materi/${nextMaterial.id}` : '/materi'}
              className="mt-6 block w-full rounded-xl bg-primary py-4 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Start
            </Link>
          </div>

          {/* Course Topic Icons */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {courseTopics.map((topic, i) => (
              <button
                key={topic.id}
                onClick={() => setActiveCourseIdx(i)}
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 transition-all ${
                  activeCourseIdx === i
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <Image
                  src={topic.icon}
                  alt={topic.name}
                  width={36}
                  height={36}
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
