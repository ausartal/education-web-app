'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, BookOpen, PlusCircle, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';

interface StudentRow {
  uid: string;
  displayName: string;
  email: string;
  xp: number;
  totalLessons: number;
  lastLoginAt: string;
}

const TeacherDashboard: FC = () => {
  const { profile } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [materialCount, setMaterialCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get all students
      const studentsSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'student'))
      );
      setStudents(
        studentsSnap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName,
            email: data.email,
            xp: data.stats?.xp || 0,
            totalLessons: data.stats?.totalLessons || 0,
            lastLoginAt:
              data.lastLoginAt?.toDate?.()?.toLocaleDateString() || '-',
          };
        })
      );

      // Get material count
      const matSnap = await getDocs(collection(db, 'materials'));
      setMaterialCount(matSnap.size);
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const avgXP =
    students.length > 0
      ? Math.round(students.reduce((a, s) => a + s.xp, 0) / students.length)
      : 0;

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
            Teacher Dashboard
          </h1>
          <p className="mb-8 text-sm text-gray-500">
            Welcome, {profile?.displayName}
          </p>
        </motion.div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <Users size={20} className="mb-2 text-primary" />
            <p className="text-2xl font-black text-gray-900">
              {students.length}
            </p>
            <p className="text-xs text-gray-500">Total Students</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <BookOpen size={20} className="mb-2 text-emerald-500" />
            <p className="text-2xl font-black text-gray-900">{materialCount}</p>
            <p className="text-xs text-gray-500">Materials</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <Users size={20} className="mb-2 text-amber-500" />
            <p className="text-2xl font-black text-gray-900">{avgXP}</p>
            <p className="text-xs text-gray-500">Avg XP</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-3">
          <Link
            href="/teacher/materials"
            className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
          >
            <PlusCircle size={16} /> Manage Materials
          </Link>
          <Link
            href="/teacher/questions"
            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <PlusCircle size={16} /> Manage Questions
          </Link>
          <Link
            href="/teacher/messages"
            className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
          >
            <MessageCircle size={16} /> Messages
          </Link>
        </div>

        {/* Student Table */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-display text-base font-bold text-gray-900">
            Students
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">XP</th>
                  <th className="pb-3 font-medium">Lessons</th>
                  <th className="pb-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {students.map((s) => (
                  <tr key={s.uid} className="hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">
                      {s.displayName}
                    </td>
                    <td className="py-3 text-gray-500">{s.email}</td>
                    <td className="py-3 font-semibold text-amber-600">
                      {s.xp}
                    </td>
                    <td className="py-3">{s.totalLessons}</td>
                    <td className="py-3 text-gray-400">{s.lastLoginAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherDashboard;
