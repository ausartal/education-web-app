'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Key,
  BarChart3,
  Users,
  Trophy,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';

const AdminKPSPage: FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCodes: 0,
    activeCodes: 0,
    totalSessions: 0,
    completedSessions: 0,
    avgScore: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        const token = await user.getIdToken();

        // Fetch codes
        const codesRes = await fetch('/api/kps/admin/codes', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const codesData = codesRes.ok ? await codesRes.json() : { codes: [] };

        // Fetch results
        const resultsRes = await fetch('/api/kps/admin/results', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const resultsData = resultsRes.ok ? await resultsRes.json() : { results: [] };

        const codes = codesData.codes || [];
        const results = resultsData.results || [];

        setStats({
          totalCodes: codes.length,
          activeCodes: codes.filter((c: { status: string }) => c.status === 'active').length,
          totalSessions: results.length,
          completedSessions: results.filter((r: { finalLevel: string }) => r.finalLevel).length,
          avgScore: results.length > 0
            ? Math.round(results.reduce((sum: number, r: { numericScore: number }) => sum + (r.numericScore || 0), 0) / results.length)
            : 0,
        });
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const statCards = [
    {
      icon: <Key size={24} className="text-[#5841EA]" />,
      label: 'Total Kode',
      value: stats.totalCodes,
      sub: `${stats.activeCodes} aktif`,
      color: 'bg-[#5841EA]/10',
    },
    {
      icon: <Users size={24} className="text-emerald-600" />,
      label: 'Total Ujian',
      value: stats.totalSessions,
      sub: `${stats.completedSessions} selesai`,
      color: 'bg-emerald-50',
    },
    {
      icon: <TrendingUp size={24} className="text-amber-600" />,
      label: 'Rata-rata Skor',
      value: stats.avgScore,
      sub: 'dari 100',
      color: 'bg-amber-50',
    },
  ];

  const menuCards = [
    {
      title: 'Kelola Kode Akses',
      desc: 'Buat, edit, dan nonaktifkan kode akses ujian KPS',
      icon: <Key size={24} className="text-[#5841EA]" />,
      href: '/admin/kps/codes',
    },
    {
      title: 'Hasil Siswa',
      desc: 'Lihat dan analisis hasil ujian KPS semua siswa',
      icon: <BarChart3 size={24} className="text-emerald-600" />,
      href: '/admin/kps/results',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ujian KPS</h1>
        <p className="text-sm text-gray-500">
          Kelola ujian Keterampilan Proses Sains
        </p>
      </div>

      {/* Stat Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {loading ? '-' : card.value}
                </p>
                <p className="text-xs text-gray-400">{card.sub}</p>
              </div>
              <div className={`rounded-xl ${card.color} p-3`}>
                {card.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Menu Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {menuCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:border-[#5841EA]/20 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="rounded-xl bg-gray-50 p-3 group-hover:bg-[#5841EA]/10">
                {card.icon}
              </div>
              <ArrowRight
                size={20}
                className="text-gray-300 transition-all group-hover:translate-x-1 group-hover:text-[#5841EA]"
              />
            </div>
            <h3 className="mt-4 text-lg font-bold text-gray-900">{card.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminKPSPage;
