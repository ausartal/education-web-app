'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Trophy, RefreshCw, BarChart3, Download,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { MASTPredikat, MASTStageDifficulty, MASTSessionStatus } from '@/types/mast';

// ── Types ─────────────────────────────────────────────────────────────────────

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
  avgScore: number;
  predikatDistribution: Record<MASTPredikat, number>;
}

interface ResultsData {
  examId: string;
  examTitle: string;
  results: ResultRow[];
  summary: ResultsSummary;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PREDIKAT_COLORS: Record<MASTPredikat, string> = {
  Istimewa:  'bg-violet-50 text-violet-700',
  Unggul:    'bg-emerald-50 text-emerald-700',
  Madya:     'bg-blue-50 text-blue-700',
  Semenjana: 'bg-amber-50 text-amber-700',
  Terbatas:  'bg-rose-50 text-rose-700',
};

const PREDIKAT_BAR_COLORS: Record<MASTPredikat, string> = {
  Istimewa:  'bg-violet-400',
  Unggul:    'bg-emerald-400',
  Madya:     'bg-blue-400',
  Semenjana: 'bg-amber-400',
  Terbatas:  'bg-rose-400',
};

const STATUS_COLORS: Record<MASTSessionStatus, string> = {
  waiting:     'bg-amber-50 text-amber-700',
  in_progress: 'bg-blue-50 text-blue-700',
  on_break:    'bg-sky-50 text-sky-700',
  completed:   'bg-emerald-50 text-emerald-700',
  timed_out:   'bg-gray-100 text-gray-600',
  flagged:     'bg-rose-50 text-rose-700',
};

const STATUS_LABELS: Record<MASTSessionStatus, string> = {
  waiting:     'Menunggu',
  in_progress: 'Berlangsung',
  on_break:    'Istirahat',
  completed:   'Selesai',
  timed_out:   'Waktu Habis',
  flagged:     'Ditandai',
};

const DIFFICULTY_LABELS: Record<MASTStageDifficulty, string> = {
  low:    'Mudah',
  medium: 'Sedang',
  high:   'Sulit',
};

const DIFFICULTY_COLORS: Record<MASTStageDifficulty, string> = {
  low:    'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-rose-100 text-rose-700',
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminMASTResultsPage: FC = () => {
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/results`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const result = await res.json();
      setData(result);
    } catch {
      addToast('error', 'Gagal memuat rekap hasil');
    } finally {
      setLoading(false);
    }
  }, [user, examId, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    if (!user || !examId) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}/results?format=csv`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mast-results-${examId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Export CSV berhasil');
    } catch {
      addToast('error', 'Gagal export hasil');
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
        <p className="text-sm text-gray-500">Data hasil tidak ditemukan</p>
        <Link href={`/admin/mast/${examId}`} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          Kembali ke detail
        </Link>
      </div>
    );
  }

  const { summary } = data;
  const filteredResults = data.results.filter(r =>
    !search || r.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const predikatEntries = (['Istimewa', 'Unggul', 'Madya', 'Semenjana', 'Terbatas'] as MASTPredikat[]);
  const maxPredikatCount = Math.max(...predikatEntries.map(p => summary.predikatDistribution[p] ?? 0), 1);

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
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Rekap Hasil</h1>
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
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Total Peserta</p>
          <p className="font-display text-2xl font-black text-gray-900">{summary.totalStudents}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Selesai</p>
          <p className="font-display text-2xl font-black text-emerald-600">{summary.completedStudents}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Rata-rata Skor</p>
          <p className="font-display text-2xl font-black text-violet-600">
            {summary.avgScore !== null && summary.avgScore !== undefined ? summary.avgScore.toFixed(1) : '—'}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Completion Rate</p>
          <p className="font-display text-2xl font-black text-blue-600">
            {summary.totalStudents > 0
              ? Math.round((summary.completedStudents / summary.totalStudents) * 100)
              : 0}%
          </p>
        </motion.div>
      </div>

      {/* Predikat Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={16} className="text-amber-500" />
          <h2 className="text-sm font-bold text-gray-900">Distribusi Predikat</h2>
        </div>
        <div className="space-y-3">
          {predikatEntries.map((predikat) => {
            const count = summary.predikatDistribution[predikat] ?? 0;
            const pct = summary.completedStudents > 0
              ? Math.round((count / summary.completedStudents) * 100)
              : 0;
            return (
              <div key={predikat}>
                <div className="mb-1 flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${PREDIKAT_COLORS[predikat]}`}>
                    {predikat}
                  </span>
                  <span className="text-xs font-bold text-gray-900">
                    {count} <span className="font-normal text-gray-400">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${maxPredikatCount > 0 ? (count / maxPredikatCount) * 100 : 0}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className={`h-full rounded-full ${PREDIKAT_BAR_COLORS[predikat]}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Results Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-bold text-gray-900">Detail Hasil ({filteredResults.length})</p>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama siswa..."
            className="ml-auto rounded-xl border border-stone-200 px-3 py-1.5 text-xs outline-none focus:border-violet-400 w-52"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3 text-left font-medium">#</th>
                <th className="px-3 py-3 text-left font-medium">Nama Siswa</th>
                <th className="px-3 py-3 text-left font-medium">Skor</th>
                <th className="px-3 py-3 text-left font-medium">Predikat</th>
                <th className="px-3 py-3 text-left font-medium">Jalur Stage</th>
                <th className="px-3 py-3 text-left font-medium">Status</th>
                <th className="px-3 py-3 text-left font-medium">Durasi</th>
                <th className="px-3 py-3 text-left font-medium">Selesai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredResults.map((result, i) => (
                <motion.tr
                  key={result.sessionId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-stone-50/50 transition-colors"
                >
                  <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-600 text-[10px] font-bold text-white">
                        {result.displayName?.charAt(0).toUpperCase() ?? '?'}
                      </div>
                      <span className="font-semibold text-gray-900">{result.displayName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`font-bold tabular-nums ${
                      result.finalScore !== null ? 'text-gray-900' : 'text-gray-300'
                    }`}>
                      {result.finalScore !== null ? result.finalScore.toFixed(1) : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {result.predikat ? (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${PREDIKAT_COLORS[result.predikat] ?? 'bg-gray-100 text-gray-600'}`}>
                        {result.predikat}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {result.stagePath?.map((diff, idx) => (
                        <span
                          key={idx}
                          className={`rounded px-1.5 py-0.5 text-[9px] font-semibold ${DIFFICULTY_COLORS[diff] ?? 'bg-gray-100 text-gray-500'}`}
                        >
                          S{idx + 1}: {DIFFICULTY_LABELS[diff] ?? diff}
                        </span>
                      ))}
                      {(!result.stagePath || result.stagePath.length === 0) && (
                        <span className="text-gray-300">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      STATUS_COLORS[result.status] ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {STATUS_LABELS[result.status] ?? result.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 tabular-nums">
                    {result.durationMinutes ? `${result.durationMinutes}m` : '—'}
                  </td>
                  <td className="px-3 py-3 text-[10px] text-gray-400 whitespace-nowrap">
                    {fmtDate(result.completedAt)}
                  </td>
                </motion.tr>
              ))}
              {filteredResults.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50">
                        <BarChart3 size={28} className="text-stone-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-400">Belum ada hasil</p>
                        <p className="text-xs text-gray-300 mt-1">
                          Hasil akan muncul setelah siswa menyelesaikan ujian
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

export default AdminMASTResultsPage;
