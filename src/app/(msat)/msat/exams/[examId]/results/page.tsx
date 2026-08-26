'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Trophy, RefreshCw, Download, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { MASTPredikat, MASTStageDifficulty, MASTSessionStatus } from '@/types/mast';

interface ResultRow {
  sessionId: string;
  studentId: string;
  displayName: string;
  finalScore: number | null;
  predikat: MASTPredikat | null;
  stagePath: MASTStageDifficulty[];
  status: MASTSessionStatus;
  completedAt: string | null;
  durationMinutes: number;
}

interface ResultsSummary {
  totalStudents: number;
  completedStudents: number;
  avgScore: number | null;
  predikatDistribution: Record<string, number>;
}

const PREDIKAT_COLORS: Record<MASTPredikat, string> = {
  Istimewa: 'bg-emerald-50 text-emerald-700',
  Unggul: 'bg-blue-50 text-blue-700',
  Madya: 'bg-amber-50 text-amber-700',
  Semenjana: 'bg-orange-50 text-orange-700',
  Terbatas: 'bg-rose-50 text-rose-700',
};

const STATUS_LABELS: Record<MASTSessionStatus, { label: string; color: string }> = {
  waiting: { label: 'Menunggu', color: 'bg-amber-50 text-amber-700' },
  in_progress: { label: 'Mengerjakan', color: 'bg-blue-50 text-blue-700' },
  on_break: { label: 'Istirahat', color: 'bg-violet-50 text-violet-700' },
  completed: { label: 'Selesai', color: 'bg-emerald-50 text-emerald-700' },
  timed_out: { label: 'Waktu Habis', color: 'bg-rose-50 text-rose-700' },
  flagged: { label: 'Ditandai', color: 'bg-rose-50 text-rose-700' },
};

const MSATExamResultsPage: FC = () => {
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [results, setResults] = useState<ResultRow[]>([]);
  const [summary, setSummary] = useState<ResultsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat');
      const data = await res.json();
      setResults(data.results ?? []);
      setSummary(data.summary ?? null);
    } catch {
      addToast('error', 'Gagal memuat hasil ujian');
    } finally { setLoading(false); }
  }, [user, examId, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const exportCSV = () => {
    if (results.length === 0) return;
    const headers = ['Nama', 'Skor', 'Predikat', 'Jalur Stage', 'Status', 'Durasi (menit)'];
    const rows = results.map(r => [
      r.displayName,
      r.finalScore?.toFixed(1) ?? '',
      r.predikat ?? '',
      r.stagePath.join(' → '),
      r.status,
      r.durationMinutes?.toString() ?? '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `msat-results-${examId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/msat/exams/${examId}`}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Rekap Hasil</h1>
            <p className="text-sm text-gray-500">Hasil ujian MSAT</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchData}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 hover:bg-stone-50">
            <RefreshCw size={12} /> Refresh
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-600 hover:bg-stone-50">
            <Download size={12} /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Summary */}
      {summary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Total Peserta</p>
            <p className="font-display text-2xl font-black text-gray-900">{summary.totalStudents}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Selesai</p>
            <p className="font-display text-2xl font-black text-emerald-600">{summary.completedStudents}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Rata-rata Skor</p>
            <p className="font-display text-2xl font-black text-gray-900">{summary.avgScore?.toFixed(1) ?? '—'}</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
            <p className="text-[10px] font-bold uppercase text-gray-400">Distribusi Predikat</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(summary.predikatDistribution).map(([p, c]) => (
                <span key={p} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${PREDIKAT_COLORS[p as MASTPredikat] ?? 'bg-stone-100'}`}>
                  {p}: {c}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Results Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3.5 text-left font-medium">#</th>
                <th className="px-3 py-3.5 text-left font-medium">Nama</th>
                <th className="px-3 py-3.5 text-left font-medium">Skor</th>
                <th className="px-3 py-3.5 text-left font-medium">Predikat</th>
                <th className="px-3 py-3.5 text-left font-medium">Jalur</th>
                <th className="px-3 py-3.5 text-left font-medium">Status</th>
                <th className="px-3 py-3.5 text-left font-medium">Durasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {results.map((r, i) => {
                const statusCfg = STATUS_LABELS[r.status] ?? STATUS_LABELS.waiting;
                return (
                  <tr key={r.sessionId} className="hover:bg-stone-50/50">
                    <td className="px-5 py-3.5 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-3.5 font-semibold text-gray-900">{r.displayName}</td>
                    <td className="px-3 py-3.5">
                      <span className="font-bold text-gray-900">{r.finalScore?.toFixed(1) ?? '—'}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      {r.predikat ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PREDIKAT_COLORS[r.predikat] ?? ''}`}>
                          {r.predikat}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="font-mono text-[10px] text-gray-500">{r.stagePath?.join(' → ') ?? '—'}</span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                    </td>
                    <td className="px-3 py-3.5 text-gray-500">{r.durationMinutes ?? '—'}m</td>
                  </tr>
                );
              })}
              {results.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center">
                  <Trophy size={32} className="mx-auto mb-3 text-stone-300" />
                  <p className="text-sm font-semibold text-gray-400">Belum ada hasil</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default MSATExamResultsPage;
