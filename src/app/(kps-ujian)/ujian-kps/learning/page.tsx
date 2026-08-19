'use client';

import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Target,
  Loader2,
  Lightbulb,
  FlaskConical,
} from 'lucide-react';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

interface LearningData {
  weakCompetencies: Array<{ indicator: string; label: string; score: number; level: string }>;
  recommendations: Array<{ type: string; title: string; description: string; priority: string }>;
  suggestedMaterials: Array<{ title: string; topic: string; url: string }>;
}

const KPSLearningPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<LearningData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchLearning = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/kps/learning', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchLearning();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <motion.div {...fade(0)}>
        <h1 className="font-display text-2xl font-extrabold text-stone-800">Rekomendasi Belajar</h1>
        <p className="mt-1 text-sm text-stone-400">Tingkatkan kompetensi berdasarkan hasil ujian terakhir</p>
      </motion.div>

      {/* Weak Competencies */}
      {data.weakCompetencies.length > 0 && (
        <motion.div {...fade(0.05)}>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                <AlertTriangle size={14} className="text-amber-600" />
              </div>
              <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Kompetensi Lemah</h3>
            </div>
            <div className="space-y-3">
              {data.weakCompetencies.map((comp) => (
                <div key={comp.indicator} className="flex items-center justify-between rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
                  <div>
                    <p className="text-sm font-bold text-stone-700">{comp.label}</p>
                    <p className="text-xs text-amber-600">{comp.level}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-24 overflow-hidden rounded-full bg-amber-100">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${comp.score}%` }} />
                    </div>
                    <span className="font-display text-sm font-extrabold text-amber-700">{comp.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div {...fade(0.1)}>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
              <Lightbulb size={14} className="text-violet-600" />
            </div>
            <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Rekomendasi</h3>
          </div>
          <div className="space-y-3">
            {data.recommendations.map((rec, idx) => (
              <div key={idx} className="rounded-2xl bg-stone-50 p-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${
                    rec.priority === 'high' ? 'bg-red-100' : rec.priority === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <Target size={12} className={
                      rec.priority === 'high' ? 'text-red-600' : rec.priority === 'medium' ? 'text-amber-600' : 'text-blue-600'
                    } />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-700">{rec.title}</p>
                    <p className="mt-0.5 text-xs text-stone-400">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Suggested Materials */}
      <motion.div {...fade(0.15)}>
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
              <BookOpen size={14} className="text-blue-600" />
            </div>
            <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">Materi yang Disarankan</h3>
          </div>
          <div className="space-y-2.5">
            {data.suggestedMaterials.map((mat, idx) => (
              <button
                key={idx}
                onClick={() => router.push(mat.url)}
                className="flex w-full items-center justify-between rounded-2xl p-4 text-left transition-all hover:bg-stone-50 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
                    <FlaskConical size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-700">{mat.title}</p>
                    <p className="text-xs text-stone-400">{mat.topic}</p>
                  </div>
                </div>
                <ArrowRight size={14} className="text-stone-300" />
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default KPSLearningPage;
