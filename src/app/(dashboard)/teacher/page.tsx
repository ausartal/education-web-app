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
          className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 border border-emerald-100/60 px-6 py-5"
        >
          <p className="text-xs font-medium text-emerald-500 mb-0.5">Panel Guru</p>
          <h1 className="font-display text-2xl font-extrabold text-stone-900">
            Halo, {profile.displayName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
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
          <div className="rounded-2xl bg-sky-50 border border-sky-100 p-5">
            <Users size={20} className="mb-3 text-sky-500" />
            <p className="text-3xl font-black text-sky-700">{students.length}</p>
            <p className="mt-1 text-xs font-semibold text-sky-500">Total Siswa</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5">
            <BookOpen size={20} className="mb-3 text-emerald-500" />
            <p className="text-3xl font-black text-emerald-700">{materialCount}</p>
            <p className="mt-1 text-xs font-semibold text-emerald-500">Materi</p>
          </div>
          <div className="rounded-2xl bg-violet-50 border border-violet-100 p-5">
            <HelpCircle size={20} className="mb-3 text-violet-500" />
            <p className="text-3xl font-black text-violet-700">{questionCount}</p>
            <p className="mt-1 text-xs font-semibold text-violet-500">Bank Soal</p>
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-100 p-5">
            <TrendingUp size={20} className="mb-3 text-amber-500" />
            <p className="text-3xl font-black text-amber-700">{avgXP}</p>
            <p className="mt-1 text-xs font-semibold text-amber-500">Rata-rata XP</p>
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
            className="group flex items-center gap-4 rounded-2xl bg-white border border-stone-100 p-5 shadow-xs transition-all hover:shadow-md hover:border-emerald-100"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <BookOpen size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800">Kelola Materi</p>
              <p className="text-xs text-stone-400">Tambah & edit konten</p>
            </div>
            <ArrowRight size={16} className="text-stone-300 transition-colors group-hover:text-emerald-500 shrink-0" />
          </Link>
          <Link
            href="/teacher/questions"
            className="group flex items-center gap-4 rounded-2xl bg-white border border-stone-100 p-5 shadow-xs transition-all hover:shadow-md hover:border-violet-100"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50">
              <HelpCircle size={20} className="text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800">Kelola Soal</p>
              <p className="text-xs text-stone-400">Bank soal & ujian</p>
            </div>
            <ArrowRight size={16} className="text-stone-300 transition-colors group-hover:text-violet-500 shrink-0" />
          </Link>
          <Link
            href="/teacher/messages"
            className="group flex items-center gap-4 rounded-2xl bg-white border border-stone-100 p-5 shadow-xs transition-all hover:shadow-md hover:border-amber-100"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <MessageCircle size={20} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800">Pesan</p>
              <p className="text-xs text-stone-400">Komunikasi dengan siswa</p>
            </div>
            <ArrowRight size={16} className="text-stone-300 transition-colors group-hover:text-amber-500 shrink-0" />
          </Link>
        </motion.div>

        {/* Top Students */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-white border border-stone-100 shadow-xs overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="font-display text-sm font-bold text-stone-800">
              Siswa Teratas
            </h2>
            <Link
              href="/teacher/students"
              className="text-[12px] font-semibold text-violet-600 hover:text-violet-800"
            >
              Lihat Semua
            </Link>
          </div>

          {topStudents.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400">
              Belum ada data siswa
            </p>
          ) : (
            <div className="divide-y divide-stone-50">
              {topStudents.map((s, i) => {
                const rankColors = [
                  'bg-amber-100 text-amber-700',
                  'bg-stone-100 text-stone-600',
                  'bg-orange-100 text-orange-700',
                ];
                return (
                  <Link
                    key={s.uid}
                    href={`/teacher/students/${s.uid}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-stone-50"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankColors[i] ?? 'bg-stone-100 text-stone-500'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">
                        {s.displayName}
                      </p>
                      <p className="text-xs text-stone-400">
                        {s.totalLessons} pelajaran selesai
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-amber-600">
                        {s.xp} XP
                      </p>
                      <p className="text-xs text-stone-400">
                        {s.lastLoginAt}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
