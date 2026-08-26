'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Loader2, BarChart3, Trophy, Users, Target,
  Download, ChevronRight, Brain,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ExamResult {
  examId: string;
  examTitle: string;
  examCode: string;
  sessions: {
    id: string;
    studentName: string;
    finalScore: number | null;
    predikat: string | null;
    peringkat: number | null;
    stagePath: string[];
    status: string;
    completedAt: { _seconds: number } | null;
  }[];
}

const PREDIKAT_COLORS: Record<string, string> = {
  Istimewa: 'bg-violet-50 text-violet-700',
  Unggul: 'bg-blue-50 text-blue-700',
  Madya: 'bg-amber-50 text-amber-700',
  Semenjana: 'bg-orange-50 text-orange-700',
  Terbatas: 'bg-rose-50 text-rose-700',
};

const DIFF_LABELS: Record<string, string> = { rendah: 'R', medium: 'M', tinggi: 'T' };

const MsatResultsPage: FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();

      // Get all exams
      const examsRes = await fetch('/api/admin/msat', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!examsRes.ok) { setLoading(false); return; }
      const examsData = await examsRes.json();
      const exams = examsData.exams ?? [];

      // Get sessions for each exam
      const allResults: ExamResult[] = [];
      for (const exam of exams) {
        const detailRes = await fetch(`/api/admin/msat/${exam.id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (detailRes.ok) {
          const detailData = await detailRes.json();
          const completedSessions = (detailData.sessions ?? [])
            .filter((s: { status: string }) => s.status === 'completed')
            .map((s: Record<string, unknown>) => ({
              id: s.id as string,
              studentName: (s.studentName as string) ?? 'Siswa',
              finalScore: s.finalScore as number | null,
              predikat: s.predikat as string | null,
              peringkat: s.peringkat as number | null,
              stagePath: (s.stagePath as string[]) ?? [],
              status: s.status as string,
              completedAt: s.completedAt as { _seconds: number } | null,
            }));

          if (completedSessions.length > 0) {
            allResults.push({
              examId: exam.id,
              examTitle: exam.title,
              examCode: exam.code,
              sessions: completedSessions,
            });
          }
        }
      }
      setResults(allResults);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={24} className="animate-spin text-violet-500" /></div>;
  }

  const allSessions = results.flatMap(r => r.sessions);
  const avgScore = allSessions.length > 0
    ? Math.round(allSessions.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) / allSessions.length)
    : 0;
  const predikatCounts: Record<string, number> = {};
  allSessions.forEach(s => {
    if (s.predikat) predikatCounts[s.predikat] = (predikatCounts[s.predikat] ?? 0) + 1;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/msat" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-xl font-extrabold text-stone-800">Hasil Ujian MSAT</h1>
            <p className="text-xs text-stone-400">{allSessions.length} siswa telah menyelesaikan ujian</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Selesai', value: allSessions.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Rata-rata Skor', value: avgScore, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Istimewa', value: predikatCounts['Istimewa'] ?? 0, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Unggul+', value: (predikatCounts['Istimewa'] ?? 0) + (predikatCounts['Unggul'] ?? 0), icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="rounded-2xl bg-white p-4 ring-1 ring-stone-100">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.bg}`}><Icon size={14} className={s.color} /></div>
              <p className="mt-2 font-display text-xl font-black text-stone-800">{s.value}</p>
              <p className="text-[10px] text-stone-400">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Predikat Distribution */}
      {allSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Distribusi Predikat</h3>
          <div className="flex gap-2">
            {['Istimewa', 'Unggul', 'Madya', 'Semenjana', 'Terbatas'].map(p => {
              const count = predikatCounts[p] ?? 0;
              const pct = allSessions.length > 0 ? Math.round((count / allSessions.length) * 100) : 0;
              return (
                <div key={p} className="flex-1 rounded-xl bg-stone-50 p-3 text-center ring-1 ring-stone-100">
                  <p className="font-display text-lg font-black text-stone-700">{count}</p>
                  <p className="text-[10px] font-semibold text-stone-500">{p}</p>
                  <p className="text-[10px] text-stone-400">{pct}%</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Results per exam */}
      {results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 ring-1 ring-stone-100">
          <BarChart3 size={24} className="text-stone-300" />
          <p className="mt-2 text-sm font-semibold text-stone-500">Belum ada hasil</p>
          <p className="mt-1 text-xs text-stone-400">Hasil akan muncul setelah siswa menyelesaikan ujian</p>
        </div>
      ) : (
        results.map((examResult, i) => (
          <motion.div key={examResult.examId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="rounded-2xl bg-white ring-1 ring-stone-100">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Brain size={14} className="text-violet-500" />
                <h3 className="text-sm font-bold text-stone-700">{examResult.examTitle}</h3>
                <span className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-stone-500">{examResult.examCode}</span>
              </div>
              <span className="text-[11px] text-stone-400">{examResult.sessions.length} siswa</span>
            </div>
            <div className="divide-y divide-stone-50">
              {examResult.sessions.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                    {s.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-stone-700">{s.studentName}</p>
                    <p className="text-[10px] text-stone-400">
                      {s.stagePath.map(d => DIFF_LABELS[d] ?? d).join(' → ')}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-stone-700">{s.finalScore ?? '-'}</span>
                  {s.predikat && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PREDIKAT_COLORS[s.predikat] ?? 'bg-stone-50 text-stone-600'}`}>
                      {s.predikat}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default MsatResultsPage;
