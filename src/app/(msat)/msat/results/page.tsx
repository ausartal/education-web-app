'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  BarChart3, Loader2, RefreshCw, ChevronRight, Trophy, Users,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { MASTExam, MASTPredikat } from '@/types/mast';

const PREDIKAT_COLORS: Record<MASTPredikat, string> = {
  Istimewa: 'bg-emerald-50 text-emerald-700',
  Unggul: 'bg-blue-50 text-blue-700',
  Madya: 'bg-amber-50 text-amber-700',
  Semenjana: 'bg-orange-50 text-orange-700',
  Terbatas: 'bg-rose-50 text-rose-700',
};

interface ExamWithResults extends MASTExam {
  participantCount: number;
  avgScore: number | null;
  predikatDistribution: Record<string, number>;
}

const MSATResultsPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [exams, setExams] = useState<ExamWithResults[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/mast-exams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      const examList: MASTExam[] = data.exams ?? [];

      // Fetch results for completed/in_progress exams
      const examsWithResults: ExamWithResults[] = [];
      for (const exam of examList) {
        if (exam.status === 'completed' || exam.status === 'in_progress') {
          try {
            const resR = await fetch(`/api/admin/mast-exams/${exam.id}/results`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (resR.ok) {
              const rData = await resR.json();
              examsWithResults.push({
                ...exam,
                participantCount: rData.participantCount ?? 0,
                avgScore: rData.avgScore ?? null,
                predikatDistribution: rData.predikatDistribution ?? {},
              });
            } else {
              examsWithResults.push({ ...exam, participantCount: 0, avgScore: null, predikatDistribution: {} });
            }
          } catch {
            examsWithResults.push({ ...exam, participantCount: 0, avgScore: null, predikatDistribution: {} });
          }
        } else {
          examsWithResults.push({ ...exam, participantCount: 0, avgScore: null, predikatDistribution: {} });
        }
      }
      setExams(examsWithResults);
    } catch {
      addToast('error', 'Gagal memuat data hasil');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const completedExams = exams.filter(e => e.status === 'completed');
  const totalParticipants = exams.reduce((sum, e) => sum + e.participantCount, 0);
  const overallAvg = exams.filter(e => e.avgScore != null).reduce((sum, e, _, arr) => sum + (e.avgScore ?? 0) / arr.length, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Hasil Ujian MSAT</h1>
            <p className="text-sm text-gray-500">Rekap hasil semua ujian adaptif</p>
          </div>
        </div>
        <button onClick={fetchExams}
          className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-xs hover:bg-stone-50">
          <RefreshCw size={12} /> Refresh
        </button>
      </motion.div>

      {/* Summary Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
          <Trophy size={18} className="mb-2 text-amber-500" />
          <p className="font-display text-2xl font-black text-gray-900">{completedExams.length}</p>
          <p className="text-xs font-semibold text-gray-500">Ujian Selesai</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
          <Users size={18} className="mb-2 text-blue-500" />
          <p className="font-display text-2xl font-black text-gray-900">{totalParticipants}</p>
          <p className="text-xs font-semibold text-gray-500">Total Peserta</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100">
          <BarChart3 size={18} className="mb-2 text-emerald-500" />
          <p className="font-display text-2xl font-black text-gray-900">{overallAvg > 0 ? overallAvg.toFixed(1) : '—'}</p>
          <p className="text-xs font-semibold text-gray-500">Rata-rata Skor</p>
        </div>
      </motion.div>

      {/* Exams with Results */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3.5 text-left font-medium">Ujian</th>
                <th className="px-3 py-3.5 text-left font-medium">Status</th>
                <th className="px-3 py-3.5 text-left font-medium">Peserta</th>
                <th className="px-3 py-3.5 text-left font-medium">Rata-rata</th>
                <th className="px-3 py-3.5 text-left font-medium">Distribusi Predikat</th>
                <th className="px-3 py-3.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {exams.map((exam, i) => (
                <motion.tr key={exam.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-gray-900">{exam.title}</p>
                    <code className="font-mono text-[10px] text-indigo-600">{exam.examCode}</code>
                  </td>
                  <td className="px-3 py-3.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      exam.status === 'completed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-50 text-blue-700'
                    }`}>{exam.status === 'completed' ? 'Selesai' : 'Berlangsung'}</span>
                  </td>
                  <td className="px-3 py-3.5 font-bold text-gray-900">{exam.participantCount}</td>
                  <td className="px-3 py-3.5">
                    <span className="font-bold text-gray-900">{exam.avgScore != null ? exam.avgScore.toFixed(1) : '—'}</span>
                  </td>
                  <td className="px-3 py-3.5">
                    <div className="flex gap-1">
                      {Object.entries(exam.predikatDistribution).map(([pred, count]) => (
                        <span key={pred} className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${PREDIKAT_COLORS[pred as MASTPredikat] ?? 'bg-stone-100 text-stone-500'}`}>
                          {pred}: {count}
                        </span>
                      ))}
                      {Object.keys(exam.predikatDistribution).length === 0 && (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <Link href={`/msat/exams/${exam.id}/results`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
                      Detail <ChevronRight size={12} />
                    </Link>
                  </td>
                </motion.tr>
              ))}
              {exams.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <BarChart3 size={32} className="mx-auto mb-3 text-stone-300" />
                    <p className="text-sm font-semibold text-gray-400">Belum ada hasil ujian</p>
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

export default MSATResultsPage;
