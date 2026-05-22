'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Users,
  BookOpen,
  HelpCircle,
  MessageCircle,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface StudentRow {
  uid: string;
  displayName: string;
  xp: number;
  totalLessons: number;
  lastLoginAt: string;
}

const TeacherDashboard: FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [studentsSnap, matSnap, qSnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'question_bank')),
      ]);
      setStudents(
        studentsSnap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName,
            xp: data.stats?.xp || 0,
            totalLessons: data.stats?.totalLessons || 0,
            lastLoginAt:
              data.lastLoginAt?.toDate?.()?.toLocaleDateString('id-ID') || '-',
          };
        })
      );
      setMaterialCount(matSnap.size);
      setQuestionCount(qSnap.size);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const avgXP =
    students.length > 0
      ? Math.round(students.reduce((a, s) => a + s.xp, 0) / students.length)
      : 0;

  const topStudents = [...students].sort((a, b) => b.xp - a.xp).slice(0, 5);

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-6xl py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            Selamat datang, {profile.displayName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola kelas dan pantau perkembangan siswa Anda
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 p-5 text-white shadow-md">
            <Users size={22} className="mb-3 opacity-80" />
            <p className="text-3xl font-black">{students.length}</p>
            <p className="mt-1 text-xs font-medium opacity-80">Total Siswa</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 p-5 text-white shadow-md">
            <BookOpen size={22} className="mb-3 opacity-80" />
            <p className="text-3xl font-black">{materialCount}</p>
            <p className="mt-1 text-xs font-medium opacity-80">Materi</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-400 p-5 text-white shadow-md">
            <HelpCircle size={22} className="mb-3 opacity-80" />
            <p className="text-3xl font-black">{questionCount}</p>
            <p className="mt-1 text-xs font-medium opacity-80">Bank Soal</p>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-400 p-5 text-white shadow-md">
            <TrendingUp size={22} className="mb-3 opacity-80" />
            <p className="text-3xl font-black">{avgXP}</p>
            <p className="mt-1 text-xs font-medium opacity-80">Rata-rata XP</p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Link
            href="/teacher/materials"
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
              <BookOpen size={22} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Kelola Materi</p>
              <p className="text-xs text-gray-500">Tambah & edit konten</p>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-300 transition-colors group-hover:text-emerald-500"
            />
          </Link>
          <Link
            href="/teacher/questions"
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
              <HelpCircle size={22} className="text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Kelola Soal</p>
              <p className="text-xs text-gray-500">Bank soal & ujian</p>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-300 transition-colors group-hover:text-violet-500"
            />
          </Link>
          <Link
            href="/teacher/messages"
            className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100">
              <MessageCircle size={22} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Pesan</p>
              <p className="text-xs text-gray-500">Komunikasi dengan siswa</p>
            </div>
            <ArrowRight
              size={18}
              className="text-gray-300 transition-colors group-hover:text-amber-500"
            />
          </Link>
        </motion.div>

        {/* Top Students */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-6 shadow-sm"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-gray-900">
              Siswa Teratas
            </h2>
            <Link
              href="/teacher/students"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lihat Semua
            </Link>
          </div>

          {topStudents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">
              Belum ada data siswa
            </p>
          ) : (
            <div className="space-y-3">
              {topStudents.map((s, i) => (
                <Link
                  key={s.uid}
                  href={`/teacher/students/${s.uid}`}
                  className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-gray-50"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-400 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {s.displayName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {s.totalLessons} pelajaran selesai
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-amber-600">
                      {s.xp} XP
                    </p>
                    <p className="text-xs text-gray-400">
                      Aktif {s.lastLoginAt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
