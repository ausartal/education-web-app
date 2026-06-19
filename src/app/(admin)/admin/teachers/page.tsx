'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Search, ShieldCheck, UserX, ExternalLink } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { UserProfile } from '@/types/firestore';

interface TeacherRow extends UserProfile {
  materialsCount?: number;
  questionsCount?: number;
}

const SkeletonRow: FC = () => (
  <tr>
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-5 py-3">
        <div className="h-4 animate-pulse rounded bg-gray-100" />
      </td>
    ))}
  </tr>
);

function formatDate(ts: { seconds?: number } | null | undefined): string {
  if (!ts || !ts.seconds) return '—';
  return new Date(ts.seconds * 1000).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const AdminTeachers: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTeachers = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      const teacherUsers: TeacherRow[] = (data.users as UserProfile[])
        .filter(u => u.role === 'teacher')
        .map(u => ({ ...u, materialsCount: 0, questionsCount: 0 }));
      setTeachers(teacherUsers);
    } catch (err) {
      console.error(err);
      addToast('error', 'Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleDeactivate = async (uid: string, current: boolean) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !current }),
      });
      if (!res.ok) throw new Error('Failed to update user');
      setTeachers(prev =>
        prev.map(t => (t.uid === uid ? { ...t, isActive: !current } : t))
      );
      addToast('success', !current ? 'Guru diaktifkan' : 'Guru dinonaktifkan');
    } catch {
      addToast('error', 'Gagal memperbarui status');
    }
  };

  const handlePromoteToAdmin = async (uid: string, name: string) => {
    if (!user) return;
    if (!confirm(`Promosikan ${name} menjadi Admin? Tindakan ini tidak dapat dibatalkan dengan mudah.`)) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'admin' }),
      });
      if (!res.ok) throw new Error('Failed to promote user');
      setTeachers(prev => prev.filter(t => t.uid !== uid));
      addToast('success', `${name} dipromosikan menjadi Admin`);
    } catch {
      addToast('error', 'Gagal mempromosikan pengguna');
    }
  };

  const filtered = teachers.filter(t =>
    t.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <GraduationCap size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">
              Manajemen Guru
            </h1>
            <p className="text-sm text-gray-500">
              {teachers.length} guru terdaftar
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Total Guru', value: teachers.length, color: 'text-gray-900' },
          {
            label: 'Aktif',
            value: teachers.filter(t => t.isActive).length,
            color: 'text-emerald-600',
          },
          {
            label: 'Nonaktif',
            value: teachers.filter(t => !t.isActive).length,
            color: 'text-rose-600',
          },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`mt-1 font-display text-2xl font-extrabold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Search */}
      <div className="mb-6 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama atau email guru..."
            className="w-full rounded-xl bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="overflow-x-auto rounded-3xl bg-white shadow-sm"
      >
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="px-5 py-4 font-medium">Guru</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">XP</th>
              <th className="px-5 py-4 font-medium">Bergabung</th>
              <th className="px-5 py-4 font-medium">Login Terakhir</th>
              <th className="px-5 py-4 font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : filtered.map((teacher, i) => (
                  <motion.tr
                    key={teacher.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-xs font-bold text-white">
                          {teacher.displayName?.charAt(0).toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{teacher.displayName}</p>
                          <p className="text-xs text-gray-500">{teacher.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          teacher.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {teacher.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-amber-600">
                      {teacher.stats?.xp ?? 0}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(teacher.createdAt as unknown as { seconds?: number })}
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">
                      {formatDate(teacher.lastLoginAt as unknown as { seconds?: number })}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleDeactivate(teacher.uid, teacher.isActive)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-600"
                          title={teacher.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          <UserX size={14} />
                        </button>
                        <button
                          onClick={() => handlePromoteToAdmin(teacher.uid, teacher.displayName)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600"
                          title="Promosikan ke Admin"
                        >
                          <ShieldCheck size={14} />
                        </button>
                        <button
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="Lihat profil"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400">
            <GraduationCap size={32} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">
              {search ? 'Tidak ada guru yang cocok' : 'Belum ada guru terdaftar'}
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default AdminTeachers;
