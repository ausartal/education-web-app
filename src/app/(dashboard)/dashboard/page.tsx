'use client';

import { FC, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress } from '@/services/progress';
import { getMaterials } from '@/services/materials';
import { Material, UserProgress } from '@/types/firestore';
import { Zap, ExternalLink } from 'lucide-react';

// Chemistry topics mapped to the SVG icons
const courseTopics = [
  { id: 'atom-model', name: 'Model Atom', icon: '/icons/topic-atom-model.svg' },
  {
    id: 'stoikiometri',
    name: 'Stoikiometri',
    icon: '/icons/topic-calculus.svg',
  },
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
    id: 'tingkat-kesulitan',
    name: 'Tingkat Reaksi',
    icon: '/icons/topic-difficulty-levels.svg',
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
  {
    id: 'struktur-lewis',
    name: 'Struktur Lewis',
    icon: '/icons/topic-graph-theory.svg',
  },
  {
    id: 'kimia-komputasi',
    name: 'Kimia Komputasi',
    icon: '/icons/topic-how-ai-works.svg',
  },
  {
    id: 'hukum-gas',
    name: 'Hukum Gas Ideal',
    icon: '/icons/topic-linear-relationships.svg',
  },
  {
    id: 'termokimia',
    name: 'Termokimia',
    icon: '/icons/topic-probability-and-chance.svg',
  },
  {
    id: 'laju-reaksi',
    name: 'Laju Reaksi',
    icon: '/icons/topic-regression.svg',
  },
  {
    id: 'kalorimetri',
    name: 'Kalorimetri',
    icon: '/icons/topic-thermometer-alt.svg',
  },
  {
    id: 'termodinamika',
    name: 'Termodinamika',
    icon: '/icons/topic-thermometer-gauge.svg',
  },
  {
    id: 'entalpi',
    name: 'Perubahan Entalpi',
    icon: '/icons/topic-thermometer.svg',
  },
  {
    id: 'elektrokimia',
    name: 'Elektrokimia',
    icon: '/icons/topic-vectors.svg',
  },
];

interface LeaderboardEntry {
  uid: string;
  displayName: string;
  xp: number;
}

const DashboardPage: FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
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

      // Leaderboard
      const q = query(
        collection(db, 'users'),
        orderBy('stats.xp', 'desc'),
        limit(5)
      );
      const snap = await getDocs(q);
      setLeaderboard(
        snap.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().displayName,
          xp: d.data().stats?.xp || 0,
        }))
      );
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

  // Days of week for streak
  const days = ['M', 'T', 'W', 'Th', 'F', 'S', 'Su'];
  const today = new Date().getDay(); // 0=Sun
  const streakDays = days.map((_, i) => i < profile.stats.streak % 7);

  const rankColors = [
    'bg-yellow-100 text-yellow-700',
    'bg-gray-100 text-gray-600',
    'bg-orange-100 text-orange-700',
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">
          Welcome, {profile.displayName.split(' ')[0]}
        </h1>
        <h2 className="text-xl font-bold text-gray-900">Jump back in</h2>
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

          {/* Leaderboard Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800">
                  <span className="text-lg">⚗️</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-900">
                    CHEMISTRY LEAGUE
                  </p>
                  <p className="text-xs text-gray-500">Weekly</p>
                </div>
              </div>
              <ExternalLink size={16} className="text-gray-400" />
            </div>

            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div
                  key={entry.uid}
                  className={`flex items-center gap-3 rounded-lg px-2 py-1.5 ${
                    entry.uid === profile.uid ? 'bg-primary/5' : ''
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${
                      i < 3 ? rankColors[i] : 'text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${
                      [
                        'bg-blue-400',
                        'bg-pink-400',
                        'bg-green-400',
                        'bg-purple-400',
                        'bg-orange-400',
                      ][i % 5]
                    }`}
                  >
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium text-gray-800">
                    {entry.displayName}
                  </span>
                  <span className="text-sm text-gray-500">
                    {entry.xp.toLocaleString()} XP
                  </span>
                </div>
              ))}
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

            {/* Course Icon */}
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

            {/* Lessons in this course */}
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

            {/* Start Button */}
            <Link
              href={nextMaterial ? `/materi/${nextMaterial.id}` : '/materi'}
              className="mt-6 block w-full rounded-xl bg-primary py-4 text-center text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Start
            </Link>
          </div>

          {/* Course Topic Icons (bottom row) */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {courseTopics.slice(0, 7).map((topic, i) => (
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
