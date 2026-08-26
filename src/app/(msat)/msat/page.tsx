'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ClipboardCheck, ClipboardList, BookOpen, Users, Plus, ChevronRight,
  TrendingUp, Brain, Lightbulb, Target, Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import type { MASTExam, MASTExamStatus } from '@/types/mast';

const STATUS_COLORS: Record<MASTExamStatus, string> = {
  draft: 'bg-amber-50 text-amber-700',
  active: 'bg-emerald-50 text-emerald-700',
  in_progress: 'bg-blue-50 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  archived: 'bg-stone-100 text-stone-500',
};

const STATUS_LABELS: Record<MASTExamStatus, string> = {
  draft: 'Draft',
  active: 'Aktif',
  in_progress: 'Berlangsung',
  completed: 'Selesai',
  archived: 'Arsip',
};

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35 },
});

const MSATDashboardPage: FC = () => {
  const { user } = useAuth();
  const { data: examsData, isLoading: examsLoading } = useAuthSWR<{ exams: MASTExam[] }>('/api/admin/mast-exams');
  const { data: questionsData, isLoading: questionsLoading } = useAuthSWR<{ questions: unknown[]; total: number }>('/api/admin/mast-questions?status=all');

  const exams = examsData?.exams ?? [];
  const totalQuestions = questionsData?.total ?? 0;

  const statusCounts = exams.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    { label: 'Total Ujian', value: exams.length, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Ujian Aktif', value: (statusCounts.active ?? 0) + (statusCounts.in_progress ?? 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Bank Soal', value: totalQuestions, icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Draft', value: statusCounts.draft ?? 0, icon: ClipboardCheck, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const cognitiveStats = [
    { label: 'Knowing', desc: 'Pemahaman konsep', icon: Brain, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Applying', desc: 'Penerapan konsep', icon: Lightbulb, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Reasoning', desc: 'Penalaran ilmiah', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const isLoading = examsLoading || questionsLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div {...fade(0)} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900">Dashboard MSAT</h1>
          <p className="text-sm text-gray-500 mt-1">Multistage Adaptive Scored Testing — Kelola ujian adaptif kimia</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/msat/questions"
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <BookOpen size={15} /> Bank Soal
          </Link>
          <Link
            href="/msat/exams/create"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} /> Buat Ujian
          </Link>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div {...fade(0.1)} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <p className="font-display text-3xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs font-semibold text-gray-500 mt-1">{s.label}</p>
            </div>
          );
        })}
      </motion.div>

      {/* Cognitive Domains */}
      <motion.div {...fade(0.15)} className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Domain Kognitif MAST</h2>
        <div className="grid grid-cols-3 gap-4">
          {cognitiveStats.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className={`rounded-xl ${c.bg} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} className={c.color} />
                  <span className="text-sm font-bold text-gray-900">{c.label}</span>
                </div>
                <p className="text-[11px] text-gray-500">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Exams */}
      <motion.div {...fade(0.2)} className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <h2 className="text-sm font-bold text-gray-900">Ujian Terbaru</h2>
          <Link href="/msat/exams" className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
            Lihat Semua <ChevronRight size={12} />
          </Link>
        </div>
        <div className="divide-y divide-stone-100">
          {exams.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardCheck size={32} className="mx-auto mb-3 text-stone-300" />
              <p className="text-sm font-semibold text-gray-400">Belum ada ujian MSAT</p>
              <Link href="/msat/exams/create" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <Plus size={14} /> Buat Ujian Pertama
              </Link>
            </div>
          ) : (
            exams.slice(0, 5).map((exam, i) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <Link href={`/msat/exams/${exam.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                      <ClipboardCheck size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{exam.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="font-mono text-[10px] font-bold text-indigo-600">{exam.examCode}</code>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_COLORS[exam.status] ?? ''}`}>
                          {STATUS_LABELS[exam.status] ?? exam.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-stone-300" />
                </Link>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Adaptive Flow Info */}
      <motion.div {...fade(0.25)} className="rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-violet-50 p-5 border border-indigo-100/60">
        <h2 className="text-sm font-bold text-indigo-900 mb-3">Alur Adaptif MAST</h2>
        <div className="flex items-center gap-3 text-xs">
          <div className="rounded-xl bg-white/80 px-4 py-3 text-center shadow-xs">
            <p className="font-bold text-indigo-700">Stage 1</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Medium (12 soal)</p>
          </div>
          <ChevronRight size={14} className="text-indigo-300" />
          <div className="rounded-xl bg-white/80 px-4 py-3 text-center shadow-xs">
            <p className="font-bold text-blue-700">Stage 2</p>
            <p className="text-[10px] text-gray-500 mt-0.5">High / Low (12 soal)</p>
          </div>
          <ChevronRight size={14} className="text-indigo-300" />
          <div className="rounded-xl bg-white/80 px-4 py-3 text-center shadow-xs">
            <p className="font-bold text-violet-700">Stage 3</p>
            <p className="text-[10px] text-gray-500 mt-0.5">High / Med / Low (12 soal)</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-indigo-600">
          Setiap stage memiliki 12 soal: 4 Knowing + 4 Applying + 4 Reasoning. Threshold kelulusan: ≥8/12 benar.
        </p>
      </motion.div>
    </div>
  );
};

export default MSATDashboardPage;
