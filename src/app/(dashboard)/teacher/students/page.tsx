'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Search, Zap, Flame, BookOpen, Trophy } from 'lucide-react';

interface Student {
  uid: string;
  displayName: string;
  email: string;
  xp: number;
  level: number;
  streak: number;
  totalLessons: number;
  totalQuizzes: number;
}

const TeacherStudents: FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'))
      );
      setStudents(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName,
            email: data.email,
            xp: data.stats?.xp || 0,
            level: data.stats?.level || 1,
            streak: data.stats?.streak || 0,
            totalLessons: data.stats?.totalLessons || 0,
            totalQuizzes: data.stats?.totalQuizzes || 0,
          };
        })
      );
      setLoading(false);
    };
    fetch();
  }, []);

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

  const totalXP = students.reduce((a, s) => a + s.xp, 0);
  const avgLevel =
    students.length > 0
      ? Math.round(students.reduce((a, s) => a + s.level, 0) / students.length)
      : 0;

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            Daftar Siswa
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {students.length} siswa terdaftar
          </p>
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 grid grid-cols-3 gap-4"
        >
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 p-4 text-white shadow-sm">
            <Zap size={18} className="mb-1 opacity-80" />
            <p className="text-xl font-black">{totalXP}</p>
            <p className="text-[11px] opacity-80">Total XP Kelas</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 p-4 text-white shadow-sm">
            <Trophy size={18} className="mb-1 opacity-80" />
            <p className="text-xl font-black">Lv. {avgLevel}</p>
            <p className="text-[11px] opacity-80">Rata-rata Level</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 p-4 text-white shadow-sm">
            <BookOpen size={18} className="mb-1 opacity-80" />
            <p className="text-xl font-black">
              {students.reduce((a, s) => a + s.totalLessons, 0)}
            </p>
            <p className="text-[11px] opacity-80">Pelajaran Selesai</p>
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
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-400 text-sm font-bold text-white">
                  {s.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {s.displayName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{s.email}</p>
                </div>
                <div className="hidden items-center gap-5 sm:flex">
                  <div className="flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-500" />
                    <span className="text-sm font-bold text-amber-600">
                      {s.xp}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Flame size={13} className="text-orange-500" />
                    <span className="text-sm font-bold text-orange-600">
                      {s.streak}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-primary" />
                    <span className="text-sm font-bold text-primary">
                      {s.totalLessons}
                    </span>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                    Lv. {s.level}
                  </span>
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
