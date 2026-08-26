'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Coffee, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const ExamBreakPage: FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    const init = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/msat/sessions/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (!res.ok) { router.push('/exam'); return; }
        const data = await res.json();

        if (data.status === 'completed') { router.push(`/exam/results/${id}`); return; }
        if (data.status === 'in_progress') { router.push(`/exam/session/${id}`); return; }

        if (data.breakEndsAt) {
          const endsAt = data.breakEndsAt * 1000;
          const remaining = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
          setTimeLeft(remaining);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    init();
  }, [user, id, router]);

  // Countdown
  useEffect(() => {
    if (loading || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timer);
          router.push(`/exam/session/${id}`);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, timeLeft, id, router]);

  // Poll for admin skip
  useEffect(() => {
    if (loading) return;
    pollRef.current = setInterval(async () => {
      try {
        if (!user) return;
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/msat/sessions/${id}`, {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'in_progress') {
            clearInterval(pollRef.current!);
            router.push(`/exam/session/${id}`);
          }
        }
      } catch { /* ignore */ }
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loading, user, id, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF]">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const pct = timeLeft > 0 ? timeLeft / 600 : 0;

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-sm">
        {/* Icon */}
        <div className="mb-6 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }} className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/50">
            <Coffee size={28} className="text-white" />
          </motion.div>
          <h1 className="font-display text-2xl font-extrabold text-[#0E1E47]">Istirahat</h1>
          <p className="mt-1.5 text-sm text-gray-400">Saatnya meregangkan pikiran sejenak</p>
        </div>

        {/* Timer card */}
        <div className="relative mb-6">
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-amber-200/40 via-transparent to-orange-200/40 blur-sm" />
          <div className="relative rounded-3xl bg-white/90 p-8 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.04] backdrop-blur-xl">
            {/* Circular timer */}
            <div className="mb-6 flex flex-col items-center">
              <div className="relative mb-2">
                <svg className="h-36 w-36 -rotate-90">
                  <circle cx="72" cy="72" r="60" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                  <motion.circle
                    cx="72" cy="72" r="60" fill="none" stroke="#f59e0b" strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 60}
                    animate={{ strokeDashoffset: 2 * Math.PI * 60 * (1 - pct) }}
                    transition={{ duration: 0.5 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-4xl font-black tabular-nums text-[#0E1E47]">
                    {mins}:{secs.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-400">menit tersisa</p>
            </div>

            {/* Tips */}
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-300">Tips Istirahat</p>
              <ul className="space-y-1 text-xs text-gray-400">
                <li>Minum air dan tarik napas dalam-dalam</li>
                <li>Rilekskan mata sejenak dari layar</li>
                <li>Stage berikutnya akan dimulai otomatis</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExamBreakPage;
