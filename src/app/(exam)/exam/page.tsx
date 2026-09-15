'use client';

import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound, AlertCircle, Loader2, ChevronRight, ArrowRight,
  CreditCard, History, Clock, WifiOff, CheckCircle2, XCircle,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';

type Step = 'dashboard' | 'confirm' | 'waiting';

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

interface LastExam {
  sessionId: string;
  examTitle: string;
  finalScore: number | null;
  predikat: string | null;
  completedAt: { _seconds: number } | null;
}

const PREDIKAT_STYLES: Record<string, string> = {
  Istimewa: 'text-violet-700 bg-violet-50 ring-violet-200',
  Unggul: 'text-blue-700 bg-blue-50 ring-blue-200',
  Madya: 'text-amber-700 bg-amber-50 ring-amber-200',
  Semenjana: 'text-orange-700 bg-orange-50 ring-orange-200',
  Terbatas: 'text-rose-700 bg-rose-50 ring-rose-200',
};

const ExamDashboard: FC = () => {
  const router = useRouter();
  const { user, examUser, loading: authLoading } = useExamAuth();

  const [step, setStep] = useState<Step>('dashboard');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(true);
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);
  const [lastExam, setLastExam] = useState<LastExam | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch last exam + token balance
  const fetchDashboard = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/msat/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.history?.length > 0) {
          setLastExam(data.history[0]);
        }
      }
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  useEffect(() => {
    const go = () => setOnline(true);
    const goOff = () => setOnline(false);
    window.addEventListener('online', go);
    window.addEventListener('offline', goOff);
    return () => { window.removeEventListener('online', go); window.removeEventListener('offline', goOff); };
  }, []);

  useEffect(() => {
    if (step === 'dashboard') inputRef.current?.focus();
  }, [step]);

  // Polling for waiting room
  useEffect(() => {
    if (step === 'waiting' && examInfo?.sessionId) {
      pollRef.current = setInterval(async () => {
        if (!user) return;
        try {
          const token = await user.getIdToken();
          const res = await fetch(`/api/msat/sessions/${examInfo.sessionId}`, {
            headers: { Authorization: `Bearer ${token}` },
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
    if (!code.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/msat/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Kode tidak valid');
        setLoading(false);
        return;
      }

      if (data.resumed) {
        if (data.status === 'completed') router.push(`/exam/results/${data.sessionId}`);
        else if (data.status === 'on_break') router.push(`/exam/break/${data.sessionId}`);
        else router.push(`/exam/session/${data.sessionId}`);
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

  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('dashboard');
    setExamInfo(null);
    setError('');
    setCode('');
  };

  const isVerified = examUser?.verificationStatus === 'verified';
  const tokenBalance = examUser?.tokenBalance ?? 0;
  const canTakeExam = tokenBalance > 0;

  // Loading state
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  // Not logged in — show entry prompt
  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-extrabold text-[#0E1E47]">
          Masuk Ujian
        </h1>
        <p className="mt-2 text-sm text-[#5B6475]">
          Masuk atau daftar untuk mengikuti ujian adaptif.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/exam/login"
            className="flex flex-1 items-center justify-center rounded-lg bg-[#6320EE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#5218C7]">
            Masuk
          </Link>
          <Link href="/exam/register"
            className="flex flex-1 items-center justify-center rounded-lg border border-[#DCE5F2] py-3 text-sm font-bold text-[#5B6475] transition-colors hover:bg-gray-50">
            Daftar
          </Link>
        </div>
      </div>
    );
  }

  // Waiting room
  if (step === 'waiting' && examInfo) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F0EDFF]">
            <Loader2 size={22} className="animate-spin text-[#6320EE]" />
          </div>
          <h2 className="font-display text-xl font-extrabold text-[#0E1E47]">Ruang Tunggu</h2>
          <p className="mt-1.5 text-sm text-[#5B6475]">
            Menunggu admin memulai ujian.
          </p>
        </div>

        <div className="mt-8 rounded-lg bg-white p-5 ring-1 ring-[#DCE5F2]">
          <p className="text-sm font-semibold text-[#0E1E47]">{examInfo.title}</p>
          <div className="mt-2 flex items-center gap-4 text-xs text-[#5B6475]">
            <span>{examInfo.questionsPerStage * examInfo.totalStages} soal</span>
            <span>{examInfo.durationPerStage} menit/stage</span>
          </div>
          <p className="mt-3 text-xs text-[#9CA3AF]">
            {waitingCount > 0 ? `${waitingCount} peserta menunggu` : 'Jangan tutup halaman ini'}
          </p>
        </div>

        <div className="mt-6 rounded-lg bg-[#F8F7FF] p-4 text-xs text-[#5B6475]">
          <p className="font-semibold text-[#0E1E47]">Tips</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>Pastikan koneksi internet stabil</li>
            <li>Siapkan tempat yang tenang</li>
          </ul>
        </div>

        <button onClick={handleBack}
          className="mt-6 w-full rounded-lg border border-[#DCE5F2] py-2.5 text-xs font-semibold text-[#5B6475] transition-colors hover:bg-gray-50">
          Keluar
        </button>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-display text-xl font-extrabold text-[#0E1E47] sm:text-2xl">
          Selamat datang, {examUser?.displayName?.split(' ')[0] ?? 'Peserta'}.
        </h1>
        <p className="mt-1 text-sm text-[#5B6475]">
          Siap untuk ujian hari ini?
        </p>
      </div>

      {/* Banner: not verified — informational only */}
      {user && !isVerified && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4 ring-1 ring-blue-100">
          <p className="text-sm font-semibold text-blue-800">Verifikasi identitas</p>
          <p className="mt-1 text-xs text-blue-600">
            Lengkapi profil dan verifikasi identitas agar sertifikat dapat diterbitkan dengan data yang valid.
          </p>
          <Link href="/exam/profile"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
            Lengkapi Profil <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Banner: no tokens */}
      {tokenBalance === 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4 ring-1 ring-amber-200">
          <p className="text-sm font-semibold text-amber-800">Token ujian habis</p>
          <p className="mt-1 text-xs text-amber-600">
            Beli token untuk mengikuti ujian.
          </p>
          <Link href="/exam/tokens"
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline">
            Beli Token <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Exam code input */}
      <div className="rounded-lg bg-white p-6 ring-1 ring-[#DCE5F2]">
        <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-[#5B6475]">
          Masukkan Kode Ujian
        </label>
        <div className="flex gap-3">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleValidate()}
            placeholder="XXXX-XXXX"
            maxLength={9}
            disabled={!canTakeExam}
            className="flex-1 rounded-lg border border-[#DCE5F2] bg-white px-4 py-3 font-mono text-lg font-bold tracking-[0.2em] text-[#0E1E47] outline-none transition placeholder:tracking-normal placeholder:text-[#9CA3AF] placeholder:font-normal focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10 disabled:opacity-40"
          />
          <button
            onClick={handleValidate}
            disabled={loading || code.trim().length < 4 || !canTakeExam || !online}
            className="flex items-center gap-2 rounded-lg bg-[#6320EE] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40 disabled:hover:bg-[#6320EE]"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />}
            {loading ? '...' : 'Masuk'}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-600">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        {!online && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-red-500">
            <WifiOff size={12} /> Tidak ada koneksi
          </div>
        )}

        <p className="mt-3 text-xs text-[#9CA3AF]">
          Kode didapatkan dari guru atau setelah membeli token.
        </p>
      </div>

      {/* Bottom cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {/* Token balance */}
        <Link href="/exam/tokens"
          className="rounded-lg bg-white p-4 ring-1 ring-[#DCE5F2] transition-colors hover:ring-[#6320EE]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={15} className="text-[#6320EE]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5B6475]">Token</span>
            </div>
            <ChevronRight size={14} className="text-[#9CA3AF]" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-[#0E1E47]">
            {tokenBalance}
          </p>
          <p className="text-xs text-[#9CA3AF]">
            {tokenBalance > 0 ? 'token aktif' : 'Beli token untuk mulai ujian'}
          </p>
        </Link>

        {/* Last exam */}
        <Link href="/exam/history"
          className="rounded-lg bg-white p-4 ring-1 ring-[#DCE5F2] transition-colors hover:ring-[#6320EE]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={15} className="text-[#5B6475]" />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5B6475]">Ujian Terakhir</span>
            </div>
            <ChevronRight size={14} className="text-[#9CA3AF]" />
          </div>
          {lastExam ? (
            <div className="mt-2">
              <p className="text-sm font-semibold text-[#0E1E47] truncate">
                {lastExam.examTitle}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-lg font-extrabold text-[#0E1E47]">
                  {lastExam.finalScore ?? '-'}
                </span>
                {lastExam.predikat && (
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold ring-1 ${PREDIKAT_STYLES[lastExam.predikat] ?? 'text-gray-600 bg-gray-50 ring-gray-200'}`}>
                    {lastExam.predikat}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[#9CA3AF]">Belum ada ujian</p>
          )}
        </Link>
      </div>
    </div>
  );
};

export default ExamDashboard;