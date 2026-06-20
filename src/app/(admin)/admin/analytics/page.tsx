'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Users, ClipboardList,
  RefreshCw, Download, Zap, Target,
} from 'lucide-react';
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
  totals: {
    users: number; exams: number; questions: number;
    completedExams: number; activeQuestions: number; activeUsers: number;
    classes?: number; examSchedules?: number;
  };
  msat?: {
    avgScore: number;
    comprehensionDistribution: Record<string, number>;
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
  return (
    <div>
      <p className="mb-3 text-xs font-bold text-gray-700">{title}</p>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {vals.map((v, i) => (
          <div key={keys[i]} className="flex flex-1 flex-col items-center gap-1">
            {v > 0 && <span className="text-[9px] font-semibold text-gray-500">{v}</span>}
            <div className="w-full rounded-t-md" style={{
              height: `${Math.max((v / max) * (height - 28), v > 0 ? 8 : 2)}px`,
              background: color,
            }} />
            <span className="text-[9px] text-gray-400 truncate w-full text-center">{fmtDay(keys[i])}</span>
          </div>
        ))}
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
          <span className="text-xs font-semibold text-gray-700">{label}</span>
          {sub && <span className="ml-2 text-[10px] text-gray-400">{sub}</span>}
        </div>
        <span className="text-xs font-bold text-gray-900">{value} <span className="font-normal text-gray-400">({pct}%)</span></span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.1 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
};

const AdminAnalytics: FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Analitik Platform</h1>
            <p className="text-sm text-gray-500">Statistik dan tren 7 hari terakhir</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            {(['users', 'question_bank', 'exam_sessions'] as const).map(col => (
              <div key={col} className="relative group">
                <button className="flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50">
                  <Download size={13} /> {col === 'users' ? 'Pengguna' : col === 'question_bank' ? 'Soal' : 'Ujian'}
                </button>
                <div className="absolute right-0 top-full z-10 mt-1 hidden min-w-[120px] flex-col gap-1 rounded-xl bg-white p-1.5 shadow-lg group-hover:flex">
                  <button onClick={() => handleExport(col, 'csv')}
                    className="rounded-lg px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">CSV</button>
                  <button onClick={() => handleExport(col, 'json')}
                    className="rounded-lg px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50">JSON</button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: Users, label: 'Total Pengguna', value: data.totals.users, sub: `${data.totals.activeUsers} aktif`, color: 'text-primary', bg: 'bg-blue-50' },
          { icon: ClipboardList, label: 'Total Ujian', value: data.totals.exams, sub: `${data.totals.completedExams} selesai`, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: Zap, label: 'Rata-rata XP', value: data.avgXp, sub: 'per siswa', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: Target, label: 'Akurasi Rata2', value: `${data.avgAccuracy}%`, sub: 'ujian selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-2xl bg-white p-4 shadow-sm">
              <div className={`mb-2 inline-flex rounded-xl p-2 ${k.bg}`}>
                <Icon size={16} className={k.color} />
              </div>
              <p className="font-display text-xl font-black text-gray-900">{k.value}</p>
              <p className="text-[11px] font-semibold text-gray-700">{k.label}</p>
              <p className="text-[10px] text-gray-400">{k.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <BarChart data={data.userRegistrationsByDay} title="Pengguna Baru per Hari" color="linear-gradient(to top, #1A73E8, #60A5FA)" height={120} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <BarChart data={data.examsByDay} title="Ujian per Hari" color="linear-gradient(to top, #7C3AED, #C4B5FD)" height={120} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <BarChart data={data.auditActivityByDay} title="Aktivitas Admin per Hari" color="linear-gradient(to top, #D97706, #FCD34D)" height={120} />
        </motion.div>
      </div>

      {/* Distribution Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Role Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-gray-900">Distribusi Role Pengguna</p>
          <div className="space-y-4">
            <HBar label="Siswa" value={data.roleDistribution.student} total={data.totals.users}
              color="linear-gradient(to right, #1A73E8, #4FC3F7)" sub={`dari ${data.totals.users}`} />
            <HBar label="Guru" value={data.roleDistribution.teacher} total={data.totals.users}
              color="linear-gradient(to right, #059669, #34D399)" />
            <HBar label="Admin" value={data.roleDistribution.admin} total={data.totals.users}
              color="linear-gradient(to right, #7C3AED, #A78BFA)" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-4">
            {[
              { label: 'Siswa', val: data.roleDistribution.student, color: 'bg-blue-500' },
              { label: 'Guru', val: data.roleDistribution.teacher, color: 'bg-emerald-500' },
              { label: 'Admin', val: data.roleDistribution.admin, color: 'bg-violet-500' },
            ].map(r => (
              <div key={r.label} className="text-center">
                <div className={`mx-auto mb-1 h-2 w-8 rounded-full ${r.color}`} />
                <p className="text-xs font-bold text-gray-900">{r.val}</p>
                <p className="text-[10px] text-gray-400">{r.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Question Difficulty */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-gray-900">Distribusi Soal</p>
          <div className="space-y-4">
            <HBar label="Mudah" value={data.questionsByDifficulty.easy} total={data.totals.questions}
              color="#10B981" sub="easy" />
            <HBar label="Sedang" value={data.questionsByDifficulty.moderate} total={data.totals.questions}
              color="#F59E0B" sub="moderate" />
            <HBar label="Sulit" value={data.questionsByDifficulty.hard} total={data.totals.questions}
              color="#EF4444" sub="hard" />
          </div>
          <div className="mt-4 flex gap-3 border-t border-gray-100 pt-4">
            <div className="flex-1 rounded-xl bg-emerald-50 p-3 text-center">
              <p className="font-display text-lg font-black text-emerald-700">{data.questionsByStatus.active}</p>
              <p className="text-[10px] text-gray-500">Aktif</p>
            </div>
            <div className="flex-1 rounded-xl bg-gray-50 p-3 text-center">
              <p className="font-display text-lg font-black text-gray-500">{data.questionsByStatus.inactive}</p>
              <p className="text-[10px] text-gray-500">Nonaktif</p>
            </div>
          </div>
        </motion.div>

        {/* Exam Status */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <p className="mb-4 text-sm font-bold text-gray-900">Status Ujian</p>
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
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center border-t border-gray-100 pt-4">
            <p className="font-display text-xl font-black text-gray-900">{examTotal}</p>
            <p className="text-xs text-gray-500">Total Sesi Ujian</p>
          </div>
        </motion.div>
      </div>

      {/* MSAT Comprehension Distribution */}
      {data.msat && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <p className="text-sm font-bold text-gray-900">Distribusi Pemahaman MSAT</p>
            <div className="rounded-xl bg-fuchsia-50 px-3 py-1.5 text-center">
              <p className="font-display text-lg font-black text-fuchsia-700">{data.msat.avgScore}</p>
              <p className="text-[10px] text-gray-500">Skor Rata2</p>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { key: 'paham_konsep', label: 'Paham Konsep', color: '#10B981' },
              { key: 'paham_sebagian', label: 'Paham Sebagian', color: '#3B82F6' },
              { key: 'tidak_paham', label: 'Tidak Paham', color: '#F59E0B' },
              { key: 'miskonsepsi', label: 'Miskonsepsi', color: '#EF4444' },
              { key: 'hasil_nebak', label: 'Hasil Nebak', color: '#8B5CF6' },
            ].map(c => {
              const total = Object.values(data.msat!.comprehensionDistribution).reduce((a, b) => a + b, 0);
              return (
                <HBar key={c.key} label={c.label}
                  value={data.msat!.comprehensionDistribution[c.key] ?? 0}
                  total={Math.max(total, 1)} color={c.color} />
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="font-display text-lg font-black text-gray-900">{data.totals.classes ?? 0}</p>
              <p className="text-[10px] text-gray-500">Total Kelas</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 text-center">
              <p className="font-display text-lg font-black text-gray-900">{data.totals.examSchedules ?? 0}</p>
              <p className="text-[10px] text-gray-500">Jadwal Ujian</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Users */}
      {data.topUsers.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-amber-500" />
            <p className="text-sm font-bold text-gray-900">Leaderboard — Top Pengguna (XP)</p>
          </div>
          <div className="space-y-2">
            {data.topUsers.map((u, i) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              const maxXp = data.topUsers[0]?.xp || 1;
              const pct = Math.round((u.xp / maxXp) * 100);
              const roleColors: Record<string, string> = {
                student: 'bg-blue-50 text-blue-700',
                teacher: 'bg-emerald-50 text-emerald-700',
                admin: 'bg-violet-50 text-violet-700',
              };
              return (
                <div key={u.uid} className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5">
                  <span className="w-5 text-center text-sm">{medals[i]}</span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 text-xs font-black text-white">
                    {u.displayName?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-[100px]">
                    <p className="text-xs font-semibold text-gray-900">{u.displayName}</p>
                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${roleColors[u.role] ?? ''}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1, duration: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-300" />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-amber-600">{u.xp} XP</p>
                    <p className="text-[10px] text-gray-400">Lv.{u.level}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminAnalytics;
