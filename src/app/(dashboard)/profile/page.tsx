'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, BookOpen, Target, Trophy, Flame, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMaterials } from '@/services/materials';

const ProfilePage: FC = () => {
  const { profile } = useAuth();
  const [completedCount, setCompletedCount] = useState(0);
  const [totalMaterials, setTotalMaterials] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      try {
        const materials = await getMaterials();
        setTotalMaterials(materials.length);
      } catch { /* leave defaults on error */ } finally {
        setLoading(false);
      }
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
  ];

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
    </div>
  );
};

export default ProfilePage;
