'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, AlertCircle, Loader2, Shield, Brain, Clock,
  Users, Zap, BookOpen, ChevronRight, ArrowLeft, Wifi, WifiOff,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

type Step = 'entry' | 'confirm' | 'waiting';

interface ScheduleInfo {
  title: string;
  durationMinutes: number;
  domainCount: number;
  sessionId?: string;
  resumed?: boolean;
  waitingRoom?: boolean;
  examType?: string;
}

const ExamPage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('entry');
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo | null>(null);
  const [online, setOnline] = useState(true);
  const [waitingCount, setWaitingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (step === 'entry') inputRef.current?.focus();
  }, [step]);

  // Poll waiting room status
  useEffect(() => {
    if (step === 'waiting' && scheduleInfo?.sessionId) {
      pollRef.current = setInterval(async () => {
        try {
          if (!user) return;
          const idToken = await user.getIdToken();
          const res = await fetch(`/api/exam-sessions/${scheduleInfo.sessionId}/status`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setWaitingCount(data.waitingCount ?? 0);
            if (data.status === 'started' || data.status === 'in_progress') {
              clearInterval(pollRef.current!);
              router.push(`/ujian/${scheduleInfo.sessionId}/session`);
            }
          }
        } catch { /* ignore */ }
      }, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [step, scheduleInfo, user, router]);

  const handleValidate = async () => {
    if (!token.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/exam-sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ examToken: token.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (res.status === 409 && data.completed) {
        router.push(`/ujian/${data.sessionId}/results`);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Token tidak valid');
        setLoading(false);
        return;
      }

      const isCustom = data.mode === 'custom' || data.mode === 'manual';
      sessionStorage.setItem(`exam_init_${data.sessionId}`, JSON.stringify({
        schedule: data.schedule,
        questions: data.questions ?? {},
        completedDomains: data.completedDomains ?? 0,
        mode: data.mode,
        customQuestions: data.customQuestions ?? [],
      }));

      if (data.resumed) {
        router.push(`/ujian/${data.sessionId}/session`);
        return;
      }

      const info: ScheduleInfo = {
        title: data.schedule.title,
        durationMinutes: data.schedule.durationMinutes,
        domainCount: isCustom
          ? (data.customQuestions?.length ?? 0)
          : (data.schedule.domainIds?.length || 0),
        sessionId: data.sessionId,
        waitingRoom: data.waitingRoom ?? false,
        examType: data.mode ?? 'tp',
      };
      setScheduleInfo(info);

      if (info.waitingRoom) {
        setStep('waiting');
      } else {
        setStep('confirm');
      }
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    }
    setLoading(false);
  };

  const handleStart = () => {
    if (scheduleInfo?.sessionId) {
      router.push(`/ujian/${scheduleInfo.sessionId}/session`);
    }
  };

  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('entry');
    setScheduleInfo(null);
    setError('');
    setToken('');
  };

  return (
    <div className="relative mx-auto max-w-2xl px-4 py-8 sm:py-16">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#5841EA]/[0.04] blur-3xl" />
        <div className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-[#1A73E8]/[0.04] blur-3xl" />
        <span className="pointer-events-none absolute left-[10%] top-[20%] font-display text-6xl font-bold text-[#5841EA]/[0.03]">
          H₂O
        </span>
        <span className="pointer-events-none absolute right-[8%] top-[60%] font-display text-5xl font-bold text-[#1A73E8]/[0.03]">
          CO₂
        </span>
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP: ENTRY ── */}
        {step === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Hero */}
            <div className="mb-10 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] shadow-xl shadow-[#5841EA]/20"
              >
                <Image src="/icons/Akurat_Logo_White.svg" alt="" width={40} height={40} />
              </motion.div>
              <h1 className="font-display text-3xl font-extrabold text-[#0E1E47] sm:text-4xl">
                Masuk Ujian
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-gray-500 sm:text-base">
                Masukkan kode ujian yang diberikan oleh gurumu untuk memulai
              </p>
            </div>

            {/* Code Input Card */}
            <div className="relative mb-8">
              <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-[#5841EA]/20 via-[#7B6AEF]/10 to-[#1A73E8]/20 blur-lg" />
              <div className="relative rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 ring-1 ring-gray-100">
                <label className="mb-3 block text-sm font-bold text-[#0E1E47]">
                  Kode Ujian
                </label>
                <div className="relative mb-5">
                  <input
                    ref={inputRef}
                    value={token}
                    onChange={e => { setToken(e.target.value.toUpperCase()); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleValidate()}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    className="w-full rounded-2xl border-2 border-gray-200 bg-gray-50/50 px-5 py-4 text-center font-mono text-3xl font-black tracking-[0.3em] text-[#5841EA] outline-none transition-all placeholder:text-gray-300 focus:border-[#5841EA] focus:bg-white focus:ring-4 focus:ring-[#5841EA]/10"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    {/* Visual cursor pulse when empty */}
                    {!token && (
                      <motion.div
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="h-8 w-0.5 rounded-full bg-[#5841EA]/40"
                      />
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 overflow-hidden"
                    >
                      <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3.5 text-sm text-rose-700 ring-1 ring-rose-100">
                        <AlertCircle size={18} className="shrink-0" />
                        <span>{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleValidate}
                  disabled={loading || token.trim().length < 4 || !online}
                  className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#5841EA] to-[#7B6AEF] py-4 text-sm font-bold text-white shadow-lg shadow-[#5841EA]/25 transition-all disabled:opacity-40 hover:-translate-y-0.5 hover:shadow-xl disabled:hover:translate-y-0"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <KeyRound size={18} />
                  )}
                  {loading ? 'Memeriksa kode...' : 'Masuk Ujian'}
                  {!loading && <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
                </button>

                {!online && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs text-rose-500">
                    <WifiOff size={14} />
                    Tidak ada koneksi internet
                  </div>
                )}
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { icon: Brain, label: 'Soal Adaptif', desc: 'Menyesuaikan kemampuan', color: 'from-violet-500 to-purple-600', bg: 'bg-violet-50', text: 'text-violet-600' },
                { icon: Clock, label: 'Terbatas Waktu', desc: 'Kelola dengan baik', color: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50', text: 'text-blue-600' },
                { icon: Shield, label: 'Anti-Cheat', desc: 'Layar penuh aktif', color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', text: 'text-amber-600' },
                { icon: Zap, label: 'Hasil Instan', desc: 'Langsung nilai', color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    className="group rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className={`mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl ${item.bg}`}>
                      <Icon size={18} className={item.text} />
                    </div>
                    <p className="text-xs font-bold text-[#0E1E47]">{item.label}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{item.desc}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Sign in prompt */}
            {!user && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 rounded-2xl bg-white/80 p-5 text-center ring-1 ring-gray-100"
              >
                <p className="text-sm text-gray-500">
                  Belum masuk?{' '}
                  <a href="/login" className="font-semibold text-[#5841EA] hover:underline">
                    Sign in
                  </a>{' '}
                  untuk memulai ujian
                </p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === 'confirm' && scheduleInfo && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Success header */}
            <div className="mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white shadow-xl shadow-emerald-200/40">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm"
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </motion.div>
              <h2 className="font-display text-2xl font-extrabold">{scheduleInfo.title}</h2>
              <p className="mt-1.5 text-sm text-white/80">Kode ujian valid — siap untuk memulai</p>
            </div>

            {/* Exam details */}
            <div className="mb-6 rounded-3xl bg-white p-6 shadow-lg shadow-gray-200/50 ring-1 ring-gray-100">
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl bg-violet-50 p-4 text-center">
                  <p className="font-display text-3xl font-black text-[#5841EA]">
                    {(scheduleInfo.domainCount || 0) * 3}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">Soal</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4 text-center">
                  <p className="font-display text-3xl font-black text-blue-600">
                    {scheduleInfo.durationMinutes}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">Menit</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 text-center">
                  <p className="font-display text-3xl font-black text-amber-600">
                    {scheduleInfo.domainCount}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">Kompetensi</p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl bg-amber-50 px-4 py-3.5 ring-1 ring-amber-100">
                <p className="text-sm font-medium text-amber-800">
                  ⚠ Setelah dimulai, ujian tidak bisa di-pause. Pastikan koneksi internet stabil dan gunakan layar penuh.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gray-100 px-6 py-3.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  <ArrowLeft size={16} />
                  Kembali
                </button>
                <button
                  onClick={handleStart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#5841EA] to-[#7B6AEF] py-3.5 text-sm font-bold text-white shadow-lg shadow-[#5841EA]/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Mulai Ujian
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STEP: WAITING ROOM ── */}
        {step === 'waiting' && scheduleInfo && (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] shadow-xl shadow-[#5841EA]/20"
              >
                <Users size={36} className="text-white" />
              </motion.div>
              <h1 className="font-display text-3xl font-extrabold text-[#0E1E47]">
                Ruang Tunggu
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Kamu sudah terdaftar. Tunggu guru memulai ujian.
              </p>
            </div>

            {/* Waiting card */}
            <div className="relative mb-8">
              <div className="absolute -inset-1 rounded-[28px] bg-gradient-to-r from-[#5841EA]/20 via-[#7B6AEF]/10 to-[#1A73E8]/20 blur-lg" />
              <div className="relative rounded-3xl bg-white p-8 shadow-xl shadow-gray-200/50 ring-1 ring-gray-100">
                {/* Exam info */}
                <div className="mb-6 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 p-5 ring-1 ring-violet-100">
                  <h3 className="font-display text-lg font-bold text-[#0E1E47]">{scheduleInfo.title}</h3>
                  <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} className="text-violet-500" />
                      {scheduleInfo.durationMinutes} menit
                    </span>
                    <span className="flex items-center gap-1.5">
                      <BookOpen size={14} className="text-violet-500" />
                      {(scheduleInfo.domainCount || 0) * 3} soal
                    </span>
                  </div>
                </div>

                {/* Animated waiting indicator */}
                <div className="mb-6 flex flex-col items-center py-6">
                  <div className="relative mb-5">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-[#5841EA]/10"
                      style={{ margin: '-12px' }}
                    />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#5841EA] to-[#7B6AEF]">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      >
                        <Loader2 size={28} className="text-white" />
                      </motion.div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#0E1E47]">Menunggu guru memulai...</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {waitingCount > 0
                      ? `${waitingCount} siswa sedang menunggu`
                      : 'Jangan tutup halaman ini'}
                  </p>
                </div>

                {/* Tips while waiting */}
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">Tips</p>
                  <ul className="space-y-1.5 text-xs text-gray-500">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#5841EA]">•</span>
                      Pastikan koneksi internet stabil
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#5841EA]">•</span>
                      Siapkan tempat yang tenang
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-[#5841EA]">•</span>
                      Ujian akan dimulai otomatis saat guru menekan tombol mulai
                    </li>
                  </ul>
                </div>

                <button
                  onClick={handleBack}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <ArrowLeft size={16} />
                  Keluar dari Ruang Tunggu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamPage;
