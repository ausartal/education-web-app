'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { getUserProgress } from '@/services/progress';
import { getMaterials } from '@/services/materials';
import { Material, UserProgress } from '@/types/firestore';
import { CheckCircle, Circle, Lock, ArrowRight } from 'lucide-react';

const DashboardPage: FC = () => {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [progress, setProgress] = useState<UserProgress[]>([]);
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

  const getStatus = (id: string) =>
    progress.find((p) => p.materialId === id)?.status || 'not_started';

  const nextMaterial = materials.find((m) => getStatus(m.id) !== 'completed');

  const completedCount = progress.filter(
    (p) => p.status === 'completed'
  ).length;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Greeting + Streak */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Halo, {profile.displayName.split(' ')[0]}! 👋
          </h1>
          <p className="text-sm text-gray-500">Ayo lanjutkan belajar</p>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5">
          <Image src="/icons/fire.png" alt="" width={18} height={18} />
          <span className="text-sm font-bold text-primary-orange">
            {profile.stats.streak}
          </span>
        </div>
      </div>

      {/* Big CTA - Continue Learning */}
      {nextMaterial && (
        <Link
          href={`/materi/${nextMaterial.id}`}
          className="group flex items-center gap-4 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan p-6 text-white shadow-primary transition-all hover:shadow-lg"
        >
          <div className="flex-1">
            <p className="mb-1 text-xs font-medium text-white/70">Lanjutkan</p>
            <h2 className="text-lg font-bold">{nextMaterial.title}</h2>
            <p className="mt-1 text-sm text-white/80">
              {nextMaterial.estimatedTime} menit
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 transition-transform group-hover:translate-x-1">
            <ArrowRight size={24} />
          </div>
        </Link>
      )}

      {/* Progress Summary */}
      <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-5 py-4">
        <div className="flex-1">
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-medium text-gray-700">Progress Materi</span>
            <span className="text-gray-500">
              {completedCount}/{materials.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-cyan transition-all duration-500"
              style={{
                width: `${materials.length > 0 ? (completedCount / materials.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Learning Path */}
      <section>
        <h2 className="mb-4 text-base font-bold text-gray-900">
          Learning Path
        </h2>
        <div className="relative space-y-0">
          {materials.map((material, i) => {
            const status = getStatus(material.id);
            const isCompleted = status === 'completed';
            const isInProgress = status === 'in_progress';
            const isCurrent =
              !isCompleted &&
              (i === 0 || getStatus(materials[i - 1].id) === 'completed');
            const isLocked = !isCompleted && !isInProgress && !isCurrent;

            return (
              <div key={material.id} className="relative flex gap-4">
                {/* Vertical line */}
                {i < materials.length - 1 && (
                  <div
                    className={`absolute left-[19px] top-10 h-full w-0.5 ${
                      isCompleted ? 'bg-success' : 'bg-gray-200'
                    }`}
                  />
                )}

                {/* Icon */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center">
                  {isCompleted ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success text-white">
                      <CheckCircle size={20} />
                    </div>
                  ) : isCurrent || isInProgress ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-primary bg-white">
                      <Circle size={12} className="fill-primary text-primary" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                      <Lock size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <Link
                  href={isLocked ? '#' : `/materi/${material.id}`}
                  className={`mb-4 flex-1 rounded-xl border p-4 transition-all ${
                    isCurrent || isInProgress
                      ? 'border-primary/30 bg-primary/5 hover:shadow-md'
                      : isCompleted
                        ? 'border-success/20 bg-success-light/30'
                        : 'cursor-not-allowed border-gray-100 bg-gray-50 opacity-50'
                  }`}
                >
                  <h3
                    className={`text-sm font-semibold ${
                      isLocked ? 'text-gray-400' : 'text-gray-900'
                    }`}
                  >
                    {material.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {material.description}
                  </p>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/latihan"
          className="rounded-xl border border-gray-100 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="text-2xl">✏️</span>
          <p className="mt-1 text-xs font-medium text-gray-700">Latihan Quiz</p>
        </Link>
        <Link
          href="/ujian"
          className="rounded-xl border border-gray-100 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="text-2xl">🎯</span>
          <p className="mt-1 text-xs font-medium text-gray-700">Mulai Ujian</p>
        </Link>
      </div>
    </div>
  );
};

export default DashboardPage;
