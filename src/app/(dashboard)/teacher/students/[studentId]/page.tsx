'use client';

import { FC, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from '@/lib/client-firestore';
import { db } from '@/lib/firebase';
import { UserProfile, ExamSession } from '@/types/firestore';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { PageHero } from '@/components/ui/PageHero';
import { BookOpen, Target, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const StudentDetail: FC = () => {
  const params = useParams();
  const studentId = params.studentId as string;
  const [student, setStudent] = useState<UserProfile | null>(null);
  const [exams, setExams] = useState<ExamSession[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    const fetch = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', studentId));
        if (snap.exists()) {
          setStudent(snap.data() as UserProfile);
          setNotes((snap.data() as Record<string, string>).teacherNotes || '');
        }
        const examSnap = await getDocs(
          query(collection(db, 'exam_sessions'), where('studentId', '==', studentId))
        );
        setExams(examSnap.docs.map((d) => d.data() as ExamSession));
      } catch { /* leave empty on error */ } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [studentId]);

  const handleSaveNotes = async (value: string) => {
    setNotes(value);
    await updateDoc(doc(db, 'users', studentId), { teacherNotes: value });
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return <p className="py-20 text-center text-gray-500">Student not found</p>;
  }

  const stats = [
    {
      icon: BookOpen,
      label: 'Lessons',
      value: student.stats.totalLessons,
      color: 'text-primary',
      bg: 'bg-blue-50',
    },
    {
      icon: Target,
      label: 'Quizzes',
      value: student.stats.totalQuizzes,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
  ];

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/teacher/students"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={14} /> Kembali ke daftar siswa
        </Link>

        <PageHero
          tone="blue"
          eyebrow={student.profile.school ? `${student.profile.school}, kelas ${student.profile.grade}` : 'Profil siswa'}
          title={student.displayName}
          description={student.email}
          className="mb-6"
        />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-2xl bg-white p-4 text-center shadow-sm"
              >
                <div
                  className={`mx-auto mb-1 inline-flex rounded-xl p-2 ${s.bg}`}
                >
                  <Icon size={16} className={s.color} />
                </div>
                <p className="text-lg font-black text-gray-900">{s.value}</p>
                <p className="text-[10px] text-gray-500">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Exam History */}
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-display text-base font-bold text-gray-900">
            Riwayat ujian
          </h2>
          {exams.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">
              Belum ada ujian yang dikerjakan
            </p>
          ) : (
            <div className="space-y-3">
              {exams.map((exam, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {exam.examId}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {exam.status}, theta {exam.theta.toFixed(1)}
                    </p>
                  </div>
                  {exam.result && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                      {Math.round(exam.result.accuracy * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Theta Progression Chart */}
        {exams.length > 0 && (
          <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="mb-4 font-display text-base font-bold text-gray-900">
              Perkembangan theta
            </h2>
            <div className="flex items-end gap-1">
              {exams.map((exam, i) => {
                const normalized = ((exam.theta + 3) / 6) * 100; // -3 to +3 → 0 to 100
                return (
                  <div
                    key={i}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <span className="text-[9px] text-gray-500">
                      {exam.theta.toFixed(1)}
                    </span>
                    <div
                      className="w-full rounded-md bg-primary/70"
                      style={{ height: `${Math.max(normalized, 8)}px` }}
                    />
                    <span className="text-[9px] text-gray-400">#{i + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Teacher Notes */}
        <div className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-4 font-display text-base font-bold text-gray-900">
            Catatan
          </h2>
          <textarea
            placeholder="Tulis catatan tentang siswa ini"
            defaultValue={notes}
            onBlur={(e) => handleSaveNotes(e.target.value)}
            rows={4}
            className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
          <p className="mt-2 text-xs text-gray-400">
            Tersimpan otomatis saat kamu pindah dari kolom ini
          </p>
        </div>
      </div>
    </RoleGuard>
  );
};

export default StudentDetail;
