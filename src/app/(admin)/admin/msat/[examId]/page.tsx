'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Copy, Check, Clock, Users, Target,
  Play, Square, RefreshCw, Coffee, SkipForward, UserCheck,
  AlertCircle, Send, LockKeyhole, Brain,
} from 'lucide-react';
import Link from 'next/link';
import { AdminPageHeader, AdminEmptyState } from '@/components/admin/AdminUI';
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
  resultsReleasedAt: { _seconds: number } | null;
  anomalyFlags?: string[];
  terminated?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Aktif', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
  in_progress: { label: 'Berlangsung', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  inactive: { label: 'Nonaktif', color: 'text-slate-600', bg: 'bg-slate-50 ring-slate-200' },
  expired: { label: 'Kedaluwarsa', color: 'text-rose-700', bg: 'bg-rose-50 ring-rose-200' },
};

const SESSION_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Menunggu', color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: 'Mengerjakan', color: 'text-blue-600', bg: 'bg-blue-50' },
  on_break: { label: 'Istirahat', color: 'text-orange-600', bg: 'bg-orange-50' },
  completed: { label: 'Selesai', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  cancelled: { label: 'Dibatalkan', color: 'text-slate-500', bg: 'bg-slate-100' },
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
  const [confirmAction, setConfirmAction] = useState<{ action: string; label: string; target?: string; needsReason?: boolean } | null>(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState('');

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

  // Keep live controls in sync while an exam is active or results are held.
  useEffect(() => {
    const hasActive = sessions.some(s =>
      ['waiting', 'in_progress', 'on_break'].includes(s.status)
      || (s.status === 'completed' && !s.resultsReleasedAt)
    );
    if (!hasActive) return;
    const timer = setInterval(fetchData, 5000);
    return () => clearInterval(timer);
  }, [sessions, fetchData]);

  const handleAction = async (action: string, target?: string) => {
    if (!user) return;
    setActionLoading(action + (target ?? ''));
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/admin/msat/${examId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ action, targetSessionId: target, reason: reason.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? 'Aksi gagal dijalankan');
        setActionLoading('');
        return;
      }
      await fetchData();
    } catch {
      setActionError('Koneksi bermasalah. Coba lagi.');
      setActionLoading('');
      return;
    }
    setActionLoading('');
    setConfirmAction(null);
    setReason('');
  };

  const openConfirm = (next: { action: string; label: string; target?: string; needsReason?: boolean }) => {
    setReason('');
    setActionError('');
    setConfirmAction(next);
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
        <p className="text-sm text-slate-500">Ujian tidak ditemukan</p>
        <Link href="/admin/msat" className="mt-4 text-xs font-semibold text-violet-600 hover:underline">Kembali</Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.active;
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const heldResultSessions = completedSessions.filter(s => !s.resultsReleasedAt);
  const onBreakSessions = sessions.filter(s => s.status === 'on_break');
  const inProgressSessions = sessions.filter(s => s.status === 'in_progress');
  const waitingSessions = sessions.filter(s => s.status === 'waiting');

  return (
    <div className="space-y-5">
      {/* Confirm Dialog */}
      <AnimatePresence>
        {confirmAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm" onClick={() => { setConfirmAction(null); setActionError(''); }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50"><AlertCircle size={20} className="text-amber-500" /></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{confirmAction.label}</h3>
                  <p className="text-xs text-slate-400">{confirmAction.action === 'activate' || confirmAction.action === 'deactivate' ? 'Kamu bisa mengubahnya lagi kapan saja' : 'Aksi ini tidak bisa dibatalkan'}</p>
                </div>
              </div>
              {confirmAction.needsReason && (
                <div className="mb-4">
                  <label htmlFor="action-reason" className="mb-1.5 block text-xs font-semibold text-slate-600">Alasan (wajib, tercatat di audit log dan dikirim ke peserta)</label>
                  <textarea
                    id="action-reason"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    maxLength={300}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400"
                    placeholder="Contoh: Terdeteksi membuka aplikasi lain saat ujian"
                  />
                </div>
              )}
              {actionError && <p role="alert" className="mb-3 text-xs font-medium text-rose-600">{actionError}</p>}
              <div className="flex gap-3">
                <button onClick={() => { setConfirmAction(null); setActionError(''); }} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">Batal</button>
                <button onClick={() => handleAction(confirmAction.action, confirmAction.target)} disabled={!!actionLoading || (!!confirmAction.needsReason && reason.trim().length < 5)} className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-sm font-bold text-white hover:bg-[#4D38D4] disabled:opacity-50">
                  {actionLoading ? <Loader2 size={14} className="mx-auto animate-spin" /> : 'Ya, Lanjutkan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <AdminPageHeader
        backHref="/admin/msat"
        icon={<Brain size={22} />}
        eyebrow="Monitor langsung"
        title={exam.title}
        description={`${exam.module} · ${exam.totalStages} stage · ${exam.waitingRoom ? 'Ruang Tunggu' : 'Langsung Mulai'}`}
        actions={
          <>
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.label}</span>
            <button
              onClick={fetchData}
              aria-label="Muat ulang data ujian"
              title="Muat ulang"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              <RefreshCw size={15} aria-hidden="true" />
            </button>
          </>
        }
      />

      {/* Code + Quick Actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kode Akses</p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-2xl font-black tracking-wider text-[#5841EA]">{exam.code}</span>
            <button onClick={copyCode} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Bagikan kode ini ke siswa</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Kontrol Ujian</p>
          <div className="flex flex-wrap gap-2">
            {exam.status === 'active' && waitingSessions.length > 0 && (
              <button onClick={() => openConfirm({ action: 'start', label: `Mulai ujian untuk ${waitingSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#4D38D4] disabled:opacity-50">
                {actionLoading === 'start' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Mulai Ujian ({waitingSessions.length})
              </button>
            )}
            {onBreakSessions.length > 0 && (
              <button onClick={() => openConfirm({ action: 'skip_break_all', label: `Skip istirahat untuk ${onBreakSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-4 py-2 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:opacity-50">
                {actionLoading === 'skip_break_all' ? <Loader2 size={12} className="animate-spin" /> : <SkipForward size={12} />}
                Skip Semua Istirahat ({onBreakSessions.length})
              </button>
            )}
            {heldResultSessions.length > 0 && (
              <button onClick={() => openConfirm({ action: 'release_results_all', label: `Rilis hasil untuk ${heldResultSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                {actionLoading === 'release_results_all' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Rilis Semua Hasil ({heldResultSessions.length})
              </button>
            )}
            {exam.status === 'active' ? (
              <button onClick={() => openConfirm({ action: 'deactivate', label: 'Nonaktifkan ujian ini?' })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-50">
                <Square size={12} /> Nonaktifkan
              </button>
            ) : exam.status === 'inactive' ? (
              <button onClick={() => openConfirm({ action: 'activate', label: 'Aktifkan ujian ini agar peserta bisa bergabung?' })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
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
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.03 }} className="rounded-2xl bg-white p-4 ring-1 ring-slate-100">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.bg}`}><Icon size={13} className={s.color} /></div>
              <p className="mt-2 font-display text-lg font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] text-slate-400">{s.label}</p>
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
              <h3 className="text-sm font-bold text-slate-700">Ruang Tunggu</h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{waitingSessions.length} siswa</span>
            </div>
            <button onClick={() => openConfirm({ action: 'start', label: `Mulai ujian untuk ${waitingSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#4D38D4] disabled:opacity-50">
              {actionLoading === 'start' ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Mulai Semua
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {waitingSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-600">
                  {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-700">{s.studentName ?? 'Siswa'}</p>
                  <p className="text-[10px] text-slate-400">Menunggu ujian dimulai</p>
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
              <h3 className="text-sm font-bold text-slate-700">Sedang Istirahat</h3>
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">{onBreakSessions.length} siswa</span>
            </div>
            <button onClick={() => openConfirm({ action: 'skip_break_all', label: `Skip istirahat untuk ${onBreakSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:opacity-50">
              <SkipForward size={12} /> Skip Semua
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {onBreakSessions.map(s => {
              const bEnd = s.breakEndsAt as Record<string, unknown> | null;
              const bSecs = (bEnd?._seconds ?? bEnd?.seconds) as number | undefined;
              const breakEnds = typeof bSecs === 'number' ? new Date(bSecs * 1000) : null;
              const remaining = breakEnds ? Math.max(0, Math.floor((breakEnds.getTime() - Date.now()) / 1000)) : 0;
              const mins = Math.floor(remaining / 60);
              const secs = remaining % 60;
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-600">
                    {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-700">{s.studentName ?? 'Siswa'}</p>
                    <p className="text-[10px] text-slate-400">
                      Stage {s.currentStage} · {s.stagePath?.map(p => DIFF_LABELS[p] ?? p).join(' → ') ?? '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      {mins}:{secs.toString().padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => openConfirm({ action: 'skip_break', label: `Skip istirahat untuk ${s.studentName}?`, target: s.id })}
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

      {/* Held Results */}
      {heldResultSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.23 }} className="rounded-2xl bg-white ring-1 ring-violet-200">
          <div className="flex items-center justify-between border-b border-violet-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50"><LockKeyhole size={12} className="text-violet-600" /></div>
              <h3 className="text-sm font-bold text-slate-700">Hasil Menunggu Rilis</h3>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">{heldResultSessions.length} siswa</span>
            </div>
            <button onClick={() => openConfirm({ action: 'release_results_all', label: `Rilis hasil untuk ${heldResultSessions.length} siswa?` })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4D38D4] disabled:opacity-50">
              <Send size={12} /> Rilis Semua
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {heldResultSessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                  {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-700">{s.studentName ?? 'Siswa'}</p>
                  <p className="text-[10px] text-slate-400">Ujian selesai · hasil belum terlihat oleh siswa</p>
                </div>
                <button onClick={() => openConfirm({ action: 'release_result', label: `Rilis hasil untuk ${s.studentName ?? 'siswa ini'}?`, target: s.id })} disabled={!!actionLoading} className="flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50">
                  <Send size={11} /> Rilis Hasil
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Config */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl bg-white p-5 ring-1 ring-slate-100">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Konfigurasi</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] text-slate-400">Durasi/Stage</p><p className="text-sm font-bold text-slate-700">{exam.durationPerStage} menit</p></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] text-slate-400">Istirahat</p><p className="text-sm font-bold text-slate-700">{exam.breakDuration} menit</p></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><p className="text-[10px] text-slate-400">Passing</p><p className="text-sm font-bold text-slate-700">{exam.passingThreshold}/12</p></div>
        </div>
      </motion.div>

      {/* All Participants */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-2xl bg-white ring-1 ring-slate-100">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-sm font-bold text-slate-700">Semua Peserta</h3>
          <span className="text-[11px] text-slate-400">{sessions.length} siswa</span>
        </div>
        {sessions.length === 0 ? (
          <AdminEmptyState icon={<Users size={24} />} title="Belum ada peserta" description="Peserta muncul di sini setelah memasukkan kode ujian." />
        ) : (
          <div className="divide-y divide-slate-50">
            {sessions.map(s => {
              const sCfg = SESSION_STATUS[s.status] ?? { label: s.status, color: 'text-slate-500', bg: 'bg-slate-50' };
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">
                    {s.studentName?.charAt(0).toUpperCase() ?? 'S'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-slate-700">{s.studentName ?? 'Siswa'}</p>
                    <p className="text-[10px] text-slate-400">
                      Stage {s.currentStage} · {s.stagePath?.map(p => DIFF_LABELS[p] ?? p).join(' → ') ?? '-'}
                    </p>
                  </div>
                  {s.finalScore !== null && <span className="text-sm font-bold text-slate-700">{s.finalScore}</span>}
                  {s.predikat && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-600">{s.predikat}</span>}
                  {s.status === 'completed' && (
                    s.resultsReleasedAt
                      ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Hasil dirilis</span>
                      : <button onClick={() => openConfirm({ action: 'release_result', label: `Rilis hasil untuk ${s.studentName ?? 'siswa ini'}?`, target: s.id })} disabled={!!actionLoading} className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200 hover:bg-violet-100 disabled:opacity-50">Rilis hasil</button>
                  )}
                  {(s.anomalyFlags?.length ?? 0) > 0 && (
                    <Link href="/admin/msat/anomalies" title={s.anomalyFlags?.join(', ')} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100">
                      Anomali {s.anomalyFlags?.length}
                    </Link>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${sCfg.bg} ${sCfg.color}`}>{sCfg.label}</span>
                  {(s.status === 'in_progress' || s.status === 'on_break') && (
                    <button
                      onClick={() => openConfirm({ action: 'terminate_session', label: `Hentikan paksa ujian ${s.studentName ?? 'peserta'}?`, target: s.id, needsReason: true })}
                      disabled={!!actionLoading}
                      className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 disabled:opacity-50"
                    >
                      Hentikan
                    </button>
                  )}
                  {s.status !== 'cancelled' && (
                    <button
                      onClick={() => openConfirm({ action: 'cancel_session', label: `Batalkan sesi ${s.studentName ?? 'peserta'}?`, target: s.id, needsReason: true })}
                      disabled={!!actionLoading}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Batalkan
                    </button>
                  )}
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
