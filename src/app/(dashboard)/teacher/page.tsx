'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from '@/lib/client-firestore';
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

  const profileUid = profile?.uid;
  const fetchDashboard = useCallback(async () => {
    if (!profileUid) return;
    const [studentsRes, materialRes, questionRes] = await Promise.allSettled([
      getDocs(query(collection(db, 'users'), where('role', '==', 'student'))),
      getDocs(collection(db, 'materials')),
      getDocs(collection(db, 'question_bank')),
    ]);
    if (studentsRes.status === 'fulfilled') {
      setStudents(studentsRes.value.docs.map((document) => {
        const data = document.data();
        return {
          uid: document.id,
          displayName: data.displayName ?? 'Siswa',
          xp: data.stats?.xp || 0,
          totalLessons: data.stats?.totalLessons || 0,
          lastLoginAt: data.lastLoginAt?.toDate?.()?.toLocaleDateString('id-ID') || '-',
        };
      }));
    }
    if (materialRes.status === 'fulfilled') setMaterialCount(materialRes.value.size);
    if (questionRes.status === 'fulfilled') setQuestionCount(questionRes.value.size);
    setLoading(false);
  }, [profileUid]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useLivePoll(fetchDashboard);

  if (loading || !profile) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  const avgXP = students.length ? Math.round(students.reduce((total, student) => total + student.xp, 0) / students.length) : 0;
  const avgLessons = students.length ? Math.round(students.reduce((total, student) => total + student.totalLessons, 0) / students.length) : 0;
  const topStudents = [...students].sort((a, b) => b.xp - a.xp).slice(0, 5);
  const firstName = profile.displayName?.split(' ')[0] || 'Guru';
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const stats = [
    { label: 'Total siswa', value: students.length, detail: 'Siswa terdaftar', icon: Users, tone: 'bg-primary/10 text-primary' },
    { label: 'Materi belajar', value: materialCount, detail: 'Konten tersedia', icon: BookOpen, tone: 'bg-primary/10 text-primary' },
    { label: 'Bank soal', value: questionCount, detail: 'Soal tersimpan', icon: FileQuestion, tone: 'bg-primary/10 text-primary' },
    { label: 'Rata-rata XP', value: avgXP.toLocaleString('id-ID'), detail: 'Per siswa', icon: TrendingUp, tone: 'bg-emerald-50 text-emerald-600' },
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
        <motion.header
          {...cardMotion}
          className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 p-6 text-white shadow-lg shadow-blue-200/60 sm:p-8"
        >
          <div className="pointer-events-none absolute -right-10 -top-14 h-52 w-52 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-20 right-24 h-44 w-44 rounded-full bg-white/10" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Dashboard guru
              </span>
              <h1 className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Selamat datang, {firstName}</h1>
              <p className="mt-2 text-sm leading-relaxed text-blue-100">Pantau pembelajaran siswa dan lanjutkan pekerjaan yang paling penting hari ini.</p>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium capitalize text-blue-100"><CalendarDays size={14} />{today}</div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Link href="/teacher/ujian" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary shadow-sm transition-transform hover:scale-[1.03]"><ClipboardCheck size={16} /> Kelola ujian</Link>
              <Link href="/teacher/materials" className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"><Plus size={16} /> Tambah materi</Link>
            </div>
          </div>
        </motion.header>

        <motion.section {...cardMotion} transition={{ delay: 0.05 }} aria-label="Ringkasan dashboard" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat) => { const Icon = stat.icon; return (
            <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 sm:p-5">
              <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}><Icon size={19} /></div>
              <p className="text-2xl font-extrabold tabular-nums text-gray-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm font-semibold text-gray-700">{stat.label}</p>
              <p className="mt-0.5 text-xs text-gray-400">{stat.detail}</p>
            </div>
          ); })}
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <motion.section {...cardMotion} transition={{ delay: 0.1 }} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div><h2 className="font-display text-base font-bold text-gray-900">Performa siswa</h2><p className="mt-0.5 text-xs text-gray-500">Peringkat berdasarkan perolehan XP</p></div>
              <Link href="/teacher/students" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">Lihat semua <ArrowRight size={13} /></Link>
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
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>{index + 1}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800 group-hover:text-primary">{student.displayName}</p><p className="mt-0.5 truncate text-xs text-gray-400">{student.totalLessons} materi selesai · Aktif {student.lastLoginAt}</p></div>
                  <div className="text-right"><p className="text-sm font-bold tabular-nums text-gray-800">{student.xp.toLocaleString('id-ID')}</p><p className="text-[11px] font-semibold text-gray-400">XP</p></div>
                </Link>
              ))}</div>
            )}
          </motion.section>

          <div className="space-y-6">
            <motion.section {...cardMotion} transition={{ delay: 0.15 }} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <h2 className="font-display text-base font-bold text-gray-900">Aksi cepat</h2><p className="mt-1 text-xs text-gray-500">Akses pekerjaan rutin Anda.</p>
              <div className="mt-4 space-y-1.5">{quickActions.map((action) => { const Icon = action.icon; return (
                <Link key={action.href} href={action.href} className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-gray-50">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-gray-800">{action.label}</span><span className="block truncate text-xs text-gray-400">{action.detail}</span></span>
                  <ArrowRight size={14} className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              ); })}</div>
            </motion.section>
            <motion.section {...cardMotion} transition={{ delay: 0.2 }} className="rounded-2xl bg-gradient-to-br from-primary to-indigo-700 p-5 text-white shadow-md shadow-blue-200/50">
              <p className="text-sm font-bold text-white">Ringkasan pembelajaran</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div><p className="text-2xl font-extrabold tabular-nums text-emerald-300">{avgLessons}</p><p className="mt-1 text-xs leading-4 text-blue-100">Rata-rata materi selesai</p></div>
                <div className="border-l border-white/10 pl-4"><p className="text-2xl font-extrabold tabular-nums">{students.length}</p><p className="mt-1 text-xs leading-4 text-blue-100">Siswa terpantau</p></div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
