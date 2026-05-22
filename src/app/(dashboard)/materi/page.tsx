'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, Clock, CheckCircle, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMaterials } from '@/services/materials';
import { getUserProgress } from '@/services/progress';
import { Material, UserProgress } from '@/types/firestore';

const MateriPage: FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [search, setSearch] = useState('');
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

  const filtered = materials.filter(
    (m) =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.description.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
          Learning Materials
        </h1>
        <p className="text-sm text-gray-500">
          {completedCount} of {materials.length} completed
        </p>

        {/* Progress bar */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-cyan"
            initial={{ width: 0 }}
            animate={{
              width: `${materials.length > 0 ? (completedCount / materials.length) * 100 : 0}%`,
            }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search materials..."
          className="w-full rounded-2xl bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none transition-shadow focus:shadow-md focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Material Cards */}
      <div className="space-y-4">
        {filtered.map((material, i) => {
          const status = getStatus(material.id);
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';

          return (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/materi/${material.id}`}
                className="group flex items-center gap-5 rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Status indicator */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-600'
                      : isInProgress
                        ? 'bg-blue-100 text-primary'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle size={22} />
                  ) : (
                    <BookOpen size={22} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="mb-0.5 font-display text-base font-bold text-gray-900 group-hover:text-primary">
                    {material.title}
                  </h3>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {material.description}
                  </p>
                </div>

                {/* Meta */}
                <div className="hidden items-center gap-1.5 text-gray-400 sm:flex">
                  <Clock size={14} />
                  <span className="text-xs">{material.estimatedTime} min</span>
                </div>

                {/* Badge */}
                {isCompleted && (
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                    Done
                  </span>
                )}
                {isInProgress && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                    In Progress
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-gray-400">No materials found</p>
        </div>
      )}
    </div>
  );
};

export default MateriPage;
