'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, BarChart3, Trophy, Users, Target,
  ChevronDown, ChevronRight, Brain, BookOpen, Lightbulb,
  TrendingUp, Award, CheckCircle2, XCircle, Download,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface StageResponse {
  stageNumber: number;
  stageDifficulty: string;
  knowingCorrect: number;
  applyingCorrect: number;
  reasoningCorrect: number;
  totalCorrect: number;
  passed: boolean;
  weightedScore: number;
}

interface Conclusions {
  overall: { score: number; predikat: string; description: string };
  knowing: { score: number; level: string; description: string };
  applying: { score: number; level: string; description: string };
  reasoning: { score: number; level: string; description: string };
}

interface SessionDetail {
  id: string;
  studentName: string;
  finalScore: number | null;
  predikat: string | null;
  peringkat: number | null;
  stagePath: string[];
  stageResponses: StageResponse[];
  conclusions: Conclusions | null;
  status: string;
  completedAt: { _seconds: number } | null;
}

interface ExamResult {
  examId: string;
  examTitle: string;
  examCode: string;
  sessions: SessionDetail[];
}

const PREDIKAT_COLORS: Record<string, { text: string; bg: string; ring: string }> = {
  Istimewa: { text: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-200' },
  Unggul: { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  Madya: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' },
  Semenjana: { text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200' },
  Terbatas: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200' },
};

const DIFF_LABELS: Record<string, string> = { rendah: 'Rendah', medium: 'Medium', tinggi: 'Tinggi' };
const DIFF_COLORS: Record<string, string> = { rendah: 'text-emerald-600 bg-emerald-50', medium: 'text-amber-600 bg-amber-50', tinggi: 'text-violet-600 bg-violet-50' };

const DOMAIN_CONFIG = {
  knowing: { icon: BookOpen, label: 'Knowing', color: 'text-blue-600', bg: 'bg-blue-50', barColor: 'bg-blue-500' },
  applying: { icon: Target, label: 'Applying', color: 'text-violet-600', bg: 'bg-violet-50', barColor: 'bg-violet-500' },
  reasoning: { icon: Lightbulb, label: 'Reasoning', color: 'text-pink-600', bg: 'bg-pink-50', barColor: 'bg-pink-500' },
};

function getScoreColor(score: number): string {
  if (score >= 75) return 'text-emerald-600';
  if (score >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

function getLevelBadge(level: string): { text: string; color: string; bg: string } {
  if (level === 'Tinggi') return { text: 'Tinggi', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' };
  if (level === 'Sedang') return { text: 'Sedang', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' };
  return { text: 'Rendah', color: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' };
}

const MsatResultsPage: FC = () => {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const examsRes = await fetch('/api/admin/msat', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!examsRes.ok) { setLoading(false); return; }
      const examsData = await examsRes.json();
      const exams = examsData.exams ?? [];

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
              stageResponses: (s.stageResponses as StageResponse[]) ?? [],
              conclusions: s.conclusions as Conclusions | null,
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
              const colors = PREDIKAT_COLORS[p];
              return (
                <div key={p} className={`flex-1 rounded-xl p-3 text-center ring-1 ${colors?.ring ?? 'ring-stone-200'} ${colors?.bg ?? 'bg-stone-50'}`}>
                  <p className={`font-display text-lg font-black ${colors?.text ?? 'text-stone-700'}`}>{count}</p>
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
              {examResult.sessions.map(s => {
                const isExpanded = expandedId === s.id;
                const predColors = PREDIKAT_COLORS[s.predikat ?? ''] ?? { text: 'text-stone-600', bg: 'bg-stone-50', ring: 'ring-stone-200' };

                return (
                  <div key={s.id}>
                    {/* Row header — clickable */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-stone-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
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
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${predColors.bg} ${predColors.text} ${predColors.ring}`}>
                          {s.predikat}
                        </span>
                      )}
                      <ChevronDown size={14} className={`shrink-0 text-stone-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-stone-100 bg-stone-50/50 px-5 py-4 space-y-4">
                            {/* Score + Predikat */}
                            <div className="flex items-center gap-4">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md">
                                <span className="font-display text-xl font-black text-white">{s.finalScore}</span>
                              </div>
                              <div>
                                <p className={`text-base font-bold ${predColors.text}`}>{s.predikat}</p>
                                <p className="text-[11px] text-stone-400">Peringkat {s.peringkat}</p>
                              </div>
                            </div>

                            {/* Stage Detail */}
                            <div>
                              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Detail Per Stage</h4>
                              <div className="grid gap-2 sm:grid-cols-3">
                                {s.stageResponses.map((sr, j) => (
                                  <div key={j} className="rounded-xl bg-white p-3 ring-1 ring-stone-100">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-stone-400">Stage {sr.stageNumber}</span>
                                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF_COLORS[sr.stageDifficulty] ?? 'bg-stone-100 text-stone-600'}`}>
                                        {DIFF_LABELS[sr.stageDifficulty] ?? sr.stageDifficulty}
                                      </span>
                                    </div>
                                    <div className="mb-1 flex items-center gap-2">
                                      <span className="text-lg font-black text-stone-700">{sr.totalCorrect}/12</span>
                                      {sr.passed
                                        ? <CheckCircle2 size={14} className="text-emerald-500" />
                                        : <XCircle size={14} className="text-amber-400" />
                                      }
                                    </div>
                                    <div className="flex gap-2 text-[10px] text-stone-400">
                                      <span>K:{sr.knowingCorrect}</span>
                                      <span>A:{sr.applyingCorrect}</span>
                                      <span>R:{sr.reasoningCorrect}</span>
                                    </div>
                                    <p className="mt-1 text-[10px] text-stone-300">Bobot: {sr.weightedScore.toFixed(1)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Kriteria Predikat */}
                            <div>
                              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Kriteria Predikat</h4>
                              <div className="rounded-xl bg-white p-4 ring-1 ring-stone-100">
                                <div className="mb-3 flex items-center gap-3">
                                  {s.stageResponses.map((sr, j) => (
                                    <div key={j} className="flex items-center gap-1.5">
                                      <span className="text-[10px] font-semibold text-stone-500">S{j + 1}:</span>
                                      {sr.passed
                                        ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">Lulus</span>
                                        : <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-700 ring-1 ring-rose-200">Tidak Lulus</span>
                                      }
                                    </div>
                                  ))}
                                  <span className="text-[10px] text-stone-400">→</span>
                                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${PREDIKAT_COLORS[s.predikat ?? '']?.bg ?? 'bg-stone-50'} ${PREDIKAT_COLORS[s.predikat ?? '']?.text ?? 'text-stone-600'} ${PREDIKAT_COLORS[s.predikat ?? '']?.ring ?? 'ring-stone-200'}`}>
                                    {s.predikat}
                                  </span>
                                </div>
                                <div className="space-y-1 text-[10px] text-stone-500">
                                  <p><span className="font-bold text-violet-700">Istimewa:</span> Lulus semua 3 stage</p>
                                  <p><span className="font-bold text-blue-700">Unggul:</span> Lulus S1 & S2, atau S1 & S3</p>
                                  <p><span className="font-bold text-amber-700">Madya:</span> Hanya lulus S1, atau lulus S2 & S3</p>
                                  <p><span className="font-bold text-orange-700">Semenjana:</span> Hanya lulus S2 atau hanya lulus S3</p>
                                  <p><span className="font-bold text-rose-700">Terbatas:</span> Tidak lulus semua stage</p>
                                </div>
                                <p className="mt-2 text-[9px] text-stone-400">Lulus = minimal 8/12 benar (≥60%) per stage</p>
                              </div>
                            </div>

                            {/* Cognitive Sub-scores */}
                            {s.conclusions && (
                              <div>
                                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Profil Kognitif</h4>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  {(['knowing', 'applying', 'reasoning'] as const).map(domain => {
                                    const data = s.conclusions![domain];
                                    const cfg = DOMAIN_CONFIG[domain];
                                    const Icon = cfg.icon;
                                    const levelBadge = getLevelBadge(data.level);
                                    return (
                                      <div key={domain} className="rounded-xl bg-white p-3 ring-1 ring-stone-100">
                                        <div className="mb-2 flex items-center gap-1.5">
                                          <Icon size={12} className={cfg.color} />
                                          <span className="text-[10px] font-bold text-stone-500">{cfg.label}</span>
                                          <span className={`ml-auto rounded px-1 py-0.5 text-[9px] font-bold ring-1 ${levelBadge.bg} ${levelBadge.color}`}>{levelBadge.text}</span>
                                        </div>
                                        <p className={`text-lg font-black ${getScoreColor(data.score)}`}>{data.score}%</p>
                                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                                          <div className={`h-full rounded-full ${cfg.barColor}`} style={{ width: `${data.score}%` }} />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Simpulan */}
                            {s.conclusions && (
                              <div>
                                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Simpulan</h4>
                                <div className="space-y-2">
                                  {/* Overall */}
                                  <div className={`rounded-xl p-3 ring-1 ${predColors.ring} ${predColors.bg}`}>
                                    <p className={`text-[10px] font-bold ${predColors.text} mb-1`}>Keseluruhan — {s.conclusions.overall.predikat}</p>
                                    <p className="text-[12px] leading-relaxed text-stone-600">{s.conclusions.overall.description}</p>
                                  </div>
                                  {/* Per domain */}
                                  {(['knowing', 'applying', 'reasoning'] as const).map(domain => {
                                    const data = s.conclusions![domain];
                                    const cfg = DOMAIN_CONFIG[domain];
                                    return (
                                      <div key={domain} className="rounded-xl bg-white p-3 ring-1 ring-stone-100">
                                        <p className={`text-[10px] font-bold ${cfg.color} mb-1`}>{cfg.label} — {data.level} ({data.score}%)</p>
                                        <p className="text-[12px] leading-relaxed text-stone-600">{data.description}</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
};

export default MsatResultsPage;
