'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  TrendingUp, Zap, RefreshCw, Download, Terminal,
  ChevronRight, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, Minus,
  Target, Activity, FileText, BarChart3, FlaskConical, School,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface AnalyticsData {
  dayKeys: string[];
  userRegistrationsByDay: Record<string, number>;
  examsByDay: Record<string, number>;
  auditActivityByDay: Record<string, number>;
  questionsByDifficulty: { easy: number; moderate: number; hard: number };
  questionsByStatus: { active: number; inactive: number };
  topUsers: Array<{ uid: string; displayName: string; role: string; xp: number; level: number }>;
  examStatusDistribution: Record<string, number>;
  roleDistribution: { student: number; teacher: number; admin: number };
  avgXp: number;
  avgAccuracy: number;
  recentExams: Array<{
    id: string; userId: string; userName: string; examId: string;
    theta: string; accuracy: number; proficiencyLevel: string;
    completedAt: string | null; flagged: boolean;
  }>;
  lowAccuracyQuestions: Array<{
    id: string; stem: string; difficulty: string;
    avgCorrectRate: number; usageCount: number; topic: string;
  }>;
  materialStats: Array<{ id: string; title: string; status: string; topic: string; progressCount: number }>;
  today: { users: number; exams: number };
  yesterday: { users: number; exams: number };
  totals: {
    users: number; exams: number; questions: number; materials: number;
    completedExams: number; activeQuestions: number; activeUsers: number;
    classes?: number; examSchedules?: number;
  };
  msat?: {
    avgScore: number;
    comprehensionDistribution: Record<string, number>;
  };
}

function fmtDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Delta({ today, yesterday, label }: { today: number; yesterday: number; label: string }) {
  const diff = today - yesterday;
  const sign = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  return (
    <div className={`flex items-center gap-1 text-[10px] font-semibold ${sign === 'up' ? 'text-emerald-600' : sign === 'down' ? 'text-rose-500' : 'text-gray-400'}`}>
      {sign === 'up' ? <ArrowUp size={10} /> : sign === 'down' ? <ArrowDown size={10} /> : <Minus size={10} />}
      {Math.abs(diff)} {label} vs kemarin
    </div>
  );
}

function MiniBar({ data, color }: { data: Record<string, number>; color: string }) {
  const vals = Object.values(data);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {vals.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm min-h-[2px]"
          style={{ height: `${Math.max((v / max) * 28, v > 0 ? 4 : 2)}px`, background: color, opacity: 0.7 + (i / vals.length) * 0.3 }} />
      ))}
    </div>
  );
}

function BarChart({ data, color, height = 96 }: { data: Record<string, number>; color: string; height?: number }) {
  const vals = Object.values(data);
  const keys = Object.keys(data);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {vals.map((v, i) => (
        <div key={keys[i]} className="flex flex-1 flex-col items-center gap-1">
          {v > 0 && <span className="text-[9px] font-semibold text-gray-500">{v}</span>}
          <div className="w-full rounded-t-md" style={{ height: `${Math.max((v / max) * (height - 20), v > 0 ? 6 : 2)}px`, background: color }} />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{fmtDay(keys[i])}</span>
        </div>
      ))}
    </div>
  );
}

const proficiencyColors: Record<string, string> = {
  rendah: 'bg-rose-50 text-rose-700',
  sedang: 'bg-amber-50 text-amber-700',
  tinggi: 'bg-blue-50 text-blue-700',
  sangat_tinggi: 'bg-emerald-50 text-emerald-700',
};
const difficultyColors: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-700',
};

const AdminDashboard: FC = () => {
  const { user, profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setData(await res.json()); setLastRefresh(new Date()); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExport = async (col: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch(`/api/admin/export?collection=${col}&format=csv`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${col}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const nowStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!data) return null;

  const kpis = [
    {
      icon: Users, label: 'Total Pengguna', value: data.totals.users,
      sub: `${data.totals.activeUsers} aktif`,
      delta: <Delta today={data.today.users} yesterday={data.yesterday.users} label="baru" />,
      color: 'text-primary', bg: 'bg-blue-50', href: '/admin/users',
      chart: <MiniBar data={data.userRegistrationsByDay} color="#1A73E8" />,
    },
    {
      icon: GraduationCap, label: 'Siswa', value: data.roleDistribution.student,
      sub: `${data.roleDistribution.teacher} guru`,
      delta: null, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/users',
      chart: null,
    },
    {
      icon: ClipboardList, label: 'Ujian Selesai', value: data.totals.completedExams,
      sub: `${data.totals.exams} total sesi`,
      delta: <Delta today={data.today.exams} yesterday={data.yesterday.exams} label="ujian" />,
      color: 'text-violet-600', bg: 'bg-violet-50', href: '/admin/analytics',
      chart: <MiniBar data={data.examsByDay} color="#7C3AED" />,
    },
    {
      icon: BookOpen, label: 'Soal Aktif', value: data.totals.activeQuestions,
      sub: `${data.totals.questions} total`,
      delta: null, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/questions',
      chart: null,
    },
    {
      icon: Target, label: 'Akurasi Rata2', value: `${data.avgAccuracy}%`,
      sub: 'ujian selesai', delta: null, color: 'text-teal-600', bg: 'bg-teal-50',
      href: '/admin/analytics', chart: null,
    },
    {
      icon: Zap, label: 'Rata-rata XP', value: data.avgXp,
      sub: 'per siswa', delta: null, color: 'text-orange-600', bg: 'bg-orange-50',
      href: '/admin/analytics', chart: null,
    },
    {
      icon: School, label: 'Kelas', value: data.totals.classes ?? 0,
      sub: `${data.totals.examSchedules ?? 0} jadwal ujian`,
      delta: null, color: 'text-cyan-600', bg: 'bg-cyan-50',
      href: '/admin/ujian', chart: null,
    },
    {
      icon: FlaskConical, label: 'Skor MSAT Rata2', value: data.msat?.avgScore ?? 0,
      sub: 'dari ujian selesai', delta: null, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50',
      href: '/admin/ujian', chart: null,
    },
  ];

  const examCompletionRate = data.totals.exams > 0
    ? Math.round((data.totals.completedExams / data.totals.exams) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            Selamat datang, {profile?.displayName?.split(' ')[0] ?? 'Admin'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{nowStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle size={11} /> Sistem Online
          </span>
          <button onClick={fetchAll}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50">
            <RefreshCw size={13} />
            {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={kpi.href}
                className="group flex flex-col gap-2 rounded-2xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md block">
                <div className="flex items-center justify-between">
                  <div className={`inline-flex rounded-xl p-2 ${kpi.bg}`}>
                    <Icon size={16} className={kpi.color} />
                  </div>
                  {kpi.chart}
                </div>
                <div>
                  <p className="font-display text-xl font-black text-gray-900">{kpi.value}</p>
                  <p className="text-[11px] font-semibold text-gray-700">{kpi.label}</p>
                  <p className="text-[10px] text-gray-400">{kpi.sub}</p>
                  {kpi.delta && <div className="mt-1">{kpi.delta}</div>}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700">Pengguna Baru (7 Hari)</p>
            <span className="text-xs text-gray-400">{Object.values(data.userRegistrationsByDay).reduce((a,b)=>a+b,0)} total</span>
          </div>
          <BarChart data={data.userRegistrationsByDay} color="linear-gradient(to top, #1A73E8, #60A5FA)" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700">Ujian per Hari (7 Hari)</p>
            <span className="text-xs text-gray-400">{Object.values(data.examsByDay).reduce((a,b)=>a+b,0)} total</span>
          </div>
          <BarChart data={data.examsByDay} color="linear-gradient(to top, #7C3AED, #C4B5FD)" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-3 text-xs font-bold text-gray-700">Distribusi Pengguna & Soal</p>
          <div className="space-y-2.5">
            {[
              { label: 'Siswa', val: data.roleDistribution.student, total: data.totals.users, color: '#1A73E8' },
              { label: 'Guru', val: data.roleDistribution.teacher, total: data.totals.users, color: '#059669' },
              { label: 'Soal Mudah', val: data.questionsByDifficulty.easy, total: data.totals.questions, color: '#10B981' },
              { label: 'Soal Sedang', val: data.questionsByDifficulty.moderate, total: data.totals.questions, color: '#F59E0B' },
              { label: 'Soal Sulit', val: data.questionsByDifficulty.hard, total: data.totals.questions, color: '#EF4444' },
            ].map(r => {
              const pct = r.total ? Math.round((r.val / r.total) * 100) : 0;
              return (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between text-[10px]">
                    <span className="text-gray-600">{r.label}</span>
                    <span className="font-semibold text-gray-700">{r.val} <span className="font-normal text-gray-400">({pct}%)</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Middle Row: Recent Exams + Exam Stats */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Exam Sessions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="lg:col-span-2 rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-violet-600" />
              <p className="text-sm font-bold text-gray-900">Ujian Terbaru</p>
            </div>
            <Link href="/admin/analytics" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Semua <ChevronRight size={12} />
            </Link>
          </div>
          {data.recentExams.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Belum ada ujian selesai</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] text-gray-400">
                    <th className="pb-2 text-left font-medium">Pengguna</th>
                    <th className="pb-2 text-left font-medium">Theta</th>
                    <th className="pb-2 text-left font-medium">Akurasi</th>
                    <th className="pb-2 text-left font-medium">Level</th>
                    <th className="pb-2 text-left font-medium">Waktu</th>
                    <th className="pb-2 text-left font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentExams.map(ex => (
                    <tr key={ex.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-3">
                        <p className="font-semibold text-gray-900">{ex.userName}</p>
                        <p className="text-[9px] text-gray-400">{ex.examId}</p>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`font-bold ${parseFloat(ex.theta) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {parseFloat(ex.theta) >= 0 ? '+' : ''}{ex.theta}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${ex.accuracy}%` }} />
                          </div>
                          <span className="font-semibold text-gray-700">{ex.accuracy}%</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${proficiencyColors[ex.proficiencyLevel] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ex.proficiencyLevel}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-[10px] text-gray-400 whitespace-nowrap">{fmtDateTime(ex.completedAt)}</td>
                      <td className="py-2">
                        {ex.flagged && (
                          <span title="Anomali terdeteksi">
                            <AlertTriangle size={12} className="text-amber-500" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* Exam status + completion rate */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="flex flex-col gap-4">
          {/* Completion rate */}
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-bold text-gray-700">Tingkat Penyelesaian Ujian</p>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7C3AED" strokeWidth="3"
                    strokeDasharray={`${examCompletionRate} ${100 - examCompletionRate}`}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-gray-900">
                  {examCompletionRate}%
                </span>
              </div>
              <div className="space-y-1">
                {[
                  { label: 'Selesai', val: data.examStatusDistribution.completed ?? 0, color: 'bg-emerald-400' },
                  { label: 'Berlangsung', val: data.examStatusDistribution.in_progress ?? 0, color: 'bg-blue-400' },
                  { label: 'Ditinggalkan', val: data.examStatusDistribution.abandoned ?? 0, color: 'bg-gray-300' },
                  { label: 'Ditandai', val: data.examStatusDistribution.flagged ?? 0, color: 'bg-amber-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2 text-[10px]">
                    <div className={`h-2 w-2 rounded-full ${s.color}`} />
                    <span className="text-gray-600">{s.label}</span>
                    <span className="font-bold text-gray-900 ml-auto">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-3xl bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-bold text-gray-700">Aksi Cepat</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Pengguna', icon: Users, href: '/admin/users', color: 'bg-blue-50 text-primary' },
                { label: 'Soal', icon: BookOpen, href: '/admin/questions', color: 'bg-amber-50 text-amber-700' },
                { label: 'MSAT', icon: FlaskConical, href: '/admin/ujian', color: 'bg-fuchsia-50 text-fuchsia-700' },
                { label: 'Analitik', icon: BarChart3, href: '/admin/analytics', color: 'bg-violet-50 text-violet-700' },
                { label: 'CLI', icon: Terminal, href: '/admin/cli', color: 'bg-gray-800 text-white' },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <Link key={a.label} href={a.href}
                    className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold transition-all hover:-translate-y-0.5 ${a.color}`}>
                    <Icon size={14} /> {a.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row: Low accuracy questions + Material stats + Top users */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Low accuracy questions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <p className="text-sm font-bold text-gray-900">Soal Bermasalah</p>
            </div>
            <Link href="/admin/questions" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Kelola <ChevronRight size={12} />
            </Link>
          </div>
          {data.lowAccuracyQuestions.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
              <CheckCircle size={13} /> Semua soal dalam kondisi baik
            </div>
          ) : (
            <div className="space-y-2">
              {data.lowAccuracyQuestions.map(q => (
                <div key={q.id} className="rounded-xl bg-amber-50/60 p-3">
                  <p className="text-xs text-gray-800 line-clamp-2">{q.stem}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${difficultyColors[q.difficulty] ?? ''}`}>
                      {q.difficulty}
                    </span>
                    <span className="text-[10px] text-rose-600 font-bold">{q.avgCorrectRate}% benar</span>
                    <span className="text-[10px] text-gray-400">{q.usageCount}× dipakai</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Material stats */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-blue-500" />
              <p className="text-sm font-bold text-gray-900">Materi Terpopuler</p>
            </div>
            <Link href="/admin/content" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Kelola <ChevronRight size={12} />
            </Link>
          </div>
          {data.materialStats.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">Belum ada materi</p>
          ) : (
            <div className="space-y-2">
              {data.materialStats.slice(0, 6).map((m, i) => {
                const maxCount = data.materialStats[0]?.progressCount || 1;
                const pct = Math.round((m.progressCount / maxCount) * 100);
                return (
                  <div key={m.id}>
                    <div className="mb-0.5 flex items-center justify-between">
                      <p className="truncate text-xs font-medium text-gray-800 max-w-[160px]">{m.title}</p>
                      <div className="flex items-center gap-1.5">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${m.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {m.status === 'published' ? 'Live' : 'Draft'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600">{m.progressCount}</span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-blue-400" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Export buttons */}
          <div className="mt-4 flex gap-2 border-t border-gray-50 pt-3">
            <button onClick={() => handleExport('users')}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gray-50 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
              <Download size={10} /> Users CSV
            </button>
            <button onClick={() => handleExport('question_bank')}
              className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-gray-50 py-1.5 text-[10px] font-semibold text-gray-600 hover:bg-gray-100">
              <Download size={10} /> Soal CSV
            </button>
          </div>
        </motion.div>

        {/* Top users leaderboard */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={14} className="text-amber-500" />
              <p className="text-sm font-bold text-gray-900">Top Pengguna (XP)</p>
            </div>
            <Link href="/admin/analytics" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Lebih <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {data.topUsers.map((u, i) => {
              const medals = ['🥇', '🥈', '🥉', '4', '5'];
              const maxXp = data.topUsers[0]?.xp || 1;
              const pct = Math.round((u.xp / maxXp) * 100);
              return (
                <div key={u.uid} className="flex items-center gap-2.5">
                  <span className="w-4 text-xs text-center">{i < 3 ? medals[i] : <span className="text-gray-400 text-[10px]">{i + 1}</span>}</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-[10px] font-black text-white">
                    {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="truncate text-xs font-semibold text-gray-800">{u.displayName}</p>
                      <span className="text-[10px] font-bold text-amber-600 shrink-0 ml-1">{u.xp}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
            {data.topUsers.length === 0 && (
              <p className="py-4 text-center text-xs text-gray-400">Belum ada data XP</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
