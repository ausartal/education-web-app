'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getMaterials } from '@/services/materials';
import { getUserProgress } from '@/services/progress';
import { Material, UserProgress } from '@/types/firestore';
import { CheckCircle, Lock } from 'lucide-react';

// Map materials to colorful topic icons and gradients
const topicStyles = [
  {
    icon: '/icons/topic-calculus.svg',
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-500',
  },
  {
    icon: '/icons/topic-atom-model.svg',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-500',
  },
  {
    icon: '/icons/topic-chemistry-flask.svg',
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-500',
  },
  {
    icon: '/icons/topic-coordinate-geometry.svg',
    gradient: 'from-rose-500 to-pink-500',
    bg: 'bg-rose-500',
  },
  {
    icon: '/icons/topic-exponential-functions.svg',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500',
  },
  {
    icon: '/icons/topic-geometric-thinking.svg',
    gradient: 'from-cyan-500 to-blue-500',
    bg: 'bg-cyan-500',
  },
  {
    icon: '/icons/topic-graph-theory.svg',
    gradient: 'from-fuchsia-500 to-pink-500',
    bg: 'bg-fuchsia-500',
  },
];

const MateriPage: FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const fetch = async () => {
      const [mats, prog] = await Promise.all([
        getMaterials(),
        getUserProgress(profile.uid),
      ]);
      setMaterials(mats);
      setProgress(prog);
      setLoading(false);
    };
    fetch();
  }, [profile]);

  const getStatus = (id: string) =>
    progress.find((p) => p.materialId === id)?.status || 'not_started';

  const completedCount = progress.filter(
    (p) => p.status === 'completed'
  ).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
          Materi Pembelajaran
        </h1>
        <p className="text-sm text-gray-500">
          {completedCount} dari {materials.length} materi selesai
        </p>
        {/* Progress */}
        <div className="mx-auto mt-4 h-3 max-w-xs overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-cyan"
            initial={{ width: 0 }}
            animate={{
              width: `${materials.length > 0 ? (completedCount / materials.length) * 100 : 0}%`,
            }}
            transition={{ duration: 0.8 }}
          />
        </div>
      </motion.div>

      {/* Material Cards - Duolingo style */}
      <div className="space-y-4">
        {materials.map((material, i) => {
          const status = getStatus(material.id);
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';
          const isCurrent =
            !isCompleted &&
            (i === 0 || getStatus(materials[i - 1].id) === 'completed');
          const isLocked = !isCompleted && !isInProgress && !isCurrent;
          const style = topicStyles[i % topicStyles.length];

          return (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href={isLocked ? '#' : `/materi/${material.id}`}
                className={`group relative flex items-center gap-5 overflow-hidden rounded-2xl p-5 transition-all duration-300 ${
                  isLocked
                    ? 'cursor-not-allowed bg-gray-100 opacity-50'
                    : isCompleted
                      ? 'bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5'
                      : 'bg-white shadow-md hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                {/* Icon Circle */}
                <div
                  className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${style.gradient} shadow-lg`}
                >
                  <Image
                    src={style.icon}
                    alt=""
                    width={36}
                    height={36}
                    className="brightness-0 invert"
                  />
                  {/* Status overlay */}
                  {isCompleted && (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                      <CheckCircle size={14} className="text-white" />
                    </div>
                  )}
                  {isLocked && (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-400 ring-2 ring-white">
                      <Lock size={12} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="mb-0.5 font-display text-base font-bold text-gray-900 group-hover:text-primary transition-colors">
                    {material.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {material.description}
                  </p>
                </div>

                {/* Right badge */}
                {isCompleted && (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                    ✓ Selesai
                  </span>
                )}
                {isCurrent && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary animate-pulse">
                    Mulai →
                  </span>
                )}
                {isInProgress && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
                    Lanjut
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Extra Topics Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-12"
      >
        <h2 className="mb-5 font-display text-lg font-bold text-gray-900">
          Topik Lainnya
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            {
              name: 'Model Atom',
              icon: '/icons/topic-atom-model.svg',
              color: 'bg-violet-100',
            },
            {
              name: 'Ikatan Kimia',
              icon: '/icons/topic-coordinate-geometry.svg',
              color: 'bg-rose-100',
            },
            {
              name: 'Kesetimbangan',
              icon: '/icons/topic-exponential-functions.svg',
              color: 'bg-amber-100',
            },
            {
              name: 'Laju Reaksi',
              icon: '/icons/topic-regression.svg',
              color: 'bg-cyan-100',
            },
            {
              name: 'Termokimia',
              icon: '/icons/topic-thermometer.svg',
              color: 'bg-orange-100',
            },
            {
              name: 'Elektrokimia',
              icon: '/icons/topic-vectors.svg',
              color: 'bg-indigo-100',
            },
          ].map((topic) => (
            <div
              key={topic.name}
              className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm opacity-60"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${topic.color}`}
              >
                <Image src={topic.icon} alt="" width={22} height={22} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-700">{topic.name}</p>
                <p className="text-[10px] text-gray-400">Coming soon</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MateriPage;
