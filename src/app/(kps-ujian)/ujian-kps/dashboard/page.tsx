'use client';

import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  KPS_LEVEL_LABELS,
  KPS_LEVEL_COLORS,
  KPSDifficultyLevel,
} from '@/types/kps';
import {
  BarChart3,
  Trophy,
  Calendar,
  Clock,
  ArrowRight,
  FileText,
  Download,
  History,
  BookOpen,
  TrendingUp,
  Target,
  Loader2,
  Inbox,
  FlaskConical,
  ChevronRight,
} from 'lucide-react';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

interface DashboardData {
  candidate: { name: string; email: string };
  stats: {
    totalAttempts: number;
    bestScore: number;
    latestScore: number;
    latestLevel: string | null;
    latestTestId: string | null;
    latestCompletedAt: string | null;
  };
  scoreTrend: Array<{ score: number; date: string | null; level: string | null }>;
  recentResults: Array<{
    id: string;
    testId: string | null;
    score: number;
    level: string | null;
    completedAt: string | null;
    totalCorrect: number;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    type: string;
    publishedAt: string | null;
  }>;
}

const UKKBIDashboardPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchDashboard = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/kps/dashboard', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (!data) return null;

  const { candidate, stats, scoreTrend, recentResults, announcements } = data;
  const levelColors = stats.latestLevel ? KPS_LEVEL_COLORS[stats.latestLevel as KPSDifficultyLevel] : null;
  const levelLabel = stats.latestLevel ? KPS_LEVEL_LABELS[stats.latestLevel as KPSDifficultyLevel] : null;

  const quickActions = [
    { icon: BarChart3, label: 'Score Reports', desc: 'Detail skor ujian', href: '/ujian-kps/scores', gradient: 'from-violet-500 to-indigo-500' },
    { icon: Download, label: 'Sertifikat', desc: 'Unduh sertifikat', href: '/ujian-kps/credentials', gradient: 'from-emerald-500 to-teal-500' },
    { icon: History, label: 'Riwayat', desc: 'Riwayat ujian', href: '/ujian-kps/riwayat', gradient: 'from-blue-500 to-cyan-500' },
    { icon: BookOpen, label: 'Belajar', desc: 'Rekomendasi belajar', href: '/ujian-kps/learning', gradient: 'from-amber-500 to-orange-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div {...fade(0)}>
        <h1 className="font-display text-2xl font-extrabold text-stone-800">
          Selamat Datang, {candidate.name}
        </h1>
        <p className="mt-1 text-sm text-stone-400">
          UKKBI — Uji Kompetensi Kimia Berbasis Indikator
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Score Card */}
        <motion.div {...fade(0.05)} className="lg:col-span-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Skor Terbaru</p>
                <div className="mt-2 flex items-end gap-3">
                  <span className="font-display text-5xl font-extrabold text-stone-800">{stats.latestScore}</span>
                  <span className="pb-2 text-sm text-stone-400">/100</span>
                </div>
                {levelLabel && levelColors && (
                  <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${levelColors.bg} ${levelColors.text}`}>
                    {levelLabel}
                  </span>
                )}
                {stats.latestTestId && (
                  <p className="mt-2 text-xs text-stone-400">
                    Test ID: <span className="font-mono font-semibold text-stone-600">{stats.latestTestId}</span>
                  </p>
                )}
                {stats.latestCompletedAt && (
                  <p className="text-xs text-stone-400">
                    {new Date(stats.latestCompletedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-400">Terbaik</p>
                <p className="font-display text-2xl font-extrabold text-stone-800">{stats.bestScore}</p>
                <p className="mt-2 text-xs text-stone-400">Percobaan</p>
                <p className="font-display text-lg font-extrabold text-stone-800">{stats.totalAttempts}</p>
              </div>
            </div>

            {/* Score Trend */}
            {scoreTrend.length > 1 && (
              <div className="mt-6 border-t border-stone-100 pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-400">Tren Skor</p>
                <div className="flex items-end gap-1.5 h-16">
                  {scoreTrend.map((point, i) => {
                    const maxScore = Math.max(...scoreTrend.map(s => s.score), 1);
                    const height = Math.max((point.score / maxScore) * 48, 4);
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-stone-500">{point.score}</span>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}px` }}
                          transition={{ duration: 0.5, delay: 0.3 + i * 0.05 }}
                          className="w-full rounded-t-md bg-gradient-to-t from-violet-500 to-indigo-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div {...fade(0.1)}>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
            <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Aksi Cepat</h3>
            <div className="mt-4 space-y-2.5">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.href}
                    onClick={() => router.push(action.href)}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all hover:bg-stone-50 hover:-translate-y-0.5"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} shadow-sm`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-stone-700">{action.label}</p>
                      <p className="text-xs text-stone-400">{action.desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-stone-300" />
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Results + Announcements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Results */}
        <motion.div {...fade(0.15)}>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Hasil Terbaru</h3>
              <button onClick={() => router.push('/ujian-kps/riwayat')} className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                Lihat Semua
              </button>
            </div>
            {recentResults.length === 0 ? (
              <div className="py-8 text-center">
                <Inbox size={32} className="mx-auto mb-2 text-stone-300" />
                <p className="text-sm text-stone-400">Belum ada hasil ujian</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentResults.map((result) => {
                  const colors = result.level ? KPS_LEVEL_COLORS[result.level as KPSDifficultyLevel] : null;
                  const label = result.level ? KPS_LEVEL_LABELS[result.level as KPSDifficultyLevel] : '-';
                  return (
                    <button
                      key={result.id}
                      onClick={() => router.push(`/ujian-kps/scores/${result.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl p-3.5 text-left transition-all hover:bg-stone-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100">
                          <Target size={16} className="text-stone-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-stone-700">{result.score}/100</p>
                          <p className="text-xs text-stone-400">
                            {result.completedAt ? new Date(result.completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
                            {result.testId && <span className="ml-2 font-mono text-[10px] text-stone-300">{result.testId}</span>}
                          </p>
                        </div>
                      </div>
                      {colors && (
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${colors.bg} ${colors.text}`}>
                          {label}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Announcements */}
        <motion.div {...fade(0.2)}>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Pengumuman</h3>
              <button onClick={() => router.push('/ujian-kps/info')} className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                Lihat Semua
              </button>
            </div>
            {announcements.length === 0 ? (
              <div className="py-8 text-center">
                <Inbox size={32} className="mx-auto mb-2 text-stone-300" />
                <p className="text-sm text-stone-400">Tidak ada pengumuman</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {announcements.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-stone-50 p-3.5">
                    <p className="text-sm font-bold text-stone-700">{item.title}</p>
                    <p className="mt-1 text-xs text-stone-400 line-clamp-2">{item.content}</p>
                    {item.publishedAt && (
                      <p className="mt-2 text-[10px] text-stone-300">
                        {new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UKKBIDashboardPage;
