'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Trophy, ChevronDown, BarChart3, BookOpen, Target,
  Lightbulb, CheckCircle2, XCircle, Award, TrendingUp, Brain,
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

interface ExamHistory {
  sessionId: string;
  examTitle: string;
  examCode: string;
  finalScore: number | null;
  predikat: string | null;
  peringkat: number | null;
  stagePath: string[];
  stageResponses: StageResponse[];
  conclusions: Conclusions | null;
  completedAt: { _seconds: number } | null;
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
  knowing: { icon: BookOpen, label: 'Pemahaman Konsep', sublabel: 'Knowing', color: 'text-blue-600', bg: 'bg-blue-50', barColor: 'bg-blue-500' },
  applying: { icon: Target, label: 'Penerapan Konsep', sublabel: 'Applying', color: 'text-violet-600', bg: 'bg-violet-50', barColor: 'bg-violet-500' },
  reasoning: { icon: Lightbulb, label: 'Penalaran Konsep', sublabel: 'Reasoning', color: 'text-pink-600', bg: 'bg-pink-50', barColor: 'bg-pink-500' },
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

const ExamHistoryPage: FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<ExamHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/msat/history', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={24} className="animate-spin text-violet-500" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-extrabold text-[#0E1E47]">Hasil Ujian</h1>
        <p className="mt-1 text-sm text-gray-400">Riwayat dan detail hasil ujian MSAT kamu</p>
      </div>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 ring-1 ring-gray-100">
          <BarChart3 size={28} className="text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-500">Belum ada hasil ujian</p>
          <p className="mt-1 text-xs text-gray-400">Hasil akan muncul setelah kamu menyelesaikan ujian</p>
          <Link href="/exam" className="mt-4 rounded-xl bg-[#5841EA] px-5 py-2 text-xs font-semibold text-white">
            Masuk Ujian
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((exam, i) => {
            const predColors = PREDIKAT_COLORS[exam.predikat ?? ''] ?? { text: 'text-stone-600', bg: 'bg-stone-50', ring: 'ring-stone-200' };
            const isExpanded = expandedId === exam.sessionId;
            const completedDate = exam.completedAt?._seconds
              ? new Date(exam.completedAt._seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : '-';

            return (
              <motion.div
                key={exam.sessionId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100"
              >
                {/* Header — clickable */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : exam.sessionId)}
                  className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-gray-50"
                >
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] shadow-md`}>
                    <span className="font-display text-lg font-black text-white">{exam.finalScore ?? '-'}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#0E1E47]">{exam.examTitle}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-400">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono font-bold text-gray-500">{exam.examCode}</span>
                      <span>{completedDate}</span>
                    </p>
                  </div>
                  {exam.predikat && (
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${predColors.bg} ${predColors.text} ${predColors.ring}`}>
                      {exam.predikat}
                    </span>
                  )}
                  <ChevronDown size={16} className={`shrink-0 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
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
                      <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-5 space-y-5">
                        {/* Score + Predikat */}
                        <div className="flex items-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] shadow-lg">
                            <span className="font-display text-2xl font-black text-white">{exam.finalScore}</span>
                          </div>
                          <div>
                            <p className={`text-lg font-bold ${predColors.text}`}>{exam.predikat}</p>
                            <p className="text-xs text-gray-400">Peringkat {exam.peringkat} · Skor Akhir</p>
                          </div>
                        </div>

                        {/* Jalur Stage */}
                        <div>
                          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Jalur Stage</h4>
                          <div className="flex items-center gap-2">
                            {exam.stagePath.map((diff, j) => {
                              const sr = exam.stageResponses[j];
                              return (
                                <div key={j} className="flex items-center gap-2">
                                  <div className="flex-1 rounded-xl bg-white p-3 text-center ring-1 ring-gray-100">
                                    <p className="text-[10px] font-semibold text-gray-400">Stage {j + 1}</p>
                                    <p className={`text-xs font-bold ${DIFF_COLORS[diff]?.split(' ')[0] ?? 'text-gray-600'}`}>
                                      {DIFF_LABELS[diff] ?? diff}
                                    </p>
                                    {sr && (
                                      <div className="mt-1 flex items-center justify-center gap-1">
                                        <span className="text-sm font-black text-gray-700">{sr.totalCorrect}/12</span>
                                        {sr.passed
                                          ? <CheckCircle2 size={12} className="text-emerald-500" />
                                          : <XCircle size={12} className="text-amber-400" />
                                        }
                                      </div>
                                    )}
                                  </div>
                                  {j < exam.stagePath.length - 1 && <span className="text-gray-300">→</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Detail Per Stage */}
                        <div>
                          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Detail Per Stage</h4>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {exam.stageResponses.map((sr, j) => (
                              <div key={j} className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400">Stage {sr.stageNumber}</span>
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF_COLORS[sr.stageDifficulty] ?? 'bg-gray-100 text-gray-600'}`}>
                                    {DIFF_LABELS[sr.stageDifficulty] ?? sr.stageDifficulty}
                                  </span>
                                </div>
                                <p className="text-lg font-black text-gray-700">{sr.totalCorrect}/12</p>
                                <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
                                  <span>K:{sr.knowingCorrect}</span>
                                  <span>A:{sr.applyingCorrect}</span>
                                  <span>R:{sr.reasoningCorrect}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Profil Kognitif */}
                        {exam.conclusions && (
                          <div>
                            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Profil Kognitif</h4>
                            <div className="grid gap-2 sm:grid-cols-3">
                              {(['knowing', 'applying', 'reasoning'] as const).map(domain => {
                                const data = exam.conclusions![domain];
                                const cfg = DOMAIN_CONFIG[domain];
                                const Icon = cfg.icon;
                                const levelBadge = getLevelBadge(data.level);
                                return (
                                  <div key={domain} className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
                                    <div className="mb-2 flex items-center gap-1.5">
                                      <Icon size={12} className={cfg.color} />
                                      <span className="text-[10px] font-bold text-gray-500">{cfg.sublabel}</span>
                                      <span className={`ml-auto rounded px-1 py-0.5 text-[9px] font-bold ring-1 ${levelBadge.bg} ${levelBadge.color}`}>{levelBadge.text}</span>
                                    </div>
                                    <p className={`text-lg font-black ${getScoreColor(data.score)}`}>{data.score}%</p>
                                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                      <div className={`h-full rounded-full ${cfg.barColor}`} style={{ width: `${data.score}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Simpulan */}
                        {exam.conclusions && (
                          <div>
                            <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">Simpulan</h4>
                            <div className="space-y-2">
                              <div className={`rounded-xl p-4 ring-1 ${predColors.ring} ${predColors.bg}`}>
                                <div className="mb-1 flex items-center gap-2">
                                  <TrendingUp size={14} className={predColors.text} />
                                  <p className={`text-xs font-bold ${predColors.text}`}>Keseluruhan — {exam.conclusions.overall.predikat}</p>
                                </div>
                                <p className="text-[13px] leading-relaxed text-gray-600">{exam.conclusions.overall.description}</p>
                              </div>
                              {(['knowing', 'applying', 'reasoning'] as const).map(domain => {
                                const data = exam.conclusions![domain];
                                const cfg = DOMAIN_CONFIG[domain];
                                const Icon = cfg.icon;
                                return (
                                  <div key={domain} className="rounded-xl bg-white p-4 ring-1 ring-gray-100">
                                    <div className="mb-1 flex items-center gap-2">
                                      <Icon size={14} className={cfg.color} />
                                      <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label} — {data.level} ({data.score}%)</p>
                                    </div>
                                    <p className="text-[13px] leading-relaxed text-gray-600">{data.description}</p>
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
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamHistoryPage;
