'use client';

import React, { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, Search, ShieldCheck, UserX,
  BookOpen, FileText, School, CalendarCheck, Users, ClipboardList,
  RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import Link from 'next/link';

interface TeacherRow {
  uid: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  stats: { xp?: number; level?: number; streak?: number };
  createdAt: string | null;
  lastLoginAt: string | null;
  materialsCount: number;
  questionsCount: number;
  classesCount: number;
  studentsCount: number;
  schedulesCount: number;
  sessionsTotal: number;
  sessionsCompleted: number;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const Skeleton: FC = () => (
  <tr>
    {Array.from({ length: 8 }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="h-4 animate-pulse rounded bg-gray-100" />
      </td>
    ))}
  </tr>
);

function TeacherExpandedRow({ t }: { t: TeacherRow }) {
  const completionRate = t.sessionsTotal > 0
    ? Math.round((t.sessionsCompleted / t.sessionsTotal) * 100) : 0;

  return (
    <tr className="bg-emerald-50/40">
      <td colSpan={8} className="px-8 py-4">
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Materi Dibuat</p>
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-blue-500" />
              <span className="text-lg font-black text-gray-900">{t.materialsCount}</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Soal Latihan</p>
            <div className="flex items-center gap-2">
              <BookOpen size={14} className="text-amber-500" />
              <span className="text-lg font-black text-gray-900">{t.questionsCount}</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Kelas Aktif</p>
            <div className="flex items-center gap-2">
              <School size={14} className="text-cyan-500" />
              <span className="text-lg font-black text-gray-900">{t.classesCount}</span>
              <span className="text-xs text-gray-400">({t.studentsCount} siswa)</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Jadwal Ujian</p>
            <div className="flex items-center gap-2">
              <CalendarCheck size={14} className="text-violet-500" />
              <span className="text-lg font-black text-gray-900">{t.schedulesCount}</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Total Sesi Ujian</p>
            <div className="flex items-center gap-2">
              <ClipboardList size={14} className="text-fuchsia-500" />
              <span className="text-lg font-black text-gray-900">{t.sessionsTotal}</span>
              <span className="text-xs text-gray-400">({t.sessionsCompleted} selesai)</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Tingkat Penyelesaian</p>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${completionRate}%` }} />
              </div>
              <span className="text-sm font-bold text-emerald-700">{completionRate}%</span>
            </div>
          </div>
          <div className="col-span-2">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">Navigasi Cepat</p>
            <div className="flex gap-2">
              <Link href="/admin/ujian"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm hover:bg-violet-50">
                Lihat Kelas & Jadwal →
              </Link>
              <Link href="/admin/content"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm hover:bg-blue-50">
                Lihat Materi →
              </Link>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

const AdminTeachers: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTeachers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/teachers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch teachers');
      const data = await res.json();
      setTeachers(data.teachers as TeacherRow[]);
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const handleDeactivate = async (uid: string, current: boolean) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error();
      setTeachers(prev => prev.map(t => t.uid === uid ? { ...t, isActive: !current } : t));
      addToast('success', !current ? 'Diaktifkan' : 'Dinonaktifkan');
    } catch { addToast('error', 'Gagal mengubah status'); }
  };

  const handlePromoteToAdmin = async (uid: string, name: string) => {
    if (!user) return;
    if (!confirm(`Promosikan ${name} menjadi Admin?`)) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'admin' }),
      });
      if (!res.ok) throw new Error();
      setTeachers(prev => prev.filter(t => t.uid !== uid));
      addToast('success', `${name} dipromosikan menjadi Admin`);
    } catch { addToast('error', 'Gagal mempromosikan'); }
  };

  const filtered = teachers.filter(t =>
    !search ||
    t.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const teachersOnly = filtered.filter(t => t.role === 'teacher');
  const totalStudents = teachers.reduce((sum, t) => sum + t.studentsCount, 0);
  const totalClasses = teachers.reduce((sum, t) => sum + t.classesCount, 0);
  const totalSessions = teachers.reduce((sum, t) => sum + t.sessionsTotal, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Manajemen Guru</h1>
            <p className="text-sm text-gray-500">{teachersOnly.length} guru terdaftar</p>
          </div>
        </div>
        <button onClick={fetchTeachers}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Total Guru', value: teachersOnly.length, color: 'text-gray-900', icon: GraduationCap },
          { label: 'Aktif', value: teachersOnly.filter(t => t.isActive).length, color: 'text-emerald-600', icon: GraduationCap },
          { label: 'Total Kelas', value: totalClasses, color: 'text-cyan-600', icon: School },
          { label: 'Total Siswa', value: totalStudents, color: 'text-blue-600', icon: Users },
          { label: 'Sesi Ujian', value: totalSessions, color: 'text-fuchsia-600', icon: ClipboardList },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm">
              <Icon size={14} className={`mb-1 ${s.color}`} />
              <p className={`font-display text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama atau email guru..."
          className="w-full rounded-xl bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="overflow-x-auto rounded-3xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-5 py-4 font-medium">Guru</th>
              <th className="px-4 py-4 font-medium">Status</th>
              <th className="px-4 py-4 font-medium text-center">Materi</th>
              <th className="px-4 py-4 font-medium text-center">Soal</th>
              <th className="px-4 py-4 font-medium text-center">Kelas</th>
              <th className="px-4 py-4 font-medium text-center">Siswa</th>
              <th className="px-4 py-4 font-medium text-center">Sesi MSAT</th>
              <th className="px-4 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
              : filtered.map((t, i) => (
                <React.Fragment key={t.uid}>
                  <motion.tr
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                    onClick={() => setExpandedId(expandedId === t.uid ? null : t.uid)}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white">
                          {t.displayName?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-gray-900">{t.displayName}</p>
                            {t.role === 'admin' && (
                              <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">ADMIN</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{t.email}</p>
                          <p className="text-[10px] text-gray-400">Bergabung {fmtDate(t.createdAt)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {t.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${t.materialsCount > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                        {t.materialsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${t.questionsCount > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                        {t.questionsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${t.classesCount > 0 ? 'text-cyan-600' : 'text-gray-300'}`}>
                        {t.classesCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-bold ${t.studentsCount > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                        {t.studentsCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold ${t.sessionsTotal > 0 ? 'text-fuchsia-600' : 'text-gray-300'}`}>
                          {t.sessionsTotal}
                        </span>
                        {t.sessionsTotal > 0 && (
                          <span className="text-[9px] text-gray-400">{t.sessionsCompleted} selesai</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleDeactivate(t.uid, t.isActive)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                          title={t.isActive ? 'Nonaktifkan' : 'Aktifkan'}>
                          <UserX size={14} />
                        </button>
                        {t.role !== 'admin' && (
                          <button onClick={() => handlePromoteToAdmin(t.uid, t.displayName)}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                            title="Promosikan ke Admin">
                            <ShieldCheck size={14} />
                          </button>
                        )}
                        <button className="text-gray-300 hover:text-gray-500">
                          {expandedId === t.uid ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                  {expandedId === t.uid && <TeacherExpandedRow t={t} />}
                </React.Fragment>
              ))
            }
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <GraduationCap size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">{search ? 'Tidak ada guru yang cocok' : 'Belum ada guru terdaftar'}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminTeachers;
