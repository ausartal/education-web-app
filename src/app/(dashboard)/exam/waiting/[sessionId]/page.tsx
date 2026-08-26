'use client';

import { FC, useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, Users, Clock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface WaitingRoomData {
  id: string;
  status: string;
  examTitle?: string;
  participantCount?: number;
  currentStage?: number;
  currentStageDifficulty?: string;
}

const WaitingPage: FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<WaitingRoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSession = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/mast/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError('Sesi tidak ditemukan');
        setLoading(false);
        return;
      }

      const sessionData = await res.json();
      setData(sessionData);
      setLoading(false);

      // If exam has started, redirect to session
      if (sessionData.status === 'in_progress') {
        if (pollRef.current) clearInterval(pollRef.current);
        router.push(`/exam/session/${sessionId}`);
      }
    } catch {
      setError('Gagal memuat data sesi');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    fetchSession();

    // Poll every 3 seconds
    pollRef.current = setInterval(fetchSession, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={32} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-gray-500">{error}</p>
        <button
          onClick={() => router.push('/exam')}
          className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {/* Waiting animation */}
        <div className="mb-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100"
          >
            <Clock size={40} className="text-violet-500" />
          </motion.div>

          <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
            Ruang Tunggu
          </h1>
          <p className="text-gray-500">
            Menunggu admin memulai ujian...
          </p>
        </div>

        {/* Info card */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm border border-stone-100">
          {data?.examTitle && (
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Ujian</p>
              <p className="text-lg font-bold text-gray-900">{data.examTitle}</p>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 rounded-xl bg-violet-50 px-4 py-3">
            <Users size={18} className="text-violet-500" />
            <span className="text-sm font-semibold text-violet-700">
              {data?.participantCount ?? 1} peserta telah bergabung
            </span>
          </div>
        </div>

        {/* Loading dots animation */}
        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
              className="h-2.5 w-2.5 rounded-full bg-violet-400"
            />
          ))}
        </div>

        <p className="mt-6 text-xs text-gray-400">
          Halaman ini akan otomatis berpindah ketika ujian dimulai
        </p>
      </motion.div>
    </div>
  );
};

export default WaitingPage;
