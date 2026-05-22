'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, BookOpen, Target, Trophy, Flame, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress } from '@/services/progress';
import { getUserAchievements, getAchievements } from '@/services/achievements';
import { getMaterials } from '@/services/materials';
import { Achievement, UserAchievement } from '@/types/firestore';

const ProfilePage: FC = () => {
  const { profile } = useAuth();
  const [completedCount, setCompletedCount] = useState(0);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>(
    []
  );
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const [progress, materials, uAch, aAch] = await Promise.all([
        getUserProgress(profile.uid),
        getMaterials(),
        getUserAchievements(profile.uid),
        getAchievements(),
      ]);
      setCompletedCount(
        progress.filter((p) => p.status === 'completed').length
      );
      setTotalMaterials(materials.length);
      setUserAchievements(uAch);
      setAllAchievements(aAch);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = [
    {
      icon: Zap,
      label: 'Total XP',
      value: profile.stats.xp.toLocaleString(),
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
    {
      icon: Flame,
      label: 'Streak',
      value: `${profile.stats.streak} days`,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      icon: BookOpen,
      label: 'Materials',
      value: `${completedCount}/${totalMaterials}`,
      color: 'text-primary',
      bg: 'bg-blue-50',
    },
    {
      icon: Target,
      label: 'Quizzes',
      value: profile.stats.totalQuizzes.toString(),
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      icon: Trophy,
      label: 'Achievements',
      value: userAchievements.length.toString(),
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      icon: Calendar,
      label: 'Level',
      value: profile.stats.level.toString(),
      color: 'text-rose-500',
      bg: 'bg-rose-50',
    },
  ];

  const unlockedIds = userAchievements.map((ua) => ua.achievementId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center gap-5"
      >
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan text-3xl font-black text-white shadow-lg shadow-primary/25">
          {profile.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            {profile.displayName}
          </h1>
          <p className="text-sm text-gray-500">{profile.email}</p>
          {profile.profile.school && (
            <p className="mt-0.5 text-xs text-gray-400">
              {profile.profile.school}
              {profile.profile.grade && ` • Kelas ${profile.profile.grade}`}
            </p>
          )}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="rounded-2xl bg-white p-4 shadow-sm"
            >
              <div className={`mb-2 inline-flex rounded-xl p-2 ${stat.bg}`}>
                <Icon size={18} className={stat.color} />
              </div>
              <p className="text-xl font-black text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Achievements */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 font-display text-base font-bold text-gray-900">
          Achievements ({userAchievements.length}/{allAchievements.length})
        </h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {allAchievements.map((ach) => {
            const unlocked = unlockedIds.includes(ach.id);
            return (
              <div
                key={ach.id}
                className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all ${
                  unlocked ? 'bg-amber-50' : 'bg-gray-50 opacity-40 grayscale'
                }`}
                title={ach.description}
              >
                <span className="text-2xl">{ach.icon}</span>
                <span className="text-[10px] font-medium text-gray-700 line-clamp-2">
                  {ach.name}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
