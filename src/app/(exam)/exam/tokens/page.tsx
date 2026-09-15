'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar, Clock, Users, FileText, Loader2, ChevronRight,
  AlertCircle, CheckCircle2, ArrowRight,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';

interface ScheduledExam {
  id: string;
  title: string;
  description: string;
  code: string;
  totalStages: number;
  questionsPerStage: number;
  durationPerStage: number;
  breakDuration: number;
  status: string;
  enrolled: boolean;
  sessionStatus: string | null;
  sessionId: string | null;
  createdAt: { _seconds: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Menunggu', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  in_progress: { label: 'Sedang Berlangsung', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  on_break: { label: 'Istirahat', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  completed: { label: 'Selesai', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  active: { label: 'Tersedia', color: 'text-violet-700', bg: 'bg-violet-50 ring-violet-200' },
};

const ExamTokensPage: FC = () => {
  const router = useRouter();
  const { user, examUser } = useExamAuth();
  const [exams, setExams] = useState<ScheduledExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');

  const tokenBalance = examUser?.tokenBalance ?? 0;

  const fetchExams = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/exam/scheduled', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data.exams ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const handleJoin = async (exam: ScheduledExam) => {
    if (!user) return;
    setError('');

    // If already enrolled, navigate to current state
    if (exam.enrolled && exam.sessionId) {
      if (exam.sessionStatus === 'completed') router.push(`/exam/results/${exam.sessionId}`);
      else if (exam.sessionStatus === 'on_break') router.push(`/exam/break/${exam.sessionId}`);
      else router.push(`/exam/session/${exam.sessionId}`);
      return;
    }

    setJoining(exam.id);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/msat/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: exam.code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Gagal bergabung');
        setJoining(null);
        return;
      }

      if (data.status === 'in_progress') {
        router.push(`/exam/session/${data.sessionId}`);
      } else {
        router.push(`/exam`);
      }
    } catch {
      setError('Terjadi kesalahan.');
    }
    setJoining(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Ujian Terjadwal</h1>
        <p className="mt-1 text-sm text-[#5B6475]">
          Daftar ujian yang dijadwalkan oleh admin. Pilih ujian untuk bergabung.
        </p>
      </div>

      {/* Token balance */}
      <div className="mb-6 rounded-lg bg-[#F0EDFF] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#7C6BC4]">Token Aktif</p>
            <p className="font-display text-2xl font-extrabold text-[#3B2F6B]">{tokenBalance}</p>
          </div>
          <Link href="/exam/profile"
            className="rounded-md bg-[#6320EE]/10 px-3 py-1.5 text-[11px] font-bold text-[#6320EE] transition-colors hover:bg-[#6320EE]/20">
            Profil
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Scheduled exams */}
      {exams.length === 0 ? (
        <div className="rounded-lg bg-[#F8F7FF] py-12 text-center ring-1 ring-[#E5E0F5]">
          <Calendar size={24} className="mx-auto text-[#9CA3AF]" />
          <p className="mt-3 text-sm font-semibold text-[#5B6475]">Belum ada ujian terjadwal</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Ujian akan muncul di sini setelah admin menjadwalkannya.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => {
            const totalQ = exam.questionsPerStage * exam.totalStages;
            const totalTime = exam.durationPerStage * exam.totalStages;
            const isJoining = joining === exam.id;

            let statusLabel = 'Tersedia';
            let statusColor = 'text-violet-700 bg-violet-50 ring-violet-200';
            if (exam.enrolled && exam.sessionStatus) {
              const cfg = STATUS_CONFIG[exam.sessionStatus];
              if (cfg) { statusLabel = cfg.label; statusColor = `${cfg.color} ${cfg.bg}`; }
            }
            const examStatus = exam.status === 'in_progress' ? STATUS_CONFIG.in_progress : null;

            return (
              <div key={exam.id} className="rounded-lg bg-white p-5 ring-1 ring-[#DCE5F2]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[#0E1E47] truncate">{exam.title}</h3>
                      {exam.enrolled && (
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ring-1 ${statusColor}`}>
                          {statusLabel}
                        </span>
                      )}
                      {!exam.enrolled && examStatus && (
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ring-1 ${examStatus.bg} ${examStatus.color} ring-${examStatus.bg.replace('bg-', '')}`}>
                          Sedang berlangsung
                        </span>
                      )}
                    </div>
                    {exam.description && (
                      <p className="mt-1 text-xs text-[#5B6475] line-clamp-2">{exam.description}</p>
                    )}
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9CA3AF]">
                      <span className="flex items-center gap-1"><FileText size={12} /> {totalQ} soal</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {totalTime} menit</span>
                      <span className="flex items-center gap-1"><Users size={12} /> {exam.totalStages} stage</span>
                    </div>
                  </div>

                  {exam.enrolled ? (
                    <button
                      onClick={() => handleJoin(exam)}
                      disabled={isJoining}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#6320EE] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40"
                    >
                      {isJoining ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                      Lanjutkan
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(exam)}
                      disabled={isJoining}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#F0EDFF] px-4 py-2 text-xs font-bold text-[#6320EE] ring-1 ring-[#DCCFFC] transition-colors hover:bg-[#E2D9FC] disabled:opacity-40"
                    >
                      {isJoining ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      Gabung
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamTokensPage;