'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, BookOpen, FileCheck, BarChart3, Plus, RefreshCw, Loader2,
  ChevronRight, Target, Layers, ClipboardList, GraduationCap, Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface MSATStats {
  totalQuestions: number;
  totalExams: number;
  activeExams: number;
  difficultyCount: Record<string, number>;
  domainCount: Record<string, number>;
  stageCount: Record<number, number>;
}

interface MSATExam {
  id: string;
  code: string;
  title: string;
  description: string;
  module: string;
  totalStages: number;
  questionsPerStage: number;
  status: string;
  currentUses: number;
  maxUses: number;
  createdAt: { _seconds: number } | null;
}

interface MSATQuestion {
  id: string;
  stem: string;
  difficulty: string;
  cognitiveDomain: string;
  stage: number;
  tierPath: string;
  categoryLabel: string;
  topic: string;
  status: string;
}

interface MSATData {
  stats: MSATStats;
  questions: MSATQuestion[];
  exams: MSATExam[];
}

const DIFFICULTY_LABELS: Record<string, { label: string; color: string; bar: string }> = {
  sangat_mudah: { label: 'Sangat Mudah', color: 'text-emerald-700', bar: 'bg-emerald-400' },
  mudah: { label: 'Mudah', color: 'text-green-700', bar: 'bg-green-400' },
  sedang: { label: 'Sedang', color: 'text-amber-700', bar: 'bg-amber-400' },
  sukar: { label: 'Sukar', color: 'text-orange-700', bar: 'bg-orange-400' },
  sangat_sukar: { label: 'Sangat Sukar', color: 'text-rose-700', bar: 'bg-rose-400' },
};

const DOMAIN_LABELS: Record<string, { label: string; color: string; bar: string }> = {
  knowing: { label: 'Knowing', color: 'text-blue-700', bar: 'bg-blue-400' },
  applying: { label: 'Applying', color: 'text-violet-700', bar: 'bg-violet-400' },
  reasoning: { label: 'Reasoning', color: 'text-pink-700', bar: 'bg-pink-400' },
};

const quickActions = [
  { label: 'Bank Soal', desc: 'Kelola soal MSAT', icon: BookOpen, href: '/admin/msat/questions', accent: 'from-blue-500 to-cyan-500', ring: 'ring-blue-100 hover:ring-blue-300' },
  { label: 'Buat Ujian', desc: 'Buat ujian baru', icon: Plus, href: '/admin/msat/create', accent: 'from-violet-500 to-purple-500', ring: 'ring-violet-100 hover:ring-violet-300' },
  { label: 'Hasil Ujian', desc: 'Rekap nilai siswa', icon: BarChart3, href: '/admin/msat/results', accent: 'from-emerald-500 to-teal-500', ring: 'ring-emerald-100 hover:ring-emerald-300' },
];

const MsatPage: FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<MSATData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setRefreshing(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin/msat', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const stats = data?.stats;
  const exams = data?.exams ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Ujian MSAT</h1>
          <p className="mt-0.5 text-xs text-stone-400">Multistage Adaptive Scored Testing</p>
        </div>
        <button
          onClick={() => fetchData()}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-stone-500 ring-1 ring-stone-200 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Quick Access — Prominent top section */}
      <div className="grid gap-3 sm:grid-cols-3">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href={action.href}
                className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-white p-5 ring-1 ${action.ring} transition-all hover:-translate-y-0.5 hover:shadow-lg`}
              >
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${action.accent} shadow-sm`}>
                  <Icon size={20} className="text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-stone-700">{action.label}</p>
                  <p className="mt-0.5 text-[11px] text-stone-400">{action.desc}</p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-stone-400" />
                <div className={`absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r ${action.accent} opacity-0 transition-opacity group-hover:opacity-100`} />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Ujian', value: stats?.totalExams ?? 0, icon: FileCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Ujian Aktif', value: stats?.activeExams ?? 0, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Bank Soal', value: stats?.totalQuestions ?? 0, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Domain Kognitif', value: Object.keys(stats?.domainCount ?? {}).length, icon: Layers, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.04 }}
              className="rounded-2xl bg-white p-4 ring-1 ring-stone-100"
            >
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}>
                <Icon size={14} className={s.color} />
              </div>
              <p className="mt-2.5 font-display text-2xl font-black text-stone-800">{s.value}</p>
              <p className="text-[11px] font-medium text-stone-400">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Distribution + Stage Info */}
      <div className="grid gap-3 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Distribusi Kesulitan</h3>
          <div className="space-y-2">
            {Object.entries(DIFFICULTY_LABELS).map(([key, cfg]) => {
              const count = stats?.difficultyCount[key] ?? 0;
              const total = stats?.totalQuestions ?? 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-24 shrink-0 text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-stone-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      className={`h-2 rounded-full ${cfg.bar}`}
                      style={{ minWidth: count > 0 ? '6px' : '0' }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-semibold text-stone-500">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Domain Kognitif per Stage</h3>
          <div className="space-y-2">
            {Object.entries(DOMAIN_LABELS).map(([key, cfg]) => {
              const count = stats?.domainCount[key] ?? 0;
              const total = stats?.totalQuestions ?? 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className={`w-20 shrink-0 text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                  <div className="flex-1 overflow-hidden rounded-full bg-stone-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.55, duration: 0.5 }}
                      className={`h-2 rounded-full ${cfg.bar}`}
                      style={{ minWidth: count > 0 ? '6px' : '0' }}
                    />
                  </div>
                  <span className="w-8 text-right text-[11px] font-semibold text-stone-500">{count}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            {Object.entries(stats?.stageCount ?? {}).sort(([a], [b]) => Number(a) - Number(b)).map(([stage, count]) => (
              <div key={stage} className="flex-1 rounded-xl bg-stone-50 px-3 py-2 text-center">
                <p className="text-base font-black text-stone-700">{count}</p>
                <p className="text-[10px] text-stone-400">Stage {stage}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Exams List */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="rounded-2xl bg-white ring-1 ring-stone-100">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-stone-700">Daftar Ujian</h3>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400">{exams.length} ujian</span>
            <Link href="/admin/msat/create" className="flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-600 transition-colors hover:bg-violet-100">
              <Plus size={11} /> Baru
            </Link>
          </div>
        </div>

        {exams.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-100">
              <FileCheck size={20} className="text-stone-400" />
            </div>
            <p className="text-sm font-semibold text-stone-500">Belum ada ujian</p>
            <p className="mt-1 text-xs text-stone-400">Buat ujian MSAT pertama untuk memulai</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {exams.map((exam) => (
              <Link
                key={exam.id}
                href={`/admin/msat/${exam.id}`}
                className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-stone-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                  <Brain size={16} className="text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-stone-700 group-hover:text-violet-700">{exam.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-stone-400">
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono font-bold text-stone-500">{exam.code}</span>
                    <span>{exam.module}</span>
                    <span>·</span>
                    <span>{exam.totalStages} stage</span>
                    <span>·</span>
                    <span>{exam.currentUses} peserta</span>
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  exam.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-500'
                }`}>
                  {exam.status === 'active' ? 'Aktif' : exam.status}
                </span>
                <ChevronRight size={14} className="shrink-0 text-stone-300 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MsatPage;
