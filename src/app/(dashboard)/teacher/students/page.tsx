'use client';

import { FC, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { Search } from 'lucide-react';

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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 font-display text-2xl font-extrabold text-gray-900">
          Students ({students.length})
        </h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full rounded-2xl bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Student Cards */}
        <div className="space-y-3">
          {filtered.map((s, i) => (
            <motion.div
              key={s.uid}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/teacher/students/${s.uid}`}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan text-sm font-bold text-white">
                  {s.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">
                    {s.displayName}
                  </p>
                  <p className="text-xs text-gray-500">{s.email}</p>
                </div>
                <div className="hidden gap-4 text-center sm:flex">
                  <div>
                    <p className="text-sm font-bold text-amber-600">{s.xp}</p>
                    <p className="text-[10px] text-gray-400">XP</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.level}</p>
                    <p className="text-[10px] text-gray-400">Level</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-orange-500">
                      {s.streak}
                    </p>
                    <p className="text-[10px] text-gray-400">Streak</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">
                      {s.totalLessons}
                    </p>
                    <p className="text-[10px] text-gray-400">Lessons</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
};

export default TeacherStudents;
