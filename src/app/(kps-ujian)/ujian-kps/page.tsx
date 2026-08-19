'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { KPS_CONFIG, KPS_INDICATOR_LABELS, KPS_INDICATOR_ORDER } from '@/types/kps';
import {
  FlaskConical,
  Clock,
  Target,
  Layers,
  ArrowRight,
  History,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const KPSLandingPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [starting, setStarting] = useState(false);
  const [checkingResume, setCheckingResume] = useState(true);
  const [existingSession, setExistingSession] = useState<{ id: string } | null>(null);

  // Check for existing in-progress session
  useEffect(() => {
    if (!user) {
      setCheckingResume(false);
      return;
    }

    const checkExisting = async () => {
      try {
        const token = await user.getIdToken();
        // We'll check via the start endpoint with empty code to see resume data
        // Actually, let's just check localStorage for now
        setCheckingResume(false);
      } catch {
        setCheckingResume(false);
      }
    };
    checkExisting();
  }, [user]);

  const handleStart = async () => {
    if (!code.trim()) {
      addToast('error', 'Masukkan kode akses terlebih dahulu');
      return;
    }

    if (!user) {
      router.push('/login');
      return;
    }

    setStarting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/kps/sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.completed) {
          router.push(`/ujian-kps/${data.sessionId}/results`);
          return;
        }
        addToast('error', data.error || 'Gagal memulai ujian');
        return;
      }

      // Store initial data and redirect
      sessionStorage.setItem(`exam_init_${data.sessionId}`, JSON.stringify(data));
      router.push(`/ujian-kps/${data.sessionId}`);
    } catch {
      addToast('error', 'Terjadi kesalahan, coba lagi');
    } finally {
      setStarting(false);
    }
  };

  const infoCards = [
    {
      icon: <Target size={24} className="text-[#5841EA]" />,
      label: 'Soal',
      value: `${KPS_CONFIG.totalQuestions}`,
      desc: 'pertanyaan',
    },
    {
      icon: <Clock size={24} className="text-[#5841EA]" />,
      label: 'Waktu',
      value: `${KPS_CONFIG.totalDurationMinutes}`,
      desc: 'menit',
    },
    {
      icon: <Layers size={24} className="text-[#5841EA]" />,
      label: 'Tahap',
      value: `${KPS_CONFIG.totalStages}`,
      desc: 'adaptif',
    },
    {
      icon: <FlaskConical size={24} className="text-[#5841EA]" />,
      label: 'Indikator',
      value: '7',
      desc: 'KPS',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f8fc]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <FlaskConical size={24} className="text-[#5841EA]" />
            <span className="text-lg font-bold text-gray-900">Ujian KPS</span>
          </div>
          <button
            onClick={() => router.push('/ujian-kps/riwayat')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-[#5841EA]"
          >
            <History size={16} />
            Riwayat
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#5841EA]/10">
            <FlaskConical size={40} className="text-[#5841EA]" />
          </div>
          <h1 className="mb-3 text-3xl font-bold text-gray-900 md:text-4xl">
            Ujian KPS
          </h1>
          <p className="mx-auto max-w-lg text-gray-500">
            Tes Penempatan Keterampilan Proses Sains untuk materi Kesetimbangan Kimia.
            Ujian ini mengukur 7 indikator KPS melalui 3 tahap adaptif.
          </p>
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {infoCards.map((card) => (
            <div
              key={card.label}
              className="rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm"
            >
              <div className="mx-auto mb-2">{card.icon}</div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500">{card.desc}</div>
            </div>
          ))}
        </motion.div>

        {/* Access Code Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-10 max-w-md"
        >
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <label className="mb-3 block text-sm font-semibold text-gray-700">
              Kode Akses Ujian
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Masukkan 6 digit kode"
              maxLength={6}
              className="mb-4 w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-gray-900 transition-all placeholder:text-gray-300 focus:border-[#5841EA] focus:outline-none focus:ring-2 focus:ring-[#5841EA]/20"
            />
            <button
              onClick={handleStart}
              disabled={starting || code.length < 6}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#5841EA] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#5841EA]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            >
              {starting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Memulai...
                </>
              ) : (
                <>
                  Mulai Ujian
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* KPS Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="mb-4 text-center text-lg font-bold text-gray-900">
            7 Indikator KPS yang Diukur
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {KPS_INDICATOR_ORDER.map((indicator, idx) => (
              <motion.div
                key={indicator}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm"
              >
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#5841EA]/10 text-sm font-bold text-[#5841EA]">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">
                  {KPS_INDICATOR_LABELS[indicator]}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Warning */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mx-auto mt-10 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <div className="flex gap-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="mb-1 font-semibold">Perhatian:</p>
              <ul className="list-inside list-disc space-y-1 text-amber-700">
                <li>Ujian bersifat strict dan tidak bisa di-pause</li>
                <li>Timer berjalan terus termasuk saat jeda antar tahap</li>
                <li>Fullscreen wajib selama ujian berlangsung</li>
                <li>Jawaban otomatis dikumpulkan saat waktu habis</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default KPSLandingPage;
