'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Users, Play, RefreshCw, UserCheck, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

interface WaitingRoomStudent {
  studentId: string;
  displayName: string;
  joinedAt: string;
  ready: boolean;
}

interface WaitingRoomData {
  examId: string;
  examTitle: string;
  status: 'waiting' | 'started' | 'ended';
  students: WaitingRoomStudent[];
  startedAt: string | null;
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

const MSATWaitingRoomPage: FC = () => {
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/waiting-room`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [user, examId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStart = async () => {
    if (!user || !examId) return;
    if (!confirm('Mulai ujian? Semua siswa di ruang tunggu akan masuk ke Stage 1.')) return;
    setStarting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/start`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memulai');
      addToast('success', 'Ujian berhasil dimulai');
      fetchData();
    } catch {
      addToast('error', 'Gagal memulai ujian');
    } finally { setStarting(false); }
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>;
  }

  const students = data?.students ?? [];

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/msat/exams/${examId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Ruang Tunggu</h1>
            <p className="text-sm text-gray-500">{data?.examTitle ?? 'Memuat...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50">
            <RefreshCw size={12} /> Refresh
          </button>
          {data?.status === 'waiting' && students.length > 0 && (
            <button onClick={handleStart} disabled={starting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
              {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Mulai Ujian
            </button>
          )}
        </div>
      </motion.div>

      {/* Status */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100 text-center">
          <Users size={20} className="mx-auto mb-2 text-blue-500" />
          <p className="font-display text-2xl font-black text-gray-900">{students.length}</p>
          <p className="text-xs text-gray-500">Siswa Menunggu</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100 text-center">
          <UserCheck size={20} className="mx-auto mb-2 text-emerald-500" />
          <p className="font-display text-2xl font-black text-gray-900">{students.filter(s => s.ready).length}</p>
          <p className="text-xs text-gray-500">Siap</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100 text-center">
          <Clock size={20} className="mx-auto mb-2 text-amber-500" />
          <p className="font-display text-lg font-black text-gray-900">{data?.status === 'started' ? 'Dimulai' : 'Menunggu'}</p>
          <p className="text-xs text-gray-500">Status</p>
        </div>
      </motion.div>

      {/* Student List */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3.5 text-left font-medium">#</th>
                <th className="px-3 py-3.5 text-left font-medium">Nama Siswa</th>
                <th className="px-3 py-3.5 text-left font-medium">Bergabung</th>
                <th className="px-3 py-3.5 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map((s, i) => (
                <tr key={s.studentId} className="hover:bg-stone-50/50">
                  <td className="px-5 py-3.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-3.5 font-semibold text-gray-900">{s.displayName || 'Siswa'}</td>
                  <td className="px-3 py-3.5 text-gray-500">{fmtTime(s.joinedAt)}</td>
                  <td className="px-3 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      s.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}>{s.ready ? 'Siap' : 'Menunggu'}</span>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={4} className="py-16 text-center">
                  <Users size={32} className="mx-auto mb-3 text-stone-300" />
                  <p className="text-sm font-semibold text-gray-400">Belum ada siswa di ruang tunggu</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default MSATWaitingRoomPage;
