'use client';

import { FC, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  KeyRound, AlertCircle, Loader2, Shield, Brain, Clock,
  Users, Zap, BookOpen, ChevronRight, ArrowLeft, WifiOff, Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

type Step = 'entry' | 'confirm' | 'waiting';

interface ExamInfo {
  id: string;
  title: string;
  code: string;
  totalStages: number;
  questionsPerStage: number;
  durationPerStage: number;
  breakDuration: number;
  sessionId?: string;
  resumed?: boolean;
}

const features = [
  { icon: Brain, label: 'Soal Adaptif', desc: 'Menyesuaikan kemampuanmu', bg: 'bg-violet-50', text: 'text-violet-600', ring: 'ring-violet-100' },
  { icon: Clock, label: 'Terbatas Waktu', desc: 'Kelola waktumu', bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
  { icon: Shield, label: 'Anti-Cheat', desc: 'Layar penuh aktif', bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
  { icon: Zap, label: 'Hasil Instan', desc: 'Langsung lihat nilai', bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
];

const ExamPage: FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('entry');
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [online, setOnline] = useState(true);
  const [waitingCount, setWaitingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h1 = () => setOnline(true);
    const h2 = () => setOnline(false);
    window.addEventListener('online', h1);
    window.addEventListener('offline', h2);
    return () => { window.removeEventListener('online', h1); window.removeEventListener('offline', h2); };
  }, []);

  useEffect(() => {
    if (step === 'entry') inputRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step === 'waiting' && examInfo?.sessionId) {
      pollRef.current = setInterval(async () => {
        try {
          if (!user) return;
          const idToken = await user.getIdToken();
          const res = await fetch(`/api/msat/sessions/${examInfo.sessionId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setWaitingCount(data.waitingCount ?? 0);
            if (data.status === 'in_progress' || data.examStarted) {
              clearInterval(pollRef.current!);
              router.push(`/exam/session/${examInfo.sessionId}`);
            }
          }
        } catch { /* ignore */ }
      }, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [step, examInfo, user, router]);

  const handleValidate = async () => {
    if (!token.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/msat/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: token.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kode tidak valid');
        setLoading(false);
        return;
      }

      // Resumed session — go to current state
      if (data.resumed) {
        if (data.status === 'completed') {
          router.push(`/exam/results/${data.sessionId}`);
        } else if (data.status === 'on_break') {
          router.push(`/exam/break/${data.sessionId}`);
        } else {
          router.push(`/exam/session/${data.sessionId}`);
        }
        return;
      }

      const info: ExamInfo = {
        id: data.exam.id,
        title: data.exam.title,
        code: data.exam.code,
        totalStages: data.exam.totalStages,
        questionsPerStage: data.exam.questionsPerStage,
        durationPerStage: data.exam.durationPerStage,
        breakDuration: data.exam.breakDuration,
        sessionId: data.sessionId,
      };
      setExamInfo(info);

      // If exam is already in progress, go directly to session
      if (data.status === 'in_progress') {
        router.push(`/exam/session/${data.sessionId}`);
        return;
      }

      setStep('waiting');
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    }
    setLoading(false);
  };

  const handleStart = () => {
    if (examInfo?.sessionId) router.push(`/exam/session/${examInfo.sessionId}`);
  };

  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('entry');
    setExamInfo(null);
    setError('');
    setToken('');
  };

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-10 sm:py-16">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-b from-[#5841EA]/[0.06] to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-[#1A73E8]/[0.04] blur-3xl" />
        <div className="absolute right-0 top-1/2 h-64 w-64 rounded-full bg-[#7B6AEF]/[0.04] blur-3xl" />

        {/* Chemistry formulas — scattered, very subtle */}
        <span className="absolute left-[6%] top-[12%] font-display text-5xl font-bold text-[#5841EA]/[0.04] select-none">H₂O</span>
        <span className="absolute right-[8%] top-[8%] font-display text-4xl font-bold text-[#1A73E8]/[0.035] select-none">O₂</span>
        <span className="absolute left-[14%] bottom-[18%] font-display text-6xl font-bold text-[#7B6AEF]/[0.03] select-none">CO₂</span>
        <span className="absolute right-[12%] bottom-[25%] font-display text-4xl font-bold text-[#5841EA]/[0.035] select-none">CH₄</span>
        <span className="absolute left-[38%] top-[6%] font-display text-3xl font-bold text-[#1A73E8]/[0.03] select-none">NaCl</span>
        <span className="absolute right-[30%] bottom-[10%] font-display text-3xl font-bold text-[#7B6AEF]/[0.03] select-none">NH₃</span>
        <span className="absolute left-[4%] top-[55%] font-display text-3xl font-bold text-[#5841EA]/[0.025] select-none">C₆H₁₂O₆</span>
        <span className="absolute right-[5%] top-[45%] font-display text-4xl font-bold text-[#1A73E8]/[0.025] select-none">H₂SO₄</span>

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{
          backgroundImage: 'radial-gradient(circle, #5841EA 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <AnimatePresence mode="wait">
          {/* ── ENTRY ── */}
          {step === 'entry' && (
            <motion.div key="entry" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

              {/* Logo + Title */}
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05, type: 'spring', stiffness: 200 }} className="mb-8 text-center">
                <div className="relative mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] shadow-lg shadow-[#5841EA]/25" />
                  <Image src="/icons/Akurat_Logo_White.svg" alt="" width={36} height={36} className="relative z-10" />
                </div>
                <h1 className="font-display text-[28px] font-extrabold tracking-tight text-[#0E1E47] sm:text-3xl">
                  Masuk Ujian
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  Masukkan kode dari gurumu untuk memulai ujian
                </p>
              </motion.div>

              {/* Input Card */}
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="relative mb-6">
                  <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[#5841EA]/20 via-transparent to-[#1A73E8]/20 blur-sm" />
                  <div className="relative rounded-3xl bg-white/90 p-6 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.04] backdrop-blur-xl sm:p-8">
                    <label className="mb-3 block text-[13px] font-bold uppercase tracking-wider text-gray-400">
                      Kode Ujian
                    </label>
                    <div className="relative mb-4">
                      <input
                        ref={inputRef}
                        value={token}
                        onChange={e => { setToken(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setError(''); }}
                        onKeyDown={e => e.key === 'Enter' && handleValidate()}
                        placeholder="XXXX-XXXX"
                        maxLength={9}
                        className="w-full rounded-2xl border-2 border-gray-100 bg-gray-50/80 px-5 py-[18px] text-center font-mono text-[28px] font-black tracking-[0.35em] text-[#5841EA] outline-none transition-all placeholder:tracking-[0.2em] placeholder:text-gray-300 focus:border-[#5841EA]/40 focus:bg-white focus:ring-4 focus:ring-[#5841EA]/[0.08]"
                      />
                    </div>

                    <AnimatePresence>
                      {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                          <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 px-4 py-3 text-[13px] text-rose-600 ring-1 ring-rose-100">
                            <AlertCircle size={15} className="shrink-0" />
                            {error}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleValidate}
                      disabled={loading || token.trim().length < 4 || !online}
                      className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-[#5841EA] py-3.5 text-sm font-bold text-white shadow-md shadow-[#5841EA]/20 transition-all hover:bg-[#4D38D4] hover:shadow-lg disabled:opacity-30 disabled:hover:bg-[#5841EA]"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                      {loading ? 'Memeriksa...' : 'Masuk Ujian'}
                      {!loading && <ChevronRight size={14} className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />}
                    </button>

                    {!online && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-rose-400">
                        <WifiOff size={12} /> Tidak ada koneksi
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Feature pills */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap justify-center gap-2">
                {features.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.06 }}
                      className={`flex items-center gap-2 rounded-xl ${f.bg} px-3.5 py-2 ring-1 ${f.ring}`}
                    >
                      <Icon size={13} className={f.text} />
                      <span className="text-xs font-semibold text-gray-600">{f.label}</span>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Sign in prompt */}
              {!user && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-center text-[13px] text-gray-400">
                  Belum punya akun?{' '}
                  <a href="/register" className="font-semibold text-[#5841EA] hover:underline">Daftar</a>
                  {' '}atau{' '}
                  <a href="/login" className="font-semibold text-[#5841EA] hover:underline">Sign in</a>
                </motion.p>
              )}
            </motion.div>
          )}

          {/* ── CONFIRM ── */}
          {step === 'confirm' && examInfo && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

              {/* Success header */}
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring', stiffness: 200 }} className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-[#10B981] to-[#059669] p-7 text-center text-white shadow-xl shadow-emerald-200/50">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Sparkles size={22} />
                </div>
                <h2 className="font-display text-xl font-extrabold">{examInfo.title}</h2>
                <p className="mt-1 text-sm text-white/70">Kode valid — siap untuk memulai</p>
              </motion.div>

              {/* Stats */}
              <div className="mb-5 grid grid-cols-3 gap-3">
                {[
                  { value: examInfo.questionsPerStage * examInfo.totalStages, label: 'Total Soal', bg: 'bg-violet-50', text: 'text-[#5841EA]' },
                  { value: examInfo.durationPerStage, label: 'Menit/Stage', bg: 'bg-blue-50', text: 'text-blue-600' },
                  { value: examInfo.totalStages, label: 'Stage', bg: 'bg-amber-50', text: 'text-amber-600' },
                ].map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.06 }} className={`rounded-2xl ${s.bg} p-4 text-center ring-1 ring-black/[0.03]`}>
                    <p className={`font-display text-2xl font-black ${s.text}`}>{s.value}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-gray-500">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Warning */}
              <div className="mb-5 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700 ring-1 ring-amber-100">
                Ujian tidak bisa di-pause setelah dimulai. Pastikan koneksi stabil.
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={handleBack} className="flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-5 py-3.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200">
                  <ArrowLeft size={15} /> Kembali
                </button>
                <button onClick={handleStart} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#5841EA] py-3.5 text-sm font-bold text-white shadow-md shadow-[#5841EA]/20 transition-all hover:bg-[#4D38D4] hover:shadow-lg">
                  Mulai Ujian <ChevronRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── WAITING ROOM ── */}
          {step === 'waiting' && examInfo && (
            <motion.div key="waiting" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -24 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>

              <div className="mb-6 text-center">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200 }} className="relative mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 2.5, repeat: Infinity }} className="absolute inset-0 rounded-full bg-[#5841EA]" />
                  <div className="relative flex h-full w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] shadow-lg shadow-[#5841EA]/25">
                    <Users size={32} className="text-white" />
                  </div>
                </motion.div>
                <h1 className="font-display text-2xl font-extrabold text-[#0E1E47]">Ruang Tunggu</h1>
                <p className="mt-1.5 text-sm text-gray-400">Tunggu guru memulai ujian</p>
              </div>

              <div className="relative mb-6">
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-[#5841EA]/15 via-transparent to-[#1A73E8]/15 blur-sm" />
                <div className="relative rounded-3xl bg-white/90 p-6 shadow-xl shadow-black/[0.04] ring-1 ring-black/[0.04] backdrop-blur-xl sm:p-8">
                  {/* Exam info */}
                  <div className="mb-5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 p-4 ring-1 ring-violet-100/60">
                    <h3 className="font-display text-base font-bold text-[#0E1E47]">{examInfo.title}</h3>
                    <div className="mt-2 flex items-center gap-4 text-[13px] text-gray-500">
                      <span className="flex items-center gap-1.5"><Clock size={13} className="text-violet-400" />{examInfo.durationPerStage} menit/stage</span>
                      <span className="flex items-center gap-1.5"><BookOpen size={13} className="text-violet-400" />{examInfo.questionsPerStage * examInfo.totalStages} soal</span>
                    </div>
                  </div>

                  {/* Spinner */}
                  <div className="flex flex-col items-center py-5">
                    <div className="relative mb-4">
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }} className="flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-violet-100 border-t-[#5841EA]">
                        <div className="h-2 w-2 rounded-full bg-[#5841EA]" />
                      </motion.div>
                    </div>
                    <p className="text-sm font-semibold text-[#0E1E47]">Menunggu guru...</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {waitingCount > 0 ? `${waitingCount} siswa menunggu` : 'Jangan tutup halaman ini'}
                    </p>
                  </div>

                  {/* Tips */}
                  <div className="rounded-xl bg-gray-50 px-4 py-3">
                    <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-300">Tips</p>
                    <ul className="space-y-1 text-xs text-gray-400">
                      <li>Pastikan koneksi internet stabil</li>
                      <li>Siapkan tempat yang tenang</li>
                      <li>Ujian dimulai otomatis saat guru menekan mulai</li>
                    </ul>
                  </div>

                  <button onClick={handleBack} className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-100 py-2.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700">
                    <ArrowLeft size={13} /> Keluar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExamPage;
