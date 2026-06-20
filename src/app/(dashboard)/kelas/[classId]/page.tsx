'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, ClipboardList, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ExamScheduleItem {
  id: string;
  title: string;
  examToken: string;
  durationMinutes: number;
  domainIds: string[];
  status: string;
  scheduledAt: unknown;
}

interface ClassDetail {
  id: string;
  name: string;
  subject: string;
  joinCode: string;
  teacherName: string;
}

const StudentClassDetailPage: FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [exams, setExams] = useState<ExamScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  useEffect(() => {
    const fetchData = async () => {
      const t = await getToken();
      // Get student's classes and filter for this one
      const classRes = await fetch('/api/student/classes', { headers: { Authorization: `Bearer ${t}` } });
      const classJson = await classRes.json();
      const found = (classJson.classes || []).find((c: ClassDetail) => c.id === classId);
      if (found) setClassData(found);

      // Get active exams for this class via exam_schedules (public endpoint needed)
      // Use the teacher recap API won't work here — instead, directly fetch from a student-facing API
      // We'll add a simple endpoint or use direct Firestore from client
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      const examSnap = await getDocs(query(
        collection(db, 'exam_schedules'),
        where('classId', '==', classId),
        where('status', '==', 'active')
      ));
      setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() })) as ExamScheduleItem[]);
      setLoading(false);
    };
    fetchData();
  }, [classId, getToken]);

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-xl p-2 hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-extrabold text-gray-900">{classData?.name || 'Kelas'}</h1>
          <p className="text-sm text-gray-500">{classData?.subject} · Guru: {classData?.teacherName}</p>
        </div>
      </div>

      {/* Active Exams */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h2 className="mb-3 text-sm font-bold text-gray-700">Ujian Aktif</h2>
        {exams.length === 0 ? (
          <div className="rounded-2xl bg-white py-10 text-center shadow-sm">
            <ClipboardList size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-400">Belum ada ujian aktif dari guru</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exams.map(exam => (
              <div key={exam.id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{exam.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {exam.domainIds?.length || 0} kompetensi · {exam.durationMinutes} menit
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="mb-1 rounded-xl bg-violet-50 px-3 py-1 text-center">
                      <p className="text-[9px] font-semibold text-violet-500">TOKEN</p>
                      <p className="font-mono text-sm font-black tracking-widest text-violet-700">{exam.examToken}</p>
                    </div>
                    <Link
                      href="/ujian"
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      Ikuti Ujian <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <p className="text-center text-xs text-gray-400">
        Gunakan token di atas di halaman <Link href="/ujian" className="text-violet-600 underline">Ujian</Link> untuk mulai mengerjakan
      </p>
    </div>
  );
};

export default StudentClassDetailPage;
