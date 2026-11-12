'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';
import { AlertCircle, ArrowRight, BookOpen, CalendarDays, CheckCircle2, ClipboardCheck, Clock, FileQuestion, GraduationCap, MessageCircle, Plus, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { PageHero } from '@/components/ui/PageHero';
import { StatTile } from '@/components/ui/StatTile';
import { EmptyState } from '@/components/ui/EmptyState';

interface StudentRow {
  uid: string;
  displayName: string;
  assigned: number;
  submitted: number;
  totalLessons: number;
  lastLoginAt: string;
}
const cardMotion = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

const TeacherDashboard: FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [avgCompletion, setAvgCompletion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ungraded, setUngraded] = useState(0);
  const [dueSoon, setDueSoon] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const fetchDashboard = async () => {
      try {
        // 1. Classes taught by this teacher
        const classesSnap = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', profile.uid)));
        const classIds = classesSnap.docs.map((d) => d.id);
        const studentIdSet = new Set<string>();
        classesSnap.docs.forEach((d) => {
          const ids = (d.data().studentIds as string[]) ?? [];
          ids.forEach((id) => studentIdSet.add(id));
        });

        // 2. Assignments for those classes — count submissions per student
        const assignmentsByStudent = new Map<string, { assigned: number; submitted: number }>();
        let ungradedCount = 0;
        let dueSoonCount = 0;
        if (classIds.length > 0) {
          const asgnSnap = await getDocs(query(collection(db, 'assignments'), where('classId', 'in', classIds)));
          asgnSnap.docs.forEach((d) => {
            const data = d.data();
            const subs = (data.submissions as Record<string, unknown>) ?? {};
            const submittedIds = Object.keys(subs);
            Object.values(subs).forEach((s) => {
              if (typeof (s as { grade?: number | null }).grade !== 'number') ungradedCount += 1;
            });
            const due = data.dueDate ? new Date(data.dueDate as string).getTime() : NaN;
            if (data.status !== 'draft' && due > Date.now() && due - Date.now() < 3 * 24 * 60 * 60 * 1000) dueSoonCount += 1;
            // Every student in the class is assigned; those in submissions have submitted
            const classDoc = classesSnap.docs.find((c) => c.id === data.classId);
            const classStudents: string[] = (classDoc?.data().studentIds as string[]) ?? [];
            classStudents.forEach((sid) => {
              const entry = assignmentsByStudent.get(sid) ?? { assigned: 0, submitted: 0 };
              entry.assigned += 1;
              if (submittedIds.includes(sid)) entry.submitted += 1;
              assignmentsByStudent.set(sid, entry);
            });
          });
        }

        // 3. Student profiles (only those in this teacher's classes)
        const studentIds = [...studentIdSet];
        const studentRows: StudentRow[] = [];
        for (let i = 0; i < studentIds.length; i += 30) {
          const chunk = studentIds.slice(i, i + 30);
          const usersSnap = await getDocs(query(collection(db, 'users'), where('uid', 'in', chunk)));
          usersSnap.docs.forEach((d) => {
            const data = d.data();
            const asgn = assignmentsByStudent.get(d.id) ?? { assigned: 0, submitted: 0 };
            studentRows.push({
              uid: d.id,
              displayName: data.displayName ?? 'Siswa',
              assigned: asgn.assigned,
              submitted: asgn.submitted,
              totalLessons: (data.stats?.totalLessons as number) || (data.completedMaterials as string[] | undefined)?.length || 0,
              lastLoginAt: (() => {
                const ts = data.lastLoginAt as { _seconds?: number; toDate?: () => Date } | undefined;
                if (ts?.toDate) return ts.toDate().toLocaleDateString('id-ID');
                if (ts?._seconds) return new Date(ts._seconds * 1000).toLocaleDateString('id-ID');
                return '-';
              })(),
            });
          });
        }
        setStudents(studentRows);
        setUngraded(ungradedCount);
        setDueSoon(dueSoonCount);

        // 4. Average assignment completion (%)
        const rates = studentRows.filter((s) => s.assigned > 0).map((s) => s.submitted / s.assigned);
        setAvgCompletion(rates.length ? Math.round((rates.reduce((a, b) => a + b, 0) / rates.length) * 100) : 0);

        const [materialSnap, questionSnap] = await Promise.all([
          getDocs(collection(db, 'materials')),
          getDocs(collection(db, 'question_bank')),
        ]);
        setMaterialCount(materialSnap.size);
        setQuestionCount(questionSnap.size);
      } catch {
        // Keep the dashboard usable when optional overview data is unavailable.
      } finally { setLoading(false); }
    };
    fetchDashboard();
  }, [profile]);

  if (loading || !profile) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );

  const avgLessons = students.length ? Math.round(students.reduce((total, student) => total + student.totalLessons, 0) / students.length) : 0;
  // Rank by assignment completion rate (submitted/assigned), fall back to lessons
  const topStudents = [...students].sort((a, b) => {
    const ra = a.assigned ? a.submitted / a.assigned : 0;
    const rb = b.assigned ? b.submitted / b.assigned : 0;
    return rb - ra || b.totalLessons - a.totalLessons;
  }).slice(0, 5);
  const firstName = profile.displayName?.split(' ')[0] || 'Guru';
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const stats = [
    { label: 'Total siswa', value: students.length, detail: 'Di kelas Anda', icon: Users, tone: 'blue' as const },
    { label: 'Materi belajar', value: materialCount, detail: 'Konten tersedia', icon: BookOpen, tone: 'emerald' as const },
    { label: 'Bank soal', value: questionCount, detail: 'Soal tersimpan', icon: FileQuestion, tone: 'violet' as const },
    { label: 'Rata-rata tugas', value: `${avgCompletion}%`, detail: 'Penyelesaian tugas', icon: TrendingUp, tone: 'amber' as const },
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
        <PageHero
          tone="emerald"
          eyebrow="Dashboard Guru"
          title={`Selamat datang, ${firstName}`}
          description="Pantau pembelajaran dan lanjutkan pekerjaan yang paling penting."
          icon={<GraduationCap size={24} aria-hidden="true" />}
          chips={[
            { icon: <CalendarDays size={13} aria-hidden="true" />, label: today },
            { icon: <Users size={13} aria-hidden="true" />, label: `${students.length} siswa` },
          ]}
          actions={
            <>
              <Link href="/teacher/kelas" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 shadow-sm transition-transform hover:-translate-y-0.5">
                <GraduationCap size={15} aria-hidden="true" /> Kelola kelas
              </Link>
              <Link href="/teacher/materials" className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30">
                <Plus size={15} aria-hidden="true" /> Tambah materi
              </Link>
            </>
          }
          className="mb-7"
        />

        <section aria-label="Ringkasan dashboard" className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatTile key={stat.label} index={i} tone={stat.tone} icon={<stat.icon size={18} aria-hidden="true" />} value={stat.value} label={stat.label} hint={stat.detail} />
          ))}
        </section>

        <motion.section {...cardMotion} transition={{ delay: 0.08 }} aria-label="Perlu perhatian" className="mb-7 grid gap-3 sm:grid-cols-2">
          {ungraded > 0 || dueSoon > 0 ? (
            <>
              <Link href="/teacher/kelas" className="group flex items-center gap-3 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100 transition-all hover:-translate-y-0.5 hover:shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><AlertCircle size={18} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-amber-900">{ungraded} jawaban belum dinilai</span>
                  <span className="block text-xs text-amber-800/80">{ungraded > 0 ? 'Buka kelas, tab Tugas, untuk memberi nilai.' : 'Semua pengumpulan sudah dinilai.'}</span>
                </span>
                <ArrowRight size={15} className="text-amber-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
              <Link href="/teacher/kelas" className="group flex items-center gap-3 rounded-2xl bg-sky-50 p-4 ring-1 ring-sky-100 transition-all hover:-translate-y-0.5 hover:shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><Clock size={18} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-sky-900">{dueSoon} tugas jatuh tempo 3 hari ke depan</span>
                  <span className="block text-xs text-sky-800/80">Kirim pengingat ke siswa yang belum mengumpulkan.</span>
                </span>
                <ArrowRight size={15} className="text-sky-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100 sm:col-span-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><CheckCircle2 size={18} aria-hidden="true" /></span>
              <span>
                <span className="block text-sm font-bold text-emerald-900">Semua beres</span>
                <span className="block text-xs text-emerald-800/80">Tidak ada penilaian tertunda atau tugas yang segera jatuh tempo.</span>
              </span>
            </div>
          )}
        </motion.section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
          <motion.section {...cardMotion} transition={{ delay: 0.1 }} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 sm:px-6">
              <div><h2 className="font-display text-base font-bold text-gray-900">Performa siswa</h2><p className="mt-0.5 text-xs text-gray-500">Peringkat berdasarkan penyelesaian tugas</p></div>
              <Link href="/teacher/students" className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800">Lihat semua <ArrowRight size={13} /></Link>
            </div>
            {topStudents.length === 0 ? (
              <EmptyState
                compact
                tone="emerald"
                icon={<Users size={28} />}
                title="Belum ada data siswa"
                description="Data performa akan muncul setelah siswa bergabung ke kelasmu. Bagikan kode kelas untuk mengundang mereka."
                action={<Link href="/teacher/kelas" className="inline-flex rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">Lihat kode kelas</Link>}
                className="m-4 shadow-none ring-0"
              />
            ) : (
              <div className="divide-y divide-gray-100">{topStudents.map((student, index) => {
                const rate = student.assigned ? Math.round((student.submitted / student.assigned) * 100) : 0;
                return (
                <Link key={student.uid} href={`/teacher/students/${student.uid}`} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50 sm:px-6">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>{index + 1}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800 group-hover:text-emerald-700">{student.displayName}</p><p className="mt-0.5 truncate text-xs text-gray-400">{student.totalLessons} materi selesai · Aktif {student.lastLoginAt}</p></div>
                  <div className="text-right"><p className="text-sm font-bold tabular-nums text-gray-800">{student.assigned ? `${student.submitted}/${student.assigned}` : '—'}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{student.assigned ? `Tugas ${rate}%` : 'Tugas'}</p></div>
                </Link>
                );
              })}</div>
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
            <motion.section {...cardMotion} transition={{ delay: 0.2 }} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Ringkasan pembelajaran</p>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div><p className="text-2xl font-extrabold tabular-nums text-gray-900">{avgLessons}</p><p className="mt-1 text-xs leading-4 text-gray-400">Rata-rata materi selesai</p></div>
                <div className="border-l border-gray-100 pl-4"><p className="text-2xl font-extrabold tabular-nums text-gray-900">{students.length}</p><p className="mt-1 text-xs leading-4 text-gray-400">Siswa terpantau</p></div>
              </div>
            </motion.section>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
