'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, GraduationCap, BookOpen, ClipboardList,
  TrendingUp, Zap, RefreshCw, Download, Terminal,
  ChevronRight, AlertTriangle, CheckCircle, ArrowUp, ArrowDown,
  Target, Activity, FileText, BarChart3, FlaskConical, School,
  Minus, Calendar,
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
  msat?: { avgScore: number; comprehensionDistribution: Record<string, number> };
}

function fmtDay(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
}
function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Trend({ today, yesterday, label }: { today: number; yesterday: number; label: string }) {
  const diff = today - yesterday;
  if (diff === 0) return <span className="flex items-center gap-0.5 text-[11px] text-gray-400"><Minus size={10} /> Sama dengan kemarin</span>;
  const up = diff > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[11px] font-medium ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
      {up ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
      {Math.abs(diff)} {label} vs kemarin
    </span>
  );
}

function SparkBar({ data, color }: { data: Record<string, number>; color: string }) {
  const vals = Object.values(data);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-[2px] h-7">
      {vals.map((v, i) => (
        <div key={i} className="flex-1 rounded-[2px]"
          style={{
            height: `${Math.max((v / max) * 100, v > 0 ? 15 : 5)}%`,
            background: color,
            opacity: 0.4 + (i / (vals.length - 1)) * 0.6,
          }} />
      ))}
    </div>
  );
}

function BarChart({ data, color }: { data: Record<string, number>; color: string }) {
  const vals = Object.values(data);
  const keys = Object.keys(data);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-1.5 h-28 pt-4">
      {vals.map((v, i) => (
        <div key={keys[i]} className="flex flex-1 flex-col items-center gap-1">
          {v > 0 && <span className="text-[9px] font-bold text-gray-500">{v}</span>}
          <div className="w-full rounded-t-[3px] transition-all"
            style={{
              height: `${Math.max((v / max) * 80, v > 0 ? 8 : 2)}px`,
              background: color,
              opacity: 0.6 + (i / (vals.length - 1)) * 0.4,
            }} />
          <span className="text-[9px] text-gray-400 truncate w-full text-center leading-none">{fmtDay(keys[i])}</span>
        </div>
      ))}
    </div>
  );
}

const proficiencyStyle: Record<string, string> = {
  rendah: 'bg-rose-50 text-rose-600 border border-rose-100',
  sedang: 'bg-amber-50 text-amber-600 border border-amber-100',
  tinggi: 'bg-blue-50 text-blue-600 border border-blue-100',
  sangat_tinggi: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
};
const diffStyle: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-700',
  hard: 'bg-rose-50 text-rose-600',
};

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay, ease: 'easeOut' as const },
});

const AdminDashboard: FC = () => {
  const { user, profile } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchAll = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { setData(await res.json()); setLastRefresh(new Date()); }
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
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

  if (loading) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
      <p className="text-xs text-gray-400">Memuat data dashboard…</p>
    </div>
  );
  if (!data) return null;

  const examCompletionRate = data.totals.exams > 0
    ? Math.round((data.totals.completedExams / data.totals.exams) * 100) : 0;

  const nowStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* ── KPI definitions ── */
  const primaryKpis = [
    {
      icon: Users, label: 'Total Pengguna', value: data.totals.users,
      sub: `${data.totals.activeUsers} aktif`, href: '/admin/users',
      cardBg: 'bg-sky-50 border border-sky-100/80',
      numColor: 'text-sky-700', labelColor: 'text-sky-600', subColor: 'text-sky-400', iconColor: 'text-sky-500',
      trend: <Trend today={data.today.users} yesterday={data.yesterday.users} label="baru" />,
      spark: <SparkBar data={data.userRegistrationsByDay} color="#0284C7" />,
    },
    {
      icon: ClipboardList, label: 'Ujian Selesai', value: data.totals.completedExams,
      sub: `${data.totals.exams} total sesi`, href: '/admin/analytics',
      cardBg: 'bg-violet-50 border border-violet-100/80',
      numColor: 'text-violet-700', labelColor: 'text-violet-600', subColor: 'text-violet-400', iconColor: 'text-violet-500',
      trend: <Trend today={data.today.exams} yesterday={data.yesterday.exams} label="ujian" />,
      spark: <SparkBar data={data.examsByDay} color="#7C3AED" />,
    },
    {
      icon: BookOpen, label: 'Soal Aktif', value: data.totals.activeQuestions,
      sub: `${data.totals.questions} total soal`, href: '/admin/questions',
      cardBg: 'bg-amber-50 border border-amber-100/80',
      numColor: 'text-amber-700', labelColor: 'text-amber-600', subColor: 'text-amber-400', iconColor: 'text-amber-500',
      trend: null, spark: null,
    },
    {
      icon: FlaskConical, label: 'Skor MSAT Rata-rata', value: data.msat?.avgScore ?? 0,
      sub: 'dari sesi selesai', href: '/admin/ujian',
      cardBg: 'bg-rose-50 border border-rose-100/80',
      numColor: 'text-rose-700', labelColor: 'text-rose-600', subColor: 'text-rose-400', iconColor: 'text-rose-500',
      trend: null, spark: null,
    },
  ];

  const secondaryKpis = [
    { icon: GraduationCap, label: 'Siswa', value: data.roleDistribution.student, sub: `${data.roleDistribution.teacher} guru`, color: 'text-emerald-600', href: '/admin/users' },
    { icon: Target, label: 'Akurasi Rata-rata', value: `${data.avgAccuracy}%`, sub: 'ujian selesai', color: 'text-teal-600', href: '/admin/analytics' },
    { icon: School, label: 'Kelas', value: data.totals.classes ?? 0, sub: `${data.totals.examSchedules ?? 0} jadwal ujian`, color: 'text-cyan-600', href: '/admin/ujian' },
    { icon: Zap, label: 'XP Rata-rata', value: data.avgXp, sub: 'per siswa', color: 'text-orange-500', href: '/admin/analytics' },
  ];

  return (
    <div className="space-y-5 pb-6">

      {/* ── HEADER ── */}
      <motion.div {...fade(0)}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-50 via-indigo-50 to-sky-50 px-7 py-6 border border-violet-100/60">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-32 h-32 w-32 rounded-full bg-sky-200/30 blur-2xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-violet-400">
              <Calendar size={11} />
              {nowStr}
            </p>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-stone-900">
              Halo, {profile?.displayName?.split(' ')[0] ?? 'Admin'} 👋
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {data.totals.users} pengguna terdaftar · {data.totals.activeUsers} aktif hari ini
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sistem Online
            </span>
            <button onClick={() => fetchAll(true)} disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-xs transition-colors hover:bg-stone-50 disabled:opacity-50">
              <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
              {lastRefresh.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── PRIMARY KPI CARDS ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {primaryKpis.map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} {...fade(0.05 + i * 0.05)}>
              <Link href={k.href}
                className={`group flex flex-col justify-between rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md block h-full ${k.cardBg}`}>
                <div className="flex items-start justify-between">
                  <Icon size={20} className={k.iconColor} />
                  {k.spark && <div className="w-20 opacity-70">{k.spark}</div>}
                </div>
                <div className="mt-4">
                  <p className={`font-display text-3xl font-black tracking-tight ${k.numColor}`}>{k.value}</p>
                  <p className={`mt-0.5 text-[13px] font-semibold ${k.labelColor}`}>{k.label}</p>
                  <p className={`text-[11px] ${k.subColor}`}>{k.sub}</p>
                  {k.trend && <div className="mt-2">{k.trend}</div>}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* ── SECONDARY KPI STRIP ── */}
      <motion.div {...fade(0.25)} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {secondaryKpis.map(k => {
          const Icon = k.icon;
          return (
            <Link key={k.label} href={k.href}
              className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xs border border-stone-100 transition-all hover:shadow-md hover:border-stone-200">
              <Icon size={17} className={k.color} />
              <div className="min-w-0">
                <p className="font-display text-lg font-extrabold text-stone-900 leading-none">{k.value}</p>
                <p className="truncate text-xs font-medium text-stone-500">{k.label}</p>
                <p className="text-[10px] text-stone-400">{k.sub}</p>
              </div>
            </Link>
          );
        })}
      </motion.div>

      {/* ── CHARTS ROW ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div {...fade(0.3)} className="rounded-2xl bg-white p-5 shadow-xs border border-stone-100">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">Pengguna Baru</p>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">
              {Object.values(data.userRegistrationsByDay).reduce((a, b) => a + b, 0)} total · 7 hari
            </span>
          </div>
          <p className="mb-3 text-[11px] text-gray-400">Registrasi harian</p>
          <BarChart data={data.userRegistrationsByDay} color="#3B82F6" />
        </motion.div>

        <motion.div {...fade(0.35)} className="rounded-2xl bg-white p-5 shadow-xs border border-stone-100">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-bold text-gray-800">Sesi Ujian</p>
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600">
              {Object.values(data.examsByDay).reduce((a, b) => a + b, 0)} total · 7 hari
            </span>
          </div>
          <p className="mb-3 text-[11px] text-gray-400">Ujian per hari</p>
          <BarChart data={data.examsByDay} color="#7C3AED" />
        </motion.div>

        <motion.div {...fade(0.4)} className="rounded-2xl bg-white p-5 shadow-xs border border-stone-100">
          <p className="mb-1 text-sm font-bold text-gray-800">Distribusi</p>
          <p className="mb-4 text-[11px] text-gray-400">Pengguna & tingkat soal</p>
          <div className="space-y-3">
            {[
              { label: 'Siswa', val: data.roleDistribution.student, total: data.totals.users, color: '#3B82F6', pill: 'bg-blue-50 text-blue-600' },
              { label: 'Guru', val: data.roleDistribution.teacher, total: data.totals.users, color: '#10B981', pill: 'bg-emerald-50 text-emerald-600' },
              { label: 'Soal Mudah', val: data.questionsByDifficulty.easy, total: data.totals.questions, color: '#10B981', pill: 'bg-emerald-50 text-emerald-600' },
              { label: 'Soal Sedang', val: data.questionsByDifficulty.moderate, total: data.totals.questions, color: '#F59E0B', pill: 'bg-amber-50 text-amber-600' },
              { label: 'Soal Sulit', val: data.questionsByDifficulty.hard, total: data.totals.questions, color: '#EF4444', pill: 'bg-rose-50 text-rose-600' },
            ].map(r => {
              const pct = r.total ? Math.round((r.val / r.total) * 100) : 0;
              return (
                <div key={r.label}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-gray-600">{r.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.pill}`}>{r.val} · {pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: r.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ── MAIN CONTENT ROW ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Recent Exams – spans 2 cols */}
        <motion.div {...fade(0.45)} className="lg:col-span-2 rounded-2xl bg-white shadow-xs border border-stone-100">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50">
                <Activity size={14} className="text-violet-600" />
              </div>
              <p className="text-sm font-bold text-gray-900">Ujian Terbaru</p>
            </div>
            <Link href="/admin/analytics"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-blue-50">
              Semua <ChevronRight size={12} />
            </Link>
          </div>
          {data.recentExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
                <ClipboardList size={22} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-400">Belum ada ujian selesai</p>
              <p className="mt-1 text-xs text-gray-300">Data akan muncul setelah siswa menyelesaikan ujian</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-50 bg-gray-50/50 text-[11px] text-gray-400">
                    <th className="px-5 py-3 text-left font-semibold">Pengguna</th>
                    <th className="px-4 py-3 text-left font-semibold">Theta</th>
                    <th className="px-4 py-3 text-left font-semibold">Akurasi</th>
                    <th className="px-4 py-3 text-left font-semibold">Profisiensi</th>
                    <th className="px-4 py-3 text-left font-semibold">Selesai</th>
                    <th className="px-3 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recentExams.map(ex => (
                    <tr key={ex.id} className="transition-colors hover:bg-gray-50/80">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-[10px] font-bold text-white">
                            {ex.userName?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{ex.userName}</p>
                            <p className="text-[10px] text-gray-400">{ex.examId?.slice(0, 12)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-bold tabular-nums ${parseFloat(ex.theta) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {parseFloat(ex.theta) >= 0 ? '+' : ''}{ex.theta}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-violet-400" style={{ width: `${ex.accuracy}%` }} />
                          </div>
                          <span className="tabular-nums font-semibold text-gray-700">{ex.accuracy}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${proficiencyStyle[ex.proficiencyLevel] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ex.proficiencyLevel || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-400 whitespace-nowrap">{fmtDateTime(ex.completedAt)}</td>
                      <td className="px-3 py-3">
                        {ex.flagged && (
                          <span title="Anomali terdeteksi">
                            <AlertTriangle size={12} className="text-amber-400" />
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

        {/* Right column: Completion ring + Quick actions */}
        <motion.div {...fade(0.5)} className="flex flex-col gap-4">

          {/* Exam status card */}
          <div className="rounded-2xl bg-white p-5 shadow-xs border border-stone-100">
            <p className="mb-4 text-sm font-bold text-gray-900">Status Ujian</p>
            <div className="flex items-center gap-5">
              {/* Ring */}
              <div className="relative h-[72px] w-[72px] shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="url(#ringGrad)" strokeWidth="4"
                    strokeDasharray={`${examCompletionRate * 0.88} ${88 - examCompletionRate * 0.88}`}
                    strokeLinecap="round" />
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-gray-900 leading-none">{examCompletionRate}%</span>
                  <span className="text-[9px] text-gray-400 leading-none">selesai</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Selesai', val: data.examStatusDistribution.completed ?? 0, color: 'bg-emerald-400' },
                  { label: 'Berlangsung', val: data.examStatusDistribution.in_progress ?? 0, color: 'bg-blue-400' },
                  { label: 'Ditinggalkan', val: data.examStatusDistribution.abandoned ?? 0, color: 'bg-gray-300' },
                  { label: 'Ditandai', val: data.examStatusDistribution.flagged ?? 0, color: 'bg-amber-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${s.color}`} />
                    <span className="flex-1 text-[11px] text-gray-500">{s.label}</span>
                    <span className="text-[11px] font-bold text-gray-800 tabular-nums">{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl bg-white p-5 shadow-xs border border-stone-100">
            <p className="mb-3 text-sm font-bold text-stone-800">Aksi Cepat</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Pengguna', icon: Users, href: '/admin/users', bg: 'bg-sky-50 hover:bg-sky-100 text-sky-700' },
                { label: 'Bank Soal', icon: BookOpen, href: '/admin/questions', bg: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
                { label: 'MSAT', icon: FlaskConical, href: '/admin/ujian', bg: 'bg-rose-50 hover:bg-rose-100 text-rose-700' },
                { label: 'Analitik', icon: BarChart3, href: '/admin/analytics', bg: 'bg-violet-50 hover:bg-violet-100 text-violet-700' },
                { label: 'Konten', icon: FileText, href: '/admin/content', bg: 'bg-teal-50 hover:bg-teal-100 text-teal-700' },
                { label: 'Terminal', icon: Terminal, href: '/admin/cli', bg: 'bg-stone-100 hover:bg-stone-200 text-stone-700' },
              ].map(a => {
                const Icon = a.icon;
                return (
                  <Link key={a.label} href={a.href}
                    className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold transition-all hover:-translate-y-0.5 ${a.bg}`}>
                    <Icon size={13} /> {a.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── BOTTOM ROW ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Problematic questions */}
        <motion.div {...fade(0.55)} className="rounded-2xl bg-white shadow-xs border border-stone-100">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <AlertTriangle size={14} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">Soal Bermasalah</p>
            </div>
            <Link href="/admin/questions"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-blue-50">
              Kelola <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-5">
            {data.lowAccuracyQuestions.length === 0 ? (
              <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4">
                <CheckCircle size={16} className="shrink-0 text-emerald-500" />
                <div>
                  <p className="text-xs font-semibold text-emerald-700">Semua soal dalam kondisi baik</p>
                  <p className="text-[10px] text-emerald-600">Tidak ada soal dengan akurasi rendah</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.lowAccuracyQuestions.map(q => (
                  <div key={q.id} className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                    <p className="text-xs leading-relaxed text-gray-700 line-clamp-2">{q.stem}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffStyle[q.difficulty] ?? ''}`}>{q.difficulty}</span>
                      <span className="text-[10px] font-bold text-rose-600">{q.avgCorrectRate}% benar</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{q.usageCount}× dipakai</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Popular materials */}
        <motion.div {...fade(0.6)} className="rounded-2xl bg-white shadow-xs border border-stone-100">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50">
                <FileText size={14} className="text-blue-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">Materi Terpopuler</p>
            </div>
            <Link href="/admin/content"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-blue-50">
              Kelola <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-5">
            {data.materialStats.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <FileText size={24} className="mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Belum ada materi tersedia</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.materialStats.slice(0, 5).map(m => {
                  const maxCount = data.materialStats[0]?.progressCount || 1;
                  const pct = Math.round((m.progressCount / maxCount) * 100);
                  return (
                    <div key={m.id}>
                      <div className="mb-1.5 flex items-center gap-2">
                        <p className="flex-1 truncate text-xs font-semibold text-gray-800">{m.title}</p>
                        <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${m.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                          {m.status === 'published' ? 'Live' : 'Draft'}
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-gray-500">{m.progressCount}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex gap-2 border-t border-gray-50 pt-4">
              <button onClick={() => handleExport('users')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-2 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-gray-100">
                <Download size={10} /> Users CSV
              </button>
              <button onClick={() => handleExport('question_bank')}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-2 text-[10px] font-semibold text-gray-500 transition-colors hover:bg-gray-100">
                <Download size={10} /> Soal CSV
              </button>
            </div>
          </div>
        </motion.div>

        {/* Top users */}
        <motion.div {...fade(0.65)} className="rounded-2xl bg-white shadow-xs border border-stone-100">
          <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <TrendingUp size={14} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-gray-900">Top Pengguna</p>
            </div>
            <Link href="/admin/analytics"
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-blue-50">
              Semua <ChevronRight size={12} />
            </Link>
          </div>
          <div className="p-5">
            {data.topUsers.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Zap size={24} className="mb-2 text-gray-200" />
                <p className="text-xs text-gray-400">Belum ada data XP siswa</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topUsers.map((u, i) => {
                  const maxXp = data.topUsers[0]?.xp || 1;
                  const pct = Math.round((u.xp / maxXp) * 100);
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={u.uid} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-center text-sm">
                        {i < 3 ? medals[i] : <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                      </span>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-[11px] font-black text-white shadow-sm">
                        {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-semibold text-gray-800">{u.displayName}</p>
                          <span className="shrink-0 ml-2 text-[11px] font-bold text-amber-500 tabular-nums">{u.xp} XP</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
