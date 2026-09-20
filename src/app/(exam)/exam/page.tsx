'use client';

import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound, AlertCircle, Loader2, ArrowRight,
  CreditCard, History, Clock, WifiOff, CheckCircle2,
  Award, User, Shield,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';
import { ExamAuthGuard } from '@/components/exam/ExamAuthGuard';

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

const ExamDashboardContent: FC = () => {
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
            // If session was abandoned/cleaned up, go back to dashboard
            if (data.status === 'abandoned' || data.status === 'completed') {
              clearInterval(pollRef.current!);
              handleBack();
            }
          }
        } catch { /* ignore */ }
      }, 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [step, examInfo, user, router]);

  // Validate code and fetch exam info (don't create session yet)
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

      // If resuming an active/break session, go directly
      if (data.resumed) {
        if (data.status === 'completed') {
          router.push(`/exam/results/${data.sessionId}`);
        } else if (data.status === 'on_break') {
          router.push(`/exam/break/${data.sessionId}`);
        } else if (data.status === 'in_progress') {
          router.push(`/exam/session/${data.sessionId}`);
        } else if (data.status === 'waiting') {
          // Resume waiting — go back to waiting room
          const info: ExamInfo = {
            id: data.exam.id,
            title: data.exam.title,
            code: data.exam.code,
            totalStages: data.exam.totalStages,
            questionsPerStage: data.exam.questionsPerStage,
            durationPerStage: data.exam.durationPerStage,
            breakDuration: data.exam.breakDuration,
            sessionId: data.sessionId,
            resumed: true,
          };
          setExamInfo(info);
          setStep('waiting');
        }
        return;
      }

      // New session — show confirmation popup
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

      setStep('confirm');
    } catch {
      setError('Terjadi kesalahan. Coba lagi.');
    }
    setLoading(false);
  };

  // Confirm and enter waiting room
  const handleConfirmJoin = () => {
    if (!examInfo) return;
    setStep('waiting');
  };

  const handleBack = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setStep('dashboard');
    setExamInfo(null);
    setError('');
    // Don't clear code so user can re-enter easily
  };

  const isVerified = examUser?.verificationStatus === 'verified';
  const tokenBalance = examUser?.tokenBalance ?? 0;
  const canTakeExam = true; // Token requirement disabled for development

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

  // Confirmation popup before joining
  if (step === 'confirm' && examInfo) {
    const totalQuestions = examInfo.questionsPerStage * examInfo.totalStages;
    const totalTime = examInfo.durationPerStage * examInfo.totalStages;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-stone-100 px-6 py-4">
            <h3 className="font-display text-lg font-extrabold text-stone-800">Konfirmasi Masuk Ujian</h3>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Exam info */}
            <div>
              <p className="text-base font-bold text-stone-800">{examInfo.title}</p>
              <p className="mt-0.5 text-xs text-stone-400">Kode: {examInfo.code}</p>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Jumlah Soal</p>
                <p className="mt-0.5 text-sm font-bold text-stone-800">{totalQuestions} soal</p>
              </div>
              <div className="rounded-lg bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Total Durasi</p>
                <p className="mt-0.5 text-sm font-bold text-stone-800">{totalTime} menit</p>
              </div>
              <div className="rounded-lg bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Stage</p>
                <p className="mt-0.5 text-sm font-bold text-stone-800">{examInfo.totalStages} stage</p>
              </div>
              <div className="rounded-lg bg-stone-50 px-3 py-2.5 ring-1 ring-stone-200">
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">Durasi/Stage</p>
                <p className="mt-0.5 text-sm font-bold text-stone-800">{examInfo.durationPerStage} menit</p>
              </div>
            </div>

            {/* Token cost */}
            <div className="rounded-lg bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">1 token akan digunakan</p>
              </div>
              <p className="mt-1 text-xs text-amber-600">Token tidak dapat dikembalikan setelah ujian dimulai.</p>
            </div>

            {/* Rules */}
            <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-stone-500" />
                <p className="text-xs font-bold text-stone-700">Aturan Ujian</p>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-600">
                <li>- Ujian harus dijalankan dalam mode layar penuh</li>
                <li>- Dilarang berpindah tab atau aplikasi selama ujian</li>
                <li>- Pelanggaran tab lebih dari 3x akan mengakhiri ujian secara paksa</li>
                <li>- Jawaban yang sudah dikumpulkan tidak dapat diubah</li>
                <li>- Pastikan koneksi internet stabil sebelum memulai</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 border-t border-stone-100 px-6 py-4">
            <button onClick={handleBack}
              className="flex-1 rounded-lg border border-stone-200 py-2.5 text-sm font-semibold text-stone-600 transition-colors hover:bg-stone-50">
              Batal
            </button>
            <button onClick={handleConfirmJoin}
              className="flex-1 rounded-lg bg-[#6320EE] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5218C7]">
              Masuk Ruang Tunggu
            </button>
          </div>
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
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="font-display text-xl font-extrabold text-[#0E1E47] sm:text-2xl">
          Selamat datang, {examUser?.displayName?.split(' ')[0] ?? 'Peserta'}.
        </h1>
        <p className="mt-1 text-sm text-[#5B6475]">
          Siap untuk ujian hari ini?
        </p>
      </div>

      {/* Banner: not verified */}
      {user && !isVerified && (
        <div className="mb-6 rounded-lg bg-blue-50 px-4 py-3.5 ring-1 ring-blue-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-blue-800">Verifikasi identitas</p>
              <p className="mt-0.5 text-xs text-blue-600">
                Lengkapi profil dan verifikasi identitas agar sertifikat diterbitkan dengan data yang valid.
              </p>
            </div>
            <Link href="/exam/profile"
              className="shrink-0 rounded-md bg-blue-100 px-3 py-1.5 text-[11px] font-bold text-blue-700 transition-colors hover:bg-blue-200">
              Lengkapi
            </Link>
          </div>
        </div>
      )}

      {/* Exam code input */}
      <div className="rounded-lg bg-white p-6 ring-1 ring-[#DCE5F2]">
        <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-[#7C6BC4]">
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
          Kode didapatkan dari admin penyelenggara ujian.
        </p>
      </div>

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-[#F0EDFF] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#7C6BC4]">Token</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#3B2F6B]">{tokenBalance}</p>
          <p className="text-[11px] text-[#9B8FC7]">aktif</p>
        </div>
        <div className="rounded-lg bg-[#EDF6FF] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#5B8DC7]">Ujian</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#1E3A5F]">
            {lastExam ? lastExam.finalScore ?? '-' : '-'}
          </p>
          <p className="text-[11px] text-[#8BB0D6]">skor terakhir</p>
        </div>
        <div className="rounded-lg bg-[#FFF6E5] p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#C4944A]">Predikat</p>
          <p className="mt-1 font-display text-lg font-extrabold text-[#6B4E1E]">
            {lastExam?.predikat ?? '-'}
          </p>
          <p className="text-[11px] text-[#D4AA6B]">terakhir</p>
        </div>
      </div>

      {/* Last exam detail */}
      {lastExam && (
        <div className="mt-4 rounded-lg bg-[#F8F7FF] p-4 ring-1 ring-[#E5E0F5]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-[#7C6BC4]">Ujian Terakhir</p>
            <Link href="/exam/history" className="text-[11px] font-bold text-[#6320EE] hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#0E1E47]">{lastExam.examTitle}</p>
              <p className="text-xs text-[#9CA3AF]">
                {lastExam.completedAt?._seconds
                  ? new Date(lastExam.completedAt._seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '-'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl font-extrabold text-[#0E1E47]">
                {lastExam.finalScore ?? '-'}
              </span>
              {lastExam.predikat && (
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ring-1 ${PREDIKAT_STYLES[lastExam.predikat] ?? 'text-gray-600 bg-gray-50 ring-gray-200'}`}>
                  {lastExam.predikat}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ExamDashboard: FC = () => (
  <ExamAuthGuard>
    <ExamDashboardContent />
  </ExamAuthGuard>
);

export default ExamDashboard;
