'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Coffee, RefreshCw, SkipForward, Timer,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BreakStudent {
  sessionId: string;
  studentId: string;
  displayName: string;
  currentStage: number;
  breakStartedAt: string | null;
  breakEndsAt: string | null;
  remainingSeconds: number;
}

interface BreaksData {
  examId: string;
  examTitle: string;
  breakDuration: number;
  students: BreakStudent[];
}

// ── Countdown Component ───────────────────────────────────────────────────────

function CountdownTimer({ endsAt, onExpire }: { endsAt: string | null; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!endsAt) return;
    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0) onExpire?.();
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (!endsAt) return <span className="text-gray-400">—</span>;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${
      remaining <= 60 ? 'text-rose-600' : remaining <= 180 ? 'text-amber-600' : 'text-gray-900'
    }`}>
      {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminMASTBreaksPage: FC = () => {
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<BreaksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [skippingAll, setSkippingAll] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/sessions?status=on_break`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const result = await res.json();
      setData(result);
    } catch {
      addToast('error', 'Gagal memuat data istirahat');
    } finally {
      setLoading(false);
    }
  }, [user, examId, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 5 seconds for live countdown
  useEffect(() => {
    const interval = setInterval(fetchData, 5_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSkipBreak = async (sessionId: string) => {
    if (!user || !examId) return;
    setSkippingId(sessionId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/sessions/${sessionId}/skip-break`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Gagal skip istirahat');
      addToast('success', 'Istirahat berhasil di-skip');
      await fetchData();
    } catch {
      addToast('error', 'Gagal skip istirahat');
    } finally {
      setSkippingId(null);
    }
  };

  const handleSkipAll = async () => {
    if (!user || !examId) return;
    if (!confirm('Skip istirahat untuk semua siswa?')) return;
    setSkippingAll(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/skip-all-breaks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Gagal skip semua istirahat');
      addToast('success', 'Semua istirahat berhasil di-skip');
      await fetchData();
    } catch {
      addToast('error', 'Gagal skip semua istirahat');
    } finally {
      setSkippingAll(false);
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
        <p className="text-sm text-gray-500">Data istirahat tidak ditemukan</p>
        <Link href={`/admin/mast/${examId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          Kembali ke detail
        </Link>
      </div>
    );
  }

  const students = data.students ?? [];

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
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Monitor Istirahat</h1>
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
          {students.length > 0 && (
            <button
              onClick={handleSkipAll}
              disabled={skippingAll}
              className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {skippingAll ? <Loader2 size={14} className="animate-spin" /> : <SkipForward size={14} />}
              Skip Semua
            </button>
          )}
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 lg:grid-cols-3"
      >
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-1">
            <Coffee size={14} className="text-amber-500" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Siswa Istirahat</p>
          </div>
          <p className="font-display text-2xl font-black text-gray-900">{students.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={14} className="text-blue-500" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Durasi Istirahat</p>
          </div>
          <p className="font-display text-2xl font-black text-gray-900">{data.breakDuration}m</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
          <div className="flex items-center gap-2 mb-1">
            <SkipForward size={14} className="text-violet-500" />
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Auto-refresh</p>
          </div>
          <p className="font-display text-lg font-black text-gray-900">5 detik</p>
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
          <p className="text-sm font-bold text-gray-900">Siswa Sedang Istirahat ({students.length})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3 text-left font-medium">#</th>
                <th className="px-3 py-3 text-left font-medium">Nama Siswa</th>
                <th className="px-3 py-3 text-left font-medium">Stage</th>
                <th className="px-3 py-3 text-left font-medium">Mulai Istirahat</th>
                <th className="px-3 py-3 text-left font-medium">Sisa Waktu</th>
                <th className="px-3 py-3 text-left font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map((student, i) => (
                <motion.tr
                  key={student.sessionId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white">
                        {student.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="font-semibold text-gray-900">{student.displayName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      Stage {student.currentStage}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500">
                    {student.breakStartedAt
                      ? new Date(student.breakStartedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <CountdownTimer endsAt={student.breakEndsAt} />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleSkipBreak(student.sessionId)}
                      disabled={skippingId === student.sessionId}
                      className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    >
                      {skippingId === student.sessionId ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <SkipForward size={12} />
                      )}
                      Skip
                    </button>
                  </td>
                </motion.tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50">
                        <Coffee size={28} className="text-stone-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-400">Tidak ada siswa istirahat</p>
                        <p className="text-xs text-gray-300 mt-1">
                          Siswa yang sedang istirahat akan muncul di sini
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

export default AdminMASTBreaksPage;
