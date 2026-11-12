'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowRight, BookOpen, CalendarDays, ClipboardCheck, FileQuestion, GraduationCap, MessageCircle, Plus, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface StudentRow { uid: string; displayName: string; xp: number; totalLessons: number; lastLoginAt: string; }
const cardMotion = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const TeacherDashboard: FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [studentsSnap, materialSnap, questionSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
          getDocs(collection(db, 'materials')),
          getDocs(collection(db, 'question_bank')),
        ]);
        setStudents(studentsSnap.docs.map((document) => {
          const data = document.data();
          return {
            uid: document.id,
            displayName: data.displayName ?? 'Siswa',
            xp: data.stats?.xp || 0,
            totalLessons: data.stats?.totalLessons || 0,
            lastLoginAt: data.lastLoginAt?.toDate?.()?.toLocaleDateString('id-ID') || '-',
          };
        }));
        setMaterialCount(materialSnap.size);
        setQuestionCount(questionSnap.size);
      } catch {
        // Keep the dashboard usable when optional overview data is unavailable.
      } finally { setLoading(false); }
    };
    fetchDashboard();
  }, []);

  if (loading || !profile) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );

  const avgXP = students.length ? Math.round(students.reduce((total, student) => total + student.xp, 0) / students.length) : 0;
  const avgLessons = students.length ? Math.round(students.reduce((total, student) => total + student.totalLessons, 0) / students.length) : 0;
  const topStudents = [...students].sort((a, b) => b.xp - a.xp).slice(0, 5);
  const firstName = profile.displayName?.split(' ')[0] || 'Guru';
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const stats = [
    { label: 'Total siswa', value: students.length, detail: 'Siswa terdaftar', icon: Users, tone: 'bg-sky-50 text-sky-600' },
    { label: 'Materi belajar', value: materialCount, detail: 'Konten tersedia', icon: BookOpen, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Bank soal', value: questionCount, detail: 'Soal tersimpan', icon: FileQuestion, tone: 'bg-violet-50 text-violet-600' },
    { label: 'Rata-rata XP', value: avgXP.toLocaleString('id-ID'), detail: 'Per siswa', icon: TrendingUp, tone: 'bg-amber-50 text-amber-600' },
  ];
  const quickActions = [
    { href: '/teacher/kelas', label: 'Kelola kelas', detail: 'Atur kelas dan anggota', icon: GraduationCap },
    { href: '/teacher/materials', label: 'Tambah materi', detail: 'Publikasikan bahan belajar', icon: Plus },
    { href: '/teacher/ujian', label: 'Kelola ujian', detail: 'Jadwal dan hasil ujian', icon: ClipboardCheck },
    { href: '/teacher/messages', label: 'Buka pesan', detail: 'Komunikasi dengan siswa', icon: MessageCircle },
  ];

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-6xl py-4 sm:py-8">
        <motion.header {...cardMotion} className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Dashboard Guru</div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">Selamat datang, {firstName}</h1>
            <p className="mt-1.5 text-sm text-gray-500">Pantau pembelajaran dan lanjutkan pekerjaan yang paling penting.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium capitalize text-gray-500 sm:pb-1"><CalendarDays size={15} className="text-gray-400" />{today}</div>
        </motion.header>

        <motion.section {...cardMotion} transition={{ delay: 0.05 }} aria-label="Ringkasan dashboard" className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => { const Icon = stat.icon; return (
            <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${stat.tone}`}><Icon size={18} /></div>
              <p className="text-2xl font-extrabold tabular-nums text-gray-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">{stat.label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{stat.detail}</p>
            </div>
          ); })}
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <motion.section {...cardMotion} transition={{ delay: 0.1 }} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div><h2 className="font-display text-base font-bold text-gray-900">Performa siswa</h2><p className="mt-0.5 text-xs text-gray-500">Peringkat berdasarkan perolehan XP</p></div>
              <Link href="/teacher/students" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">Lihat semua <ArrowRight size={13} /></Link>
            </div>
            {topStudents.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Users size={20} /></div>
                <p className="text-sm font-semibold text-gray-700">Belum ada data siswa</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-gray-400">Data performa akan muncul setelah siswa mulai menggunakan platform.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">{topStudents.map((student, index) => (
                <Link key={student.uid} href={`/teacher/students/${student.uid}`} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50 sm:px-6">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{index + 1}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800 group-hover:text-emerald-700">{student.displayName}</p><p className="mt-0.5 truncate text-xs text-gray-400">{student.totalLessons} materi selesai · Aktif {student.lastLoginAt}</p></div>
                  <div className="text-right"><p className="text-sm font-bold tabular-nums text-gray-800">{student.xp.toLocaleString('id-ID')}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">XP</p></div>
                </Link>
              ))}</div>
            )}
          </motion.section>

          <div className="space-y-6">
            <motion.section {...cardMotion} transition={{ delay: 0.15 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-display text-base font-bold text-gray-900">Aksi cepat</h2><p className="mt-1 text-xs text-gray-500">Akses pekerjaan rutin Anda.</p>
              <div className="mt-4 space-y-1.5">{quickActions.map((action) => { const Icon = action.icon; return (
                <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-gray-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Icon size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">{action.label}</span><span className="block truncate text-xs text-gray-400">{action.detail}</span></span>
                  <ArrowRight size={14} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                </Link>
              ); })}</div>
            </motion.section>
            <motion.section {...cardMotion} transition={{ delay: 0.2 }} className="rounded-2xl border border-gray-200 bg-gray-900 p-5 text-white shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Ringkasan pembelajaran</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div><p className="text-2xl font-extrabold tabular-nums">{avgLessons}</p><p className="mt-1 text-xs leading-4 text-gray-400">Rata-rata materi selesai</p></div>
                <div className="border-l border-white/10 pl-4"><p className="text-2xl font-extrabold tabular-nums">{students.length}</p><p className="mt-1 text-xs leading-4 text-gray-400">Siswa terpantau</p></div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
