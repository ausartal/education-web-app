'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Coffee, RefreshCw, SkipForward, Timer } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';

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

function fmtCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MSATBreaksPage: FC = () => {
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<BreaksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipping, setSkipping] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        const breakStudents: BreakStudent[] = (d.sessions ?? [])
          .filter((s: { status: string }) => s.status === 'on_break')
          .map((s: Record<string, unknown>) => ({
            sessionId: s.id as string,
            studentId: s.studentId as string,
            displayName: (s.displayName as string) ?? 'Siswa',
            currentStage: s.currentStage as number,
            breakStartedAt: s.breakStartedAt as string | null,
            breakEndsAt: s.breakEndsAt as string | null,
            remainingSeconds: s.breakEndsAt
              ? Math.max(0, Math.floor((new Date(s.breakEndsAt as string).getTime() - Date.now()) / 1000))
              : 0,
          }));
        setData({ examId, examTitle: d.examTitle ?? '', breakDuration: d.breakDuration ?? 10, students: breakStudents });
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [user, examId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSkip = async (sessionId: string) => {
    if (!user) return;
    setSkipping(sessionId);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/skip-break`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error('Gagal skip');
      addToast('success', 'Istirahat berhasil di-skip');
      fetchData();
    } catch {
      addToast('error', 'Gagal skip istirahat');
    } finally { setSkipping(null); }
  };

  const handleSkipAll = async () => {
    if (!user || !data?.students.length) return;
    if (!confirm('Skip istirahat untuk semua siswa?')) return;
    for (const s of data.students) {
      await handleSkip(s.sessionId);
    }
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
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Monitor Istirahat</h1>
            <p className="text-sm text-gray-500">{data?.examTitle ?? 'Memuat...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50">
            <RefreshCw size={12} /> Refresh
          </button>
          {students.length > 0 && (
            <button onClick={handleSkipAll}
              className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700">
              <SkipForward size={14} /> Skip Semua
            </button>
          )}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3.5 text-left font-medium">Siswa</th>
                <th className="px-3 py-3.5 text-left font-medium">Stage</th>
                <th className="px-3 py-3.5 text-left font-medium">Countdown</th>
                <th className="px-3 py-3.5 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {students.map(s => (
                <tr key={s.sessionId} className="hover:bg-stone-50/50">
                  <td className="px-5 py-3.5 font-semibold text-gray-900">{s.displayName}</td>
                  <td className="px-3 py-3.5">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      Stage {s.currentStage} → {s.currentStage + 1}
                    </span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Timer size={12} className="text-amber-500" />
                      <span className="font-mono font-bold text-gray-900">{fmtCountdown(s.remainingSeconds)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <button onClick={() => handleSkip(s.sessionId)} disabled={skipping === s.sessionId}
                      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50">
                      {skipping === s.sessionId ? <Loader2 size={11} className="animate-spin" /> : <SkipForward size={11} />} Skip
                    </button>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={4} className="py-16 text-center">
                  <Coffee size={32} className="mx-auto mb-3 text-stone-300" />
                  <p className="text-sm font-semibold text-gray-400">Tidak ada siswa yang sedang istirahat</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default MSATBreaksPage;
