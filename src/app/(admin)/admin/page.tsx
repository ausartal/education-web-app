'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, BookOpen, GraduationCap, Activity } from 'lucide-react';

const AdminDashboard: FC = () => {
  const [stats, setStats] = useState({
    users: 0,
    materials: 0,
    exams: 0,
    questions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const [usersSnap, matsSnap, examsSnap, qSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'materials')),
        getDocs(collection(db, 'exam_sessions')),
        getDocs(collection(db, 'question_bank')),
      ]);
      setStats({
        users: usersSnap.size,
        materials: matsSnap.size,
        exams: examsSnap.size,
        questions: qSnap.size,
      });
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

  const kpis = [
    {
      icon: Users,
      label: 'Total Users',
      value: stats.users,
      color: 'text-primary',
      bg: 'bg-blue-50',
    },
    {
      icon: BookOpen,
      label: 'Materials',
      value: stats.materials,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      icon: GraduationCap,
      label: 'Exams Taken',
      value: stats.exams,
      color: 'text-violet-500',
      bg: 'bg-violet-50',
    },
    {
      icon: Activity,
      label: 'Questions',
      value: stats.questions,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
    },
  ];

  // Simulated chart data
  const weeklyUsers = [3, 5, 4, 8, 6, 10, stats.users];
  const maxUsers = Math.max(...weeklyUsers, 1);

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-6 font-display text-2xl font-extrabold text-gray-900">
          Admin Dashboard
        </h1>
      </motion.div>

      {/* KPI Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className={`mb-3 inline-flex rounded-xl p-2.5 ${kpi.bg}`}>
                <Icon size={20} className={kpi.color} />
              </div>
              <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500">{kpi.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-bold text-gray-900">
            User Growth (Weekly)
          </h2>
          <div className="flex items-end gap-2">
            {weeklyUsers.map((val, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-primary to-primary-cyan"
                  style={{ height: `${Math.max((val / maxUsers) * 100, 8)}px` }}
                />
                <span className="text-[10px] text-gray-400">
                  {['M', 'T', 'W', 'Th', 'F', 'S', 'Su'][i]}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Platform Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-sm font-bold text-gray-900">
            Platform Overview
          </h2>
          <div className="space-y-3">
            {[
              {
                label: 'Questions (Easy)',
                value: 32,
                max: 100,
                color: 'from-emerald-400 to-teal-400',
              },
              {
                label: 'Questions (Moderate)',
                value: 32,
                max: 100,
                color: 'from-amber-400 to-orange-400',
              },
              {
                label: 'Questions (Hard)',
                value: 32,
                max: 100,
                color: 'from-rose-400 to-pink-400',
              },
              {
                label: 'Materials Published',
                value: stats.materials,
                max: 20,
                color: 'from-primary to-primary-cyan',
              },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-800">
                    {item.value}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                    style={{
                      width: `${Math.min((item.value / item.max) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
