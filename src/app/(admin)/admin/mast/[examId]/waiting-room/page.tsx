'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Users, Play, RefreshCw, UserCheck, Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminMASTWaitingRoomPage: FC = () => {
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/waiting-room`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const result = await res.json();
      setData(result);
    } catch {
      addToast('error', 'Gagal memuat data ruang tunggu');
    } finally {
      setLoading(false);
    }
  }, [user, examId, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!data || data.status !== 'waiting') return;
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [data, fetchData]);

  const handleStartExam = async () => {
    if (!user || !examId) return;
    if (!confirm('Mulai ujian sekarang? Semua siswa di ruang tunggu akan memulai ujian.')) return;
    setStarting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal memulai ujian' }));
        throw new Error(err.error ?? 'Gagal memulai ujian');
      }
      addToast('success', 'Ujian berhasil dimulai');
      await fetchData();
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal memulai ujian');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">Data ruang tunggu tidak ditemukan</p>
        <Link href={`/admin/mast/${examId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          Kembali ke detail
        </Link>
      </div>
    );
  }

  const students = data.students ?? [];
  const readyCount = students.filter(s => s.ready).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/mast/${examId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Ruang Tunggu</h1>
            <p className="text-sm text-gray-500">{data.examTitle ?? 'Ujian MAST'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-xs hover:bg-stone-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {data.status === 'waiting' && (
            <button
              onClick={handleStartExam}
              disabled={starting || students.length === 0}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {starting ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Mulai Ujian
            </button>
          )}
        </div>
      </motion.div>

      {/* Status Strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3"
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-blue-500" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Total Siswa</p>
          </div>
          <p className="font-display text-2xl font-black text-gray-900">{students.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-1">
            <UserCheck size={14} className="text-emerald-500" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Siap</p>
          </div>
          <p className="font-display text-2xl font-black text-emerald-600">{readyCount}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={14} className="text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            data.status === 'waiting' ? 'bg-amber-50 text-amber-700'
              : data.status === 'started' ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {data.status === 'waiting' ? 'Menunggu' : data.status === 'started' ? 'Dimulai' : 'Berakhir'}
          </span>
        </div>
      </motion.div>

      {/* Student List */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-bold text-gray-900">Daftar Siswa ({students.length})</p>
          <p className="text-xs text-gray-400 mt-0.5">Auto-refresh setiap 10 detik</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3 text-left font-medium">#</th>
                <th className="px-3 py-3 text-left font-medium">Nama Siswa</th>
                <th className="px-3 py-3 text-left font-medium">Waktu Join</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map((student, i) => (
                <motion.tr
                  key={student.studentId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-[10px] font-bold text-white">
                        {student.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="font-semibold text-gray-900">{student.displayName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-500">{fmtTime(student.joinedAt)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      student.ready
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {student.ready ? 'Siap' : 'Menunggu'}
                    </span>
                  </td>
                </motion.tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50">
                        <Users size={28} className="text-stone-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-400">Belum ada siswa</p>
                        <p className="text-xs text-gray-300 mt-1">
                          Siswa akan muncul setelah join menggunakan kode ujian
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminMASTWaitingRoomPage;
