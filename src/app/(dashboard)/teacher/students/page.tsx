'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Search, Users, BookOpen, ClipboardCheck } from 'lucide-react';

interface Student {
  uid: string;
  displayName: string;
  email: string;
  totalLessons: number;
  totalQuizzes: number;
}

const TeacherStudents: FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const profileUid = profile?.uid;
  const fetchStudents = useCallback(async () => {
    if (!profileUid) return;
    try {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'))
      );
        setStudents(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              displayName: data.displayName ?? 'Siswa',
              email: data.email ?? '',
              totalLessons: data.stats?.totalLessons || 0,
              totalQuizzes: data.stats?.totalQuizzes || 0,
            };
          })
        );
      } catch {
        // permission error or network failure — leave empty
      } finally {
        setLoading(false);
      }
  }, [profileUid]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useLivePoll(fetchStudents);

  const filtered = students.filter(
    (s) =>
      s.displayName.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 text-white shadow-sm"
        >
          <h1 className="font-display text-2xl font-extrabold">Daftar siswa</h1>
          <p className="mt-1 text-sm text-blue-100">{students.length} siswa terdaftar di platform</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <Users size={16} className="mb-1 text-blue-100" />
              <p className="text-lg font-black">{students.length}</p>
              <p className="text-[11px] text-blue-100">Total siswa</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <BookOpen size={16} className="mb-1 text-blue-100" />
              <p className="text-lg font-black">{students.reduce((a, s) => a + s.totalLessons, 0)}</p>
              <p className="text-[11px] text-blue-100">Materi selesai</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <ClipboardCheck size={16} className="mb-1 text-emerald-300" />
              <p className="text-lg font-black">{students.reduce((a, s) => a + s.totalQuizzes, 0)}</p>
              <p className="text-[11px] text-blue-100">Latihan selesai</p>
            </div>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative mb-6"
        >
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau email siswa..."
            className="w-full rounded-2xl bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </motion.div>

        {/* Student Cards */}
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.uid}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.03 }}
            >
              <Link
                href={`/teacher/students/${s.uid}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-500 text-sm font-bold text-white">
                  {(s.displayName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {s.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                </div>
                <div className="hidden items-center gap-5 sm:flex">
                  <div className="flex items-center gap-1.5" title="Materi selesai">
                    <BookOpen size={13} className="text-primary" />
                    <span className="text-sm font-bold text-primary">{s.totalLessons}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Latihan selesai">
                    <ClipboardCheck size={13} className="text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-600">{s.totalQuizzes}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-gray-400">
            Tidak ada siswa ditemukan
          </p>
        )}
      </div>
    </RoleGuard>
  );
};

export default TeacherStudents;
