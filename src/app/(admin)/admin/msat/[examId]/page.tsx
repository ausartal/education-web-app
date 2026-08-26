'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Loader2, Copy, Check, Brain, Clock, Users, Target,
  Play, Square, RefreshCw, BarChart3, Coffee, SkipForward, UserCheck,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface ExamDetail {
  id: string;
  title: string;
  description: string;
  code: string;
  module: string;
  totalStages: number;
  questionsPerStage: number;
  durationPerStage: number;
  breakDuration: number;
  passingThreshold: number;
  status: string;
  waitingRoom: boolean;
  currentUses: number;
  maxUses: number;
  stageWeights: Record<string, number>;
  predicates: Record<string, { min: number; max: number; label: string; description: string }>;
  createdAt: { _seconds: number } | null;
}

interface Session {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  currentStage: number;
  stagePath: string[];
  finalScore: number | null;
  predikat: string | null;
  breakEndsAt: { _seconds: number } | null;
  completedAt: { _seconds: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktif', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  in_progress: { label: 'Berlangsung', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  inactive: { label: 'Nonaktif', color: 'text-stone-600', bg: 'bg-stone-50 ring-stone-200' },
  expired: { label: 'Kedaluwarsa', color: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' },
};

const SESSION_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Menunggu', color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: 'Mengerjakan', color: 'text-blue-600', bg: 'bg-blue-50' },
  on_break: { label: 'Istirahat', color: 'text-orange-600', bg: 'bg-orange-50' },
  completed: { label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const DIFF_LABELS: Record<string, string> = { rendah: 'R', medium: 'M', tinggi: 'T' };

const MsatExamDetailPage: FC = () => {
  const { examId } = useParams<{ examId: string }>();
  const { user } = useAuth();

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string; target?: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/msat/${examId}`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setExam(data.exam);
        setSessions(data.sessions ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, examId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 5 seconds when there are waiting or on_break students
  useEffect(() => {
    const hasActive = sessions.some(s => s.status === 'waiting' || s.status === 'on_break');
    if (!hasActive) return;
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [sessions, fetchData]);

  const handleAction = async (action: string, target?: string) => {
    if (!user) return;
    setActionLoading(action + (target ?? ''));
    try {
      const idToken = await user.getIdToken();
      await fetch(`/api/admin/msat/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action, targetSessionId: target }),
      });
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading('');
    setConfirmAction(null);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(exam?.code ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 size={24} className="animate-spin text-violet-500" /></div>;
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-stone-500">Ujian tidak ditemukan</p>
        <Link href="/admin/msat" className="mt-4 text-xs font-semibold text-violet-600 hover:underline">Kembali</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.active;
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const onBreakSessions = sessions.filter(s => s.status === 'on_break');
  const inProgressSessions = sessions.filter(s => s.status === 'in_progress');
  const waitingSessions = sessions.filter(s => s.status === 'waiting');
  const avgScore = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.finalScore ?? 0), 0) / completedSessions.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><AlertCircle size={20} className="text-amber-500" /></div>
                <div>
                  <h3 className="text-sm font-bold text-stone-800">{confirmAction.label}</h3>
                  <p className="text-xs text-stone-400">Aksi ini tidak bisa dibatalkan</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-xl bg-stone-100 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-200">Batal</button>
                <button onClick={() => handleAction(confirmAction.action, confirmAction.target)} disabled={!!actionLoading} className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-sm font-bold text-white hover:bg-[#4D38D4] disabled:opacity-50">
                  {actionLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : 'Ya, Lanjutkan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/msat" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="font-display text-xl font-extrabold text-stone-800">{exam.title}</h1>
            <p className="text-xs text-stone-400">{exam.module} · {exam.totalStages} stage · {exam.waitingRoom ? 'Ruang Tunggu' : 'Langsung Mulai'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
          <button onClick={fetchData} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100"><RefreshCw size={14} /></button>
        </div>
      </div>

      {/* Code + Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Kode Akses</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-black tracking-wider text-[#5841EA]">{exam.code}</span>
            <button onClick={copyCode} className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 hover:bg-stone-200">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-stone-400">Bagikan kode ini ke siswa</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white p-5 ring-1 ring-stone-100">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Kontrol Ujian</p>
          <div className="flex flex-wrap gap-2">
            {exam.status === 'active' && waitingSessions.length > 0 && (
              <button onClick={() => setConfirmAction({ action: 'start', label: `Mulai ujian untuk ${waitingSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#4D38D4] disabled:opacity-50">
                {actionLoading === 'start' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Mulai Ujian ({waitingSessions.length})
              </button>
            )}
            {onBreakSessions.length > 0 && (
              <button onClick={() => setConfirmAction({ action: 'skip_break_all', label: `Skip istirahat untuk ${onBreakSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:opacity-50">
                {actionLoading === 'skip_break_all' ? <Loader2 size={12} className="animate-spin" /> : <SkipForward size={12} />}
                Skip Semua Istirahat ({onBreakSessions.length})
              </button>
            )}
            {exam.status === 'active' ? (
              <button onClick={() => setConfirmAction({ action: 'deactivate', label: 'Nonaktifkan ujian ini?' })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100 disabled:opacity-50">
                <Square size={12} /> Nonaktifkan
              </button>
            ) : exam.status === 'inactive' ? (
              <button onClick={() => handleAction('activate')} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                <Play size={12} /> Aktifkan
              </button>
            ) : null}
          </div>
        </motion.div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total', value: sessions.length, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Menunggu', value: waitingSessions.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Mengerjakan', value: inProgressSessions.length, icon: UserCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Istirahat', value: onBreakSessions.length, icon: Coffee, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Selesai', value: completedSessions.length, icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }} className="rounded-2xl bg-white p-4 ring-1 ring-stone-100">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.bg}`}><Icon size={13} className={s.color} /></div>
              <p className="mt-2 font-display text-lg font-black text-stone-800">{s.value}</p>
              <p className="text-[10px] text-stone-400">{s.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Waiting Room */}
      {waitingSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-2xl bg-white ring-1 ring-amber-200">
          <div className="flex items-center justify-between border-b border-amber-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50"><Clock size={12} className="text-amber-600" /></div>
              <h3 className="text-sm font-bold text-stone-700">Ruang Tunggu</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{waitingSessions.length} siswa</span>
            </div>
            <button onClick={() => setConfirmAction({ action: 'start', label: `Mulai ujian untuk ${waitingSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#4D38D4] disabled:opacity-50">
              {actionLoading === 'start' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Mulai Semua
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {waitingSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">
                  {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-stone-700">{s.studentName ?? 'Siswa'}</p>
                  <p className="text-[10px] text-stone-400">Menunggu ujian dimulai</p>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">Menunggu</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* On Break */}
      {onBreakSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-white ring-1 ring-orange-200">
          <div className="flex items-center justify-between border-b border-orange-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-50"><Coffee size={12} className="text-orange-600" /></div>
              <h3 className="text-sm font-bold text-stone-700">Sedang Istirahat</h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">{onBreakSessions.length} siswa</span>
            </div>
            <button onClick={() => setConfirmAction({ action: 'skip_break_all', label: `Skip istirahat untuk ${onBreakSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:opacity-50">
              <SkipForward size={12} /> Skip Semua
            </button>
          </div>
          <div className="divide-y divide-stone-50">
            {onBreakSessions.map(s => {
              const breakEnds = s.breakEndsAt?._seconds ? new Date(s.breakEndsAt._seconds * 1000) : null;
              const remaining = breakEnds ? Math.max(0, Math.floor((breakEnds.getTime() - Date.now()) / 1000)) : 0;
              const mins = Math.floor(remaining / 60);
              const secs = remaining % 60;
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-stone-700">{s.studentName ?? 'Siswa'}</p>
                    <p className="text-[10px] text-stone-400">
                      Stage {s.currentStage} · {s.stagePath?.map(p => DIFF_LABELS[p] ?? p).join(' → ') ?? '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      {mins}:{secs.toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => setConfirmAction({ action: 'skip_break', label: `Skip istirahat untuk ${s.studentName}?`, target: s.id })}
                      disabled={!!actionLoading}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-600 ring-1 ring-orange-200 hover:bg-orange-100 disabled:opacity-50"
                      title="Skip istirahat"
                    >
                      <SkipForward size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Config */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl bg-white p-5 ring-1 ring-stone-100">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-stone-400">Konfigurasi</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-stone-50 px-3 py-2"><p className="text-[10px] text-stone-400">Durasi/Stage</p><p className="text-sm font-bold text-stone-700">{exam.durationPerStage} menit</p></div>
          <div className="rounded-xl bg-stone-50 px-3 py-2"><p className="text-[10px] text-stone-400">Istirahat</p><p className="text-sm font-bold text-stone-700">{exam.breakDuration} menit</p></div>
          <div className="rounded-xl bg-stone-50 px-3 py-2"><p className="text-[10px] text-stone-400">Passing</p><p className="text-sm font-bold text-stone-700">{exam.passingThreshold}/12</p></div>
        </div>
      </motion.div>

      {/* All Participants */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-white ring-1 ring-stone-100">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-stone-700">Semua Peserta</h3>
          <span className="text-[11px] text-stone-400">{sessions.length} siswa</span>
        </div>
        {sessions.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={24} className="mx-auto text-stone-300" />
            <p className="mt-2 text-xs text-stone-400">Belum ada peserta</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-50">
            {sessions.map(s => {
              const sCfg = SESSION_STATUS[s.status] ?? { label: s.status, color: 'text-stone-500', bg: 'bg-stone-50' };
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                    {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-stone-700">{s.studentName ?? 'Siswa'}</p>
                    <p className="text-[10px] text-stone-400">
                      Stage {s.currentStage} · {s.stagePath?.map(p => DIFF_LABELS[p] ?? p).join(' → ') ?? '-'}
                    </p>
                  </div>
                  {s.finalScore !== null && <span className="text-sm font-bold text-stone-700">{s.finalScore}</span>}
                  {s.predikat && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">{s.predikat}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sCfg.bg} ${sCfg.color}`}>{sCfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MsatExamDetailPage;
