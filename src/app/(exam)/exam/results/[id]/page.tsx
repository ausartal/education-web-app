'use client';

import { FC, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy, Target, Brain, BookOpen, Lightbulb, TrendingUp,
  Loader2, ChevronRight, ArrowLeft, CheckCircle2, XCircle, Award, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import type { MSATConclusions, MSATStageResponse } from '@/types/msat';
import { PREDIKAT_COLORS, type PredikatName } from '@/types/msat';

interface ResultsData {
  finalScore: number;
  predikat: string;
  peringkat: number;
  stagePath: string[];
  conclusions: MSATConclusions;
  stageResponses: MSATStageResponse[];
  anomalyFlags: string[];
}

const DIFF_LABELS: Record<string, string> = { rendah: 'Rendah', medium: 'Medium', tinggi: 'Tinggi' };
const DIFF_COLORS: Record<string, string> = { rendah: 'text-emerald-600 bg-emerald-50', medium: 'text-amber-600 bg-amber-50', tinggi: 'text-violet-600 bg-violet-50' };

const DOMAIN_CONFIG = {
  knowing: { icon: BookOpen, label: 'Pemahaman Konsep', sublabel: 'Knowing', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100', barColor: 'bg-blue-500' },
  applying: { icon: Target, label: 'Penerapan Konsep', sublabel: 'Applying', color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100', barColor: 'bg-violet-500' },
  reasoning: { icon: Lightbulb, label: 'Penalaran Konsep', sublabel: 'Reasoning', color: 'text-pink-600', bg: 'bg-pink-50', ring: 'ring-pink-100', barColor: 'bg-pink-500' },
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

const ExamResultsPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [results, setResults] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const idToken = await user.getIdToken();
        const sessionRes = await fetch(`/api/msat/sessions/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!sessionRes.ok) { router.push('/exam'); return; }
        const sessionData = await sessionRes.json();

        if (sessionData.status !== 'completed') {
          if (sessionData.status === 'on_break') router.push(`/exam/break/${id}`);
          else router.push(`/exam/session/${id}`);
          return;
        }

        const completeRes = await fetch(`/api/msat/sessions/${id}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (completeRes.ok) setResults(await completeRes.json());
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, [user, id, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF]"><Loader2 size={28} className="animate-spin text-violet-500" /></div>;
  }

  if (!results) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F8F7FF] text-center">
        <p className="text-gray-500">Hasil tidak ditemukan</p>
        <Link href="/exam" className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white">Kembali</Link>
      </div>
    );
  }

  const predikatName = (results.predikat ?? 'Terbatas') as PredikatName;
  const predColors = PREDIKAT_COLORS[predikatName] ?? PREDIKAT_COLORS.Terbatas;
  const conclusions = results.conclusions;

  return (
    <div className="min-h-screen bg-[#F8F7FF] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <Link href="/exam" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600">
          <ArrowLeft size={14} /> Kembali ke Beranda
        </Link>

        {/* ── Score Header ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] p-8 text-center text-white shadow-xl shadow-violet-200/40">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Trophy size={28} />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="font-display text-5xl font-black">{results.finalScore}</motion.p>
          <p className="mt-1 text-sm text-white/70">Skor Akhir</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 backdrop-blur-sm">
            <Award size={16} />
            <span className="text-sm font-bold">{results.predikat}</span>
            <span className="text-xs text-white/70">Peringkat {results.peringkat}</span>
          </div>
        </motion.div>

        {/* ── Simpulan 1: Keseluruhan ── */}
        {conclusions?.overall && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`mb-4 rounded-2xl bg-white p-6 ring-1 ${predColors.ring}`}>
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={16} className={predColors.text} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Simpulan 1 — Keseluruhan</h3>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <span className={`rounded-xl px-4 py-2 text-2xl font-black ${predColors.bg} ${predColors.text}`}>
                {conclusions.overall.score}%
              </span>
              <div>
                <p className={`text-base font-bold ${predColors.text}`}>{conclusions.overall.predikat}</p>
                <p className="text-[11px] text-stone-400">Peringkat {results.peringkat}</p>
              </div>
            </div>
            <p className="text-[13px] leading-relaxed text-gray-600">{conclusions.overall.description}</p>
          </motion.div>
        )}

        {/* ── Simpulan 2-4: Cognitive Domains ── */}
        <div className="mb-4 space-y-3">
          {(['knowing', 'applying', 'reasoning'] as const).map((domain, i) => {
            const data = conclusions?.[domain];
            if (!data) return null;
            const cfg = DOMAIN_CONFIG[domain];
            const Icon = cfg.icon;
            const levelBadge = getLevelBadge(data.level);

            return (
              <motion.div
                key={domain}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className={`rounded-2xl bg-white p-6 ring-1 ${cfg.ring}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${cfg.bg}`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Simpulan {i + 2} — {cfg.label}</h3>
                      <p className="text-[10px] text-stone-300">{cfg.sublabel}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${levelBadge.bg} ${levelBadge.color}`}>
                    {levelBadge.text}
                  </span>
                </div>

                {/* Score bar */}
                <div className="mb-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className={`text-2xl font-black ${getScoreColor(data.score)}`}>{data.score}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${data.score}%` }}
                      transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                      className={`h-full rounded-full ${cfg.barColor}`}
                    />
                  </div>
                </div>

                <p className="text-[13px] leading-relaxed text-gray-600">{data.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Jalur Stage ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-4 rounded-2xl bg-white p-6 ring-1 ring-stone-100">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-stone-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Jalur Stage</h3>
          </div>
          <div className="flex items-center gap-2">
            {results.stagePath.map((diff, i) => {
              const sr = results.stageResponses[i];
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 rounded-xl bg-stone-50 p-3 text-center ring-1 ring-stone-100">
                    <p className="text-[10px] font-semibold text-stone-400">Stage {i + 1}</p>
                    <p className={`text-xs font-bold ${DIFF_COLORS[diff]?.split(' ')[0] ?? 'text-stone-600'}`}>
                      {DIFF_LABELS[diff] ?? diff}
                    </p>
                    {sr && (
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="text-sm font-black text-stone-700">{sr.totalCorrect}/12</span>
                        {sr.passed
                          ? <CheckCircle2 size={12} className="text-emerald-500" />
                          : <XCircle size={12} className="text-amber-400" />
                        }
                      </div>
                    )}
                  </div>
                  {i < results.stagePath.length - 1 && (
                    <ChevronRight size={14} className="shrink-0 text-stone-300" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Kriteria Predikat ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="mb-4 rounded-2xl bg-white p-6 ring-1 ring-stone-100">
          <div className="mb-4 flex items-center gap-2">
            <Award size={16} className="text-stone-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Kriteria Predikat</h3>
          </div>

          {/* Stage status summary */}
          <div className="mb-4 flex items-center gap-3">
            {results.stageResponses.map((sr, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-stone-500">S{i + 1}:</span>
                {sr.passed
                  ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">Lulus</span>
                  : <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">Tidak Lulus</span>
                }
              </div>
            ))}
            <span className="text-xs text-stone-400">→</span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${predColors.bg} ${predColors.text} ${predColors.ring}`}>
              {results.predikat}
            </span>
          </div>

          {/* Criteria explanation */}
          <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-100">
            <p className="text-[11px] font-semibold text-stone-500 mb-2">Kriteria berdasarkan kelulusan stage:</p>
            <div className="space-y-1.5 text-[11px] text-stone-600">
              <p><span className="font-bold text-violet-700">Istimewa:</span> Lulus semua 3 stage (S1✓ S2✓ S3✓)</p>
              <p><span className="font-bold text-blue-700">Unggul:</span> Lulus stage 1 & 2, tidak lulus stage 3 (S1✓ S2✓ S3✗) atau lulus stage 1 & 3, tidak lulus stage 2 (S1✓ S2✗ S3✓)</p>
              <p><span className="font-bold text-amber-700">Madya:</span> Hanya lulus stage 1 (S1✓ S2✗ S3✗) atau lulus stage 2 & 3, tidak lulus stage 1 (S1✗ S2✓ S3✓)</p>
              <p><span className="font-bold text-orange-700">Semenjana:</span> Hanya lulus stage 2 (S1✗ S2✓ S3✗) atau hanya lulus stage 3 (S1✗ S2✗ S3✓)</p>
              <p><span className="font-bold text-rose-700">Terbatas:</span> Tidak lulus semua 3 stage (S1✗ S2✗ S3✗)</p>
            </div>
            <p className="mt-2 text-[10px] text-stone-400">Lulus = minimal 8 dari 12 soal benar (≥60%) per stage</p>
          </div>
        </motion.div>

        {/* ── Detail Per Stage ── */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8 rounded-2xl bg-white p-6 ring-1 ring-stone-100">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Detail Per Stage</h3>
          <div className="space-y-2">
            {results.stageResponses.map((sr, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600">{sr.stageNumber}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${DIFF_COLORS[sr.stageDifficulty] ?? 'bg-stone-100 text-stone-600'}`}>
                      {DIFF_LABELS[sr.stageDifficulty] ?? sr.stageDifficulty}
                    </span>
                    <span className="text-[10px] text-stone-400">K:{sr.knowingCorrect} A:{sr.applyingCorrect} R:{sr.reasoningCorrect}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-stone-700">{sr.totalCorrect}/12</span>
                {sr.passed
                  ? <CheckCircle2 size={16} className="text-emerald-500" />
                  : <XCircle size={16} className="text-amber-400" />
                }
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <div className="flex justify-center">
          <Link href="/exam" className="flex items-center gap-2 rounded-2xl bg-[#5841EA] px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Selesai <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ExamResultsPage;
