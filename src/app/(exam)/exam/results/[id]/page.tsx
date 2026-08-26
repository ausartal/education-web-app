'use client';

import { FC, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Trophy, Target, Brain, BookOpen, Lightbulb, TrendingUp,
  Loader2, ChevronRight, ArrowLeft, CheckCircle2, XCircle,
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
const DOMAIN_ICONS = { knowing: BookOpen, applying: Target, reasoning: Lightbulb };
const DOMAIN_COLORS = {
  knowing: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
  applying: { bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
  reasoning: { bg: 'bg-pink-50', text: 'text-pink-600', ring: 'ring-pink-100' },
};

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

        // First try to get from session
        const sessionRes = await fetch(`/api/msat/sessions/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!sessionRes.ok) { router.push('/exam'); return; }
        const sessionData = await sessionRes.json();

        if (sessionData.status !== 'completed') {
          // Not done yet — redirect appropriately
          if (sessionData.status === 'on_break') router.push(`/exam/break/${id}`);
          else router.push(`/exam/session/${id}`);
          return;
        }

        // Call complete API to get/calculate results
        const completeRes = await fetch(`/api/msat/sessions/${id}/complete`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (completeRes.ok) {
          setResults(await completeRes.json());
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, [user, id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF]">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
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

        {/* Score Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] p-8 text-center text-white shadow-xl shadow-violet-200/40`}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Trophy size={28} />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="font-display text-5xl font-black">{results.finalScore}</motion.p>
          <p className="mt-1 text-sm text-white/70">Skor Akhir</p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 backdrop-blur-sm">
            <span className="text-sm font-bold">{results.predikat}</span>
            <span className="text-xs text-white/70">Peringkat {results.peringkat}</span>
          </div>
        </motion.div>

        {/* Stage Path */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-6 rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Jalur Stage</h3>
          <div className="flex items-center gap-2">
            {results.stagePath.map((diff, i) => {
              const sr = results.stageResponses[i];
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="rounded-xl bg-stone-50 px-3 py-2 text-center ring-1 ring-stone-100">
                    <p className="text-[10px] text-stone-400">Stage {i + 1}</p>
                    <p className="text-sm font-bold text-stone-700">{DIFF_LABELS[diff] ?? diff}</p>
                    {sr && <p className="text-[10px] text-stone-400">{sr.totalCorrect}/12</p>}
                  </div>
                  {i < results.stagePath.length - 1 && <ChevronRight size={14} className="text-stone-300" />}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 4 Conclusions */}
        <div className="space-y-3">
          {/* Overall */}
          {conclusions?.overall && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`rounded-2xl bg-white p-5 ring-1 ${predColors.ring}`}>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp size={16} className={predColors.text} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Simpulan Keseluruhan</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-xl px-3 py-1.5 text-lg font-black ${predColors.bg} ${predColors.text}`}>
                  {conclusions.overall.score}%
                </span>
                <span className={`text-sm font-bold ${predColors.text}`}>{conclusions.overall.predikat}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{conclusions.overall.description}</p>
            </motion.div>
          )}

          {/* Knowing, Applying, Reasoning */}
          {(['knowing', 'applying', 'reasoning'] as const).map((domain, i) => {
            const data = conclusions?.[domain];
            if (!data) return null;
            const Icon = DOMAIN_ICONS[domain];
            const colors = DOMAIN_COLORS[domain];
            const levelColor = data.score >= 75 ? 'text-emerald-600' : data.score >= 50 ? 'text-amber-600' : 'text-rose-600';

            return (
              <motion.div
                key={domain}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                className={`rounded-2xl bg-white p-5 ring-1 ${colors.ring}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={16} className={colors.text} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400">Simpulan {domain.charAt(0).toUpperCase() + domain.slice(1)}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-xl px-3 py-1.5 text-lg font-black ${colors.bg} ${colors.text}`}>
                    {data.score}%
                  </span>
                  <span className={`text-sm font-bold ${levelColor}`}>{data.level}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{data.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Stage Detail */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Detail Per Stage</h3>
          <div className="space-y-2">
            {results.stageResponses.map((sr, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-stone-50 px-4 py-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-600">{sr.stageNumber}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-700">{DIFF_LABELS[sr.stageDifficulty] ?? sr.stageDifficulty}</span>
                    <span className="text-[10px] text-stone-400">·</span>
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
        <div className="mt-8 flex justify-center">
          <Link href="/exam" className="flex items-center gap-2 rounded-2xl bg-[#5841EA] px-8 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Selesai <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ExamResultsPage;
