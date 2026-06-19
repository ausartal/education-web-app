'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, ClipboardList, Activity,
  TrendingUp, Zap, Shield, RefreshCw, Download, Terminal,
  ChevronRight, CheckCircle, AlertCircle, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface AnalyticsData {
  dayKeys: string[];
  userRegistrationsByDay: Record<string, number>;
  examsByDay: Record<string, number>;
  questionsByDifficulty: { easy: number; moderate: number; hard: number };
  questionsByStatus: { active: number; inactive: number };
  topUsers: Array<{ uid: string; displayName: string; role: string; xp: number; level: number }>;
  examStatusDistribution: Record<string, number>;
  roleDistribution: { student: number; teacher: number; admin: number };
  avgXp: number;
  avgAccuracy: number;
  totals: {
    users: number; exams: number; questions: number;
    completedExams: number; activeQuestions: number; activeUsers: number;
  };
}

interface StatsData {
  users: { total: number; byRole: Record<string, number>; active: number };
  materials: number;
  questions: number;
  exams: number;
  recentUsers: Array<{ uid: string; displayName: string; email: string; role: string; createdAt: { seconds?: number } }>;
}

function fmtDay(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
}

function BarChart({ data, label, color }: { data: Record<string, number>; label: string; color: string }) {
  const vals = Object.values(data);
  const keys = Object.keys(data);
  const max = Math.max(...vals, 1);
  return (
    <div>
      <p className="mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="flex items-end gap-1.5 h-24">
        {vals.map((v, i) => (
          <div key={keys[i]} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[9px] font-semibold text-gray-500">{v || ''}</span>
            <div className="w-full rounded-t-md transition-all duration-500" style={{ height: `${Math.max((v / max) * 72, v > 0 ? 6 : 2)}px`, background: color }} />
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{fmtDay(keys[i])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-800">{value} <span className="font-normal text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

const AdminDashboard: FC = () => {
  const { user, profile } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [analyticsRes, statsRes] = await Promise.all([
        fetch('/api/admin/analytics', { headers }),
        fetch('/api/admin/stats', { headers }),
      ]);
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      setLastRefresh(new Date());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const kpis = analytics ? [
    { icon: Users, label: 'Total Pengguna', value: analytics.totals.users, sub: `${analytics.totals.activeUsers} aktif`, color: 'text-primary', bg: 'bg-blue-50', href: '/admin/users' },
    { icon: GraduationCap, label: 'Siswa', value: analytics.roleDistribution.student, sub: `${analytics.roleDistribution.teacher} guru`, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/admin/users' },
    { icon: ClipboardList, label: 'Ujian Selesai', value: analytics.totals.completedExams, sub: `${analytics.totals.exams} total`, color: 'text-violet-600', bg: 'bg-violet-50', href: '/admin/analytics' },
    { icon: BookOpen, label: 'Soal Aktif', value: analytics.totals.activeQuestions, sub: `${analytics.totals.questions} total`, color: 'text-amber-600', bg: 'bg-amber-50', href: '/admin/questions' },
    { icon: Zap, label: 'Rata-rata XP', value: analytics.avgXp, sub: 'per siswa', color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/analytics' },
    { icon: TrendingUp, label: 'Akurasi Rata2', value: `${analytics.avgAccuracy}%`, sub: 'ujian selesai', color: 'text-teal-600', bg: 'bg-teal-50', href: '/admin/analytics' },
  ] : [];

  const quickActions = [
    { label: 'Buat Pengguna', icon: Users, href: '/admin/users', color: 'bg-primary text-white' },
    { label: 'Tambah Soal', icon: BookOpen, href: '/admin/questions', color: 'bg-emerald-500 text-white' },
    { label: 'Analytics', icon: BarChart3, href: '/admin/analytics', color: 'bg-violet-500 text-white' },
    { label: 'CLI Terminal', icon: Terminal, href: '/admin/cli', color: 'bg-gray-800 text-white' },
    { label: 'Audit Log', icon: ClipboardList, href: '/admin/logs', color: 'bg-amber-500 text-white' },
    { label: 'Pengaturan', icon: Shield, href: '/admin/config', color: 'bg-gray-500 text-white' },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            Selamat datang, {profile?.displayName?.split(' ')[0] ?? 'Admin'}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle size={12} /> Sistem Online
          </span>
          <button onClick={fetchAll}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50">
            <RefreshCw size={13} />
            <span className="hidden sm:inline">
              {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}>
              <Link href={kpi.href}
                className="group flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className={`inline-flex w-fit rounded-xl p-2 ${kpi.bg}`}>
                  <Icon size={18} className={kpi.color} />
                </div>
                <div>
                  <p className="font-display text-xl font-black text-gray-900">{kpi.value}</p>
                  <p className="text-[11px] font-semibold text-gray-700">{kpi.label}</p>
                  <p className="text-[10px] text-gray-400">{kpi.sub}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      {analytics && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* User Registrations chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="rounded-3xl bg-white p-5 shadow-sm">
            <BarChart data={analytics.userRegistrationsByDay} label="Pengguna Baru (7 Hari)" color="linear-gradient(to top, #1A73E8, #4FC3F7)" />
          </motion.div>

          {/* Exams chart */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-3xl bg-white p-5 shadow-sm">
            <BarChart data={analytics.examsByDay} label="Ujian Dilakukan (7 Hari)" color="linear-gradient(to top, #7C3AED, #A78BFA)" />
          </motion.div>

          {/* Role Distribution */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Distribusi Role</p>
            <div className="space-y-3">
              <RoleBar label="Siswa" value={analytics.roleDistribution.student} total={analytics.totals.users} color="linear-gradient(to right, #1A73E8, #4FC3F7)" />
              <RoleBar label="Guru" value={analytics.roleDistribution.teacher} total={analytics.totals.users} color="linear-gradient(to right, #059669, #34D399)" />
              <RoleBar label="Admin" value={analytics.roleDistribution.admin} total={analytics.totals.users} color="linear-gradient(to right, #7C3AED, #A78BFA)" />
            </div>
            {/* Question difficulty */}
            <p className="mb-3 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Soal per Tingkat</p>
            <div className="space-y-3">
              <RoleBar label="Mudah" value={analytics.questionsByDifficulty.easy} total={analytics.totals.questions} color="#10B981" />
              <RoleBar label="Sedang" value={analytics.questionsByDifficulty.moderate} total={analytics.totals.questions} color="#F59E0B" />
              <RoleBar label="Sulit" value={analytics.questionsByDifficulty.hard} total={analytics.totals.questions} color="#EF4444" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Signups */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Pengguna Terbaru</p>
            <Link href="/admin/users" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Lihat semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {stats?.recentUsers?.slice(0, 5).map(u => {
              const roleColors: Record<string, string> = {
                student: 'bg-blue-50 text-blue-700',
                teacher: 'bg-emerald-50 text-emerald-700',
                admin: 'bg-violet-50 text-violet-700',
              };
              const ts = u.createdAt?.seconds ? new Date(u.createdAt.seconds * 1000) : null;
              return (
                <div key={u.uid} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan text-xs font-black text-white">
                      {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{u.displayName}</p>
                      <p className="text-[10px] text-gray-400">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleColors[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role}
                    </span>
                    {ts && <span className="text-[10px] text-gray-400">{ts.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions + Exam Status */}
        <div className="flex flex-col gap-4">
          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
            className="rounded-3xl bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-bold text-gray-900">Aksi Cepat</p>
            <div className="grid grid-cols-3 gap-2">
              {quickActions.map(a => {
                const Icon = a.icon;
                return (
                  <Link key={a.label} href={a.href}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center transition-all hover:-translate-y-0.5 ${a.color}`}>
                    <Icon size={18} />
                    <span className="text-[10px] font-semibold leading-tight">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>

          {/* Exam Status + Export */}
          {analytics && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Status Ujian</p>
                <div className="flex gap-1.5">
                  <ExportButton label="CSV" col="users" user={user} />
                  <ExportButton label="JSON" col="users" fmt="json" user={user} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Selesai', value: analytics.examStatusDistribution.completed ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Berlangsung', value: analytics.examStatusDistribution.in_progress ?? 0, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Ditinggalkan', value: analytics.examStatusDistribution.abandoned ?? 0, color: 'text-gray-500', bg: 'bg-gray-50' },
                  { label: 'Ditandai', value: analytics.examStatusDistribution.flagged ?? 0, color: 'text-red-600', bg: 'bg-red-50' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl px-3 py-2.5 ${s.bg}`}>
                    <p className={`font-display text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-gray-50 px-3 py-2">
                <AlertCircle size={12} className="text-gray-400" />
                <p className="text-[10px] text-gray-500">
                  {analytics.examStatusDistribution.flagged > 0
                    ? `${analytics.examStatusDistribution.flagged} ujian ditandai anomali`
                    : 'Tidak ada anomali terdeteksi'}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Top Users */}
      {analytics && analytics.topUsers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-900">Top 5 Pengguna (XP)</p>
            <Link href="/admin/analytics" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Analitik lengkap <ChevronRight size={12} />
            </Link>
          </div>
          <div className="flex items-end gap-3">
            {analytics.topUsers.map((u, i) => {
              const maxXp = analytics.topUsers[0]?.xp || 1;
              const heights = [80, 64, 56, 44, 36];
              return (
                <div key={u.uid} className="flex flex-1 flex-col items-center gap-2">
                  <p className="text-xs font-bold text-amber-600">{u.xp} XP</p>
                  <div className="w-full rounded-t-xl bg-gradient-to-t from-amber-400 to-yellow-300 transition-all"
                    style={{ height: `${Math.max((u.xp / maxXp) * heights[0], heights[i] ?? 20)}px` }} />
                  <div className="text-center">
                    <p className="text-[11px] font-semibold text-gray-700 truncate max-w-[60px]">{u.displayName}</p>
                    <p className="text-[9px] text-gray-400">Lv.{u.level}</p>
                  </div>
                  {i === 0 && <span className="text-xs">🥇</span>}
                  {i === 1 && <span className="text-xs">🥈</span>}
                  {i === 2 && <span className="text-xs">🥉</span>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

function ExportButton({ label, col, fmt = 'csv', user }: {
  label: string; col: string; fmt?: string;
  user: { getIdToken: () => Promise<string> } | null;
}) {
  const handleExport = async () => {
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
    a.download = `${col}-export.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button onClick={handleExport}
      className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 transition-colors hover:bg-gray-200">
      <Download size={10} /> {label}
    </button>
  );
}

export default AdminDashboard;
