'use client';

import { FC, useState } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion } from 'framer-motion';
import {
  BarChart3, Users, ClipboardList,
  RefreshCw, Download, Target,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AnalyticsData {
  dayKeys: string[];
  userRegistrationsByDay: Record<string, number>;
  examsByDay: Record<string, number>;
  auditActivityByDay: Record<string, number>;
  questionsByDifficulty: { easy: number; moderate: number; hard: number };
  questionsByStatus: { active: number; inactive: number };
  examStatusDistribution: Record<string, number>;
  roleDistribution: { student: number; teacher: number; admin: number };
  avgAccuracy: number;
  totals: {
    users: number; exams: number; questions: number;
    completedExams: number; activeQuestions: number; activeUsers: number;
    classes?: number; examSchedules?: number;
  };
}

function fmtDay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
}

interface ChartProps {
  data: Record<string, number>;
  title: string;
  color: string;
  height?: number;
}

const BarChart: FC<ChartProps> = ({ data, title, color, height = 96 }) => {
  const vals = Object.values(data);
  const keys = Object.keys(data);
  const max = Math.max(...vals, 1);
  const count = keys.length;
  const barW = Math.max(16, Math.min(44, Math.floor(660 / count)));
  const glowColor = color.includes('#') ? color.split(',')[1]?.trim() ?? color : color;

  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{title}</p>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-stone-400">
            Total: <span className="font-bold text-stone-700">{vals.reduce((a, b) => a + b, 0)}</span>
          </span>
          <span className="text-[10px] text-stone-400">
            Maks: <span className="font-bold text-stone-700">{max}</span>
          </span>
        </div>
      </div>

      {/* Grid lines */}
      <div className="relative">
        <div className="absolute inset-x-0 top-0" style={{ height }}>
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <div key={ratio} className="absolute w-full border-t border-dashed border-stone-100" style={{ bottom: `${ratio * 100}%` }}>
              <span className="absolute -top-2 right-0 text-[8px] font-medium text-stone-300">{Math.round(max * ratio)}</span>
            </div>
          ))}
        </div>

        {/* Bars + date labels in single scroll */}
      <div className="overflow-x-auto">
        <div className="px-1" style={{ minWidth: count * (barW + 2) + 8 }}>
          {/* Bars */}
          <div className="flex items-end gap-[2px]" style={{ height }}>
            {vals.map((v, i) => {
              const barH = Math.max((v / max) * height, v > 0 ? 4 : 1);
              return (
                <motion.div
                  key={keys[i]}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: barH, opacity: 1 }}
                  transition={{ duration: 0.5, delay: i * 0.012, ease: [0.22, 1, 0.36, 1] }}
                  className="group/bar relative"
                  style={{ width: barW, height: barH }}
                >
                  <div
                    className="absolute inset-x-[1px] bottom-0 rounded-t transition-all duration-200 group-hover/bar:brightness-110"
                    style={{ height: barH, background: v === 0 ? '#f5f5f4' : color, boxShadow: v === 0 ? 'none' : `0 -2px 8px ${glowColor}22` }}
                  />
                  {v > 0 && (
                    <div className="absolute inset-x-0 flex justify-center" style={{ bottom: barH + 2 }}>
                      <span className="rounded bg-stone-800 px-1 py-0.5 text-[8px] font-bold text-white opacity-0 transition-opacity group-hover/bar:opacity-100">{v}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {/* Date labels row */}
          <div className="flex gap-[2px]" style={{ marginTop: 2 }}>
            {keys.map((k) => (
              <div key={k} className="flex items-start justify-center" style={{ width: barW, minWidth: barW }}>
                <span className="text-[7px] leading-tight text-stone-400" style={{ whiteSpace: 'nowrap' }}>
                  {fmtDay(k).replace(/^\w{3},\s*/, '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

interface HBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
  sub?: string;
}

const HBar: FC<HBarProps> = ({ label, value, total, color, sub }) => {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-stone-700">{label}</span>
          {sub && <span className="ml-2 text-[10px] text-stone-400">{sub}</span>}
        </div>
        <span className="text-xs font-bold text-stone-900">{value} <span className="font-normal text-stone-400">({pct}%)</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
};

const AdminAnalytics: FC = () => {
  const { user } = useAuth();
  const [days, setDays] = useState<7 | 30 | 90>(30);
  // Same key as admin/page.tsx — data served from cache when navigating between pages
  const { data, isLoading: loading, mutate } = useAuthSWR<AnalyticsData>('/api/admin/analytics?days=' + days, {
    dedupingInterval: 60_000,
  });

  const handleExport = async (col: string, fmt: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/admin/export?collection=${col}&format=${fmt}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${col}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const examTotal = Object.values(data.examStatusDistribution).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white">
            <BarChart3 size={18} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-stone-900">Analitik Platform</h1>
            <p className="text-sm text-stone-500">Statistik dan tren {days} hari terakhir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1" aria-label="Pilih periode analitik">
            {([7, 30, 90] as const).map(option => (
              <button key={option} type="button" onClick={() => setDays(option)} className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${days === option ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}`}>
                {option} hari
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {(['users', 'question_bank', 'exam_sessions'] as const).map(col => (
              <div key={col} className="relative group">
                <button className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50">
                  <Download size={13} /> {col === 'users' ? 'Pengguna' : col === 'question_bank' ? 'Soal' : 'Ujian'}
                </button>
                {/* Invisible bridge — covers gap so hover doesn't break */}
                <div className="absolute right-0 top-full z-10 h-3 w-full group-hover:block hidden" />
                {/* Dropdown with visible gap */}
                <div className="absolute right-0 top-full z-20 mt-3 hidden min-w-[140px] flex-col gap-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-stone-200/60 group-hover:flex">
                  <button onClick={() => handleExport(col, 'csv')}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100 text-[8px] font-bold text-emerald-700">CSV</span>
                    Download CSV
                  </button>
                  <button onClick={() => handleExport(col, 'json')}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-900">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-blue-100 text-[8px] font-bold text-blue-700">JSON</span>
                    Download JSON
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => mutate()}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[
          { icon: Users, label: 'Total Pengguna', value: data.totals.users, sub: `${data.totals.activeUsers} aktif`, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: ClipboardList, label: 'Total Ujian', value: data.totals.exams, sub: `${data.totals.completedExams} selesai`, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: Target, label: 'Akurasi Rata2', value: `${data.avgAccuracy}%`, sub: 'ujian selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm">
              <div className={`mb-2 inline-flex rounded-xl p-2 ${k.bg}`}>
                <Icon size={16} className={k.color} />
              </div>
              <p className="font-display text-xl font-black text-stone-900">{k.value}</p>
              <p className="text-[11px] font-semibold text-stone-700">{k.label}</p>
              <p className="text-[10px] text-stone-400">{k.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <BarChart data={data.userRegistrationsByDay} title="Pengguna Baru per Hari" color="linear-gradient(to top, #1A73E8, #60A5FA)" height={120} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <BarChart data={data.examsByDay} title="Ujian per Hari" color="linear-gradient(to top, #7C3AED, #C4B5FD)" height={120} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <BarChart data={data.auditActivityByDay} title="Aktivitas Admin per Hari" color="linear-gradient(to top, #D97706, #FCD34D)" height={120} />
        </motion.div>
      </div>

      {/* Distribution Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Role Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-stone-900">Distribusi Role Pengguna</p>
          <div className="space-y-4">
            <HBar label="Siswa" value={data.roleDistribution.student} total={data.totals.users}
              color="linear-gradient(to right, #1A73E8, #4FC3F7)" sub={`dari ${data.totals.users}`} />
            <HBar label="Guru" value={data.roleDistribution.teacher} total={data.totals.users}
              color="linear-gradient(to right, #059669, #34D399)" />
            <HBar label="Admin" value={data.roleDistribution.admin} total={data.totals.users}
              color="linear-gradient(to right, #7C3AED, #A78BFA)" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-stone-100 pt-4">
            {[
              { label: 'Siswa', val: data.roleDistribution.student, color: 'bg-blue-500' },
              { label: 'Guru', val: data.roleDistribution.teacher, color: 'bg-emerald-500' },
              { label: 'Admin', val: data.roleDistribution.admin, color: 'bg-violet-500' },
            ].map(r => (
              <div key={r.label} className="text-center">
                <div className={`mx-auto mb-1 h-2 w-8 rounded-full ${r.color}`} />
                <p className="text-xs font-bold text-stone-900">{r.val}</p>
                <p className="text-[10px] text-stone-400">{r.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Question Difficulty */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-stone-900">Distribusi Soal</p>
          <div className="space-y-4">
            <HBar label="Mudah" value={data.questionsByDifficulty.easy} total={data.totals.questions}
              color="#10B981" sub="easy" />
            <HBar label="Sedang" value={data.questionsByDifficulty.moderate} total={data.totals.questions}
              color="#F59E0B" sub="moderate" />
            <HBar label="Sulit" value={data.questionsByDifficulty.hard} total={data.totals.questions}
              color="#EF4444" sub="hard" />
          </div>
          <div className="mt-4 flex gap-3 border-t border-stone-100 pt-4">
            <div className="flex-1 rounded-xl bg-emerald-50 p-3 text-center">
              <p className="font-display text-lg font-black text-emerald-700">{data.questionsByStatus.active}</p>
              <p className="text-[10px] text-stone-500">Aktif</p>
            </div>
            <div className="flex-1 rounded-xl bg-stone-50 p-3 text-center">
              <p className="font-display text-lg font-black text-stone-500">{data.questionsByStatus.inactive}</p>
              <p className="text-[10px] text-stone-500">Nonaktif</p>
            </div>
          </div>
        </motion.div>

        {/* Exam Status */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-stone-900">Status Ujian</p>
          <div className="space-y-4">
            <HBar label="Selesai" value={data.examStatusDistribution.completed ?? 0} total={examTotal}
              color="#10B981" />
            <HBar label="Berlangsung" value={data.examStatusDistribution.in_progress ?? 0} total={examTotal}
              color="#3B82F6" />
            <HBar label="Ditinggalkan" value={data.examStatusDistribution.abandoned ?? 0} total={examTotal}
              color="#6B7280" />
            <HBar label="Ditandai" value={data.examStatusDistribution.flagged ?? 0} total={examTotal}
              color="#EF4444" />
          </div>
          <div className="mt-4 rounded-xl bg-stone-50 p-3 text-center border-t border-stone-100 pt-4">
            <p className="font-display text-xl font-black text-stone-900">{examTotal}</p>
            <p className="text-xs text-stone-500">Total Sesi Ujian</p>
          </div>
        </motion.div>
      </div>

    </div>
  );
};

export default AdminAnalytics;
