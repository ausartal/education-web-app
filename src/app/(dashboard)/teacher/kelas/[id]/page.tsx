'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, ClipboardList, Copy, Check } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface Student { uid: string; displayName: string; email: string; xp: number; }
interface ExamItem { id: string; title: string; examToken: string; status: string; completedCount: number; sessionCount: number; }
interface ClassDetail { id: string; name: string; subject: string; joinCode: string; teacherId: string; studentIds: string[]; }

const TeacherClassDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  useEffect(() => {
    const fetchData = async () => {
      const t = await getToken();
      const res = await fetch(`/api/teacher/classes/${id}`, { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) { setLoading(false); return; }
      const data = await res.json();
      setCls(data.class);
      setStudents(data.students || []);
      setExams(data.exams || []);
      setLoading(false);
    };
    fetchData();
  }, [id, getToken]);

  const copyCode = () => {
    if (!cls) return;
    navigator.clipboard.writeText(cls.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );

  if (!cls) return <div className="p-8 text-center text-gray-400">Kelas tidak ditemukan</div>;

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-4xl py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-extrabold text-gray-900">{cls.name}</h1>
            <p className="text-sm text-gray-500">{cls.subject}</p>
          </div>
          {/* Join Code */}
          <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 px-5 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Kode Bergabung</p>
              <p className="font-mono text-xl font-black tracking-widest text-emerald-700">{cls.joinCode}</p>
            </div>
            <button onClick={copyCode} className="rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Students */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Users size={16} /> Siswa ({students.length})</h2>
            </div>
            {students.length === 0 ? (
              <div className="rounded-2xl bg-white py-10 text-center shadow-sm">
                <p className="text-sm text-gray-400">Belum ada siswa yang bergabung</p>
                <p className="mt-1 text-xs text-gray-400">Bagikan kode <strong>{cls.joinCode}</strong> ke siswa</p>
              </div>
            ) : (
              <div className="rounded-2xl bg-white shadow-sm divide-y divide-gray-50">
                {students.map((s, i) => (
                  <motion.div key={s.uid} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-400 text-sm font-bold text-white">
                      {s.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{s.displayName}</p>
                      <p className="truncate text-xs text-gray-400">{s.email}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-600">{s.xp} XP</span>
                    <Link href={`/teacher/students/${s.uid}`} className="text-xs text-primary hover:underline">Detail</Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Exams */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><ClipboardList size={16} /> Ujian ({exams.length})</h2>
              <Link href="/teacher/ujian" className="text-xs text-violet-600 hover:underline">+ Buat</Link>
            </div>
            {exams.length === 0 ? (
              <div className="rounded-2xl bg-white py-8 text-center shadow-sm">
                <p className="text-sm text-gray-400">Belum ada ujian</p>
                <Link href="/teacher/ujian" className="mt-2 inline-block text-xs text-violet-600 hover:underline">Buat ujian baru</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {exams.map(exam => (
                  <div key={exam.id} className="rounded-2xl bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-gray-900">{exam.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${exam.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {exam.status === 'active' ? 'Aktif' : exam.status}
                      </span>
                    </div>
                    <div className="mb-2 rounded-lg bg-violet-50 px-3 py-1.5 text-center">
                      <p className="font-mono text-sm font-black tracking-widest text-violet-700">{exam.examToken}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{exam.completedCount}/{exam.sessionCount} selesai</span>
                      <Link href={`/teacher/ujian/${exam.id}/recap`} className="text-violet-600 hover:underline">Rekap →</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherClassDetailPage;
