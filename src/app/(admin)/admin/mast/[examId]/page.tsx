'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Loader2, Copy, Check, Pencil, Trash2, Play,
  Users, Clock, BarChart3, Coffee, Trophy, Settings2, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import type { MASTExam, MASTExamStatus, MASTExamMode } from '@/types/mast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MASTExamStatus, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: 'bg-amber-50 text-amber-700' },
  active:      { label: 'Aktif',       color: 'bg-emerald-50 text-emerald-700' },
  in_progress: { label: 'Berlangsung', color: 'bg-blue-50 text-blue-700' },
  completed:   { label: 'Selesai',     color: 'bg-gray-100 text-gray-600' },
  archived:    { label: 'Arsip',       color: 'bg-stone-100 text-stone-500' },
};

const MODE_LABELS: Record<MASTExamMode, { label: string; color: string }> = {
  auto_start:   { label: 'Otomatis',  color: 'bg-violet-50 text-violet-700' },
  manual_start: { label: 'Manual',    color: 'bg-sky-50 text-sky-700' },
};

interface MASTExamDetail extends MASTExam {
  participantCount: number;
  avgScore: number | null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const AdminMASTDetailPage: FC = () => {
  const router = useRouter();
  const params = useParams();
  const examId = params.examId as string;
  const { user } = useAuth();
  const { addToast } = useToast();

  const [exam, setExam] = useState<MASTExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchExam = useCallback(async () => {
    if (!user || !examId) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setExam(data.exam ?? data);
    } catch {
      addToast('error', 'Gagal memuat detail ujian');
    } finally {
      setLoading(false);
    }
  }, [user, examId, addToast]);

  useEffect(() => { fetchExam(); }, [fetchExam]);

  const copyCode = async () => {
    if (!exam) return;
    try {
      await navigator.clipboard.writeText(exam.examCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      addToast('error', 'Gagal menyalin kode');
    }
  };

  const handleActivate = async () => {
    if (!user || !exam) return;
    if (!confirm('Aktifkan ujian ini? Siswa akan bisa join menggunakan kode ujian.')) return;
    setActivating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!res.ok) throw new Error('Gagal mengaktifkan ujian');
      addToast('success', 'Ujian berhasil diaktifkan');
      await fetchExam();
    } catch {
      addToast('error', 'Gagal mengaktifkan ujian');
    } finally {
      setActivating(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !exam) return;
    if (!confirm('Hapus ujian ini secara permanen? Tindakan ini tidak dapat dibatalkan.')) return;
    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/mast-exams/${examId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal menghapus ujian');
      addToast('success', 'Ujian berhasil dihapus');
      router.push('/admin/mast');
    } catch {
      addToast('error', 'Gagal menghapus ujian');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-gray-500">Ujian tidak ditemukan</p>
        <Link href="/admin/mast" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          Kembali ke daftar
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.draft;
  const modeCfg = MODE_LABELS[exam.mode] ?? MODE_LABELS.auto_start;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Link
            href="/admin/mast"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-extrabold text-gray-900">{exam.title}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>
                {statusCfg.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{exam.description || 'Tidak ada deskripsi'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchExam}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-xs hover:bg-stone-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {exam.status === 'draft' && (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {activating ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Aktifkan
            </button>
          )}
          <Link
            href={`/admin/mast/${examId}/edit`}
            className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-600 hover:bg-stone-50"
          >
            <Pencil size={14} /> Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Hapus
          </button>
        </div>
      </motion.div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Exam Code */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Kode Ujian</p>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xl font-bold tracking-widest text-violet-700">{exam.examCode}</code>
            <button
              onClick={copyCode}
              className="text-gray-300 hover:text-violet-500 transition-colors"
              title="Salin kode"
            >
              {codeCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            </button>
          </div>
        </motion.div>

        {/* Mode */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Mode</p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${modeCfg.color}`}>
            {modeCfg.label}
          </span>
          <p className="mt-1 text-[10px] text-gray-400">
            {exam.mode === 'auto_start' ? 'Langsung mulai' : 'Menunggu admin'}
          </p>
        </motion.div>

        {/* Duration */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Durasi</p>
          <p className="font-display text-xl font-black text-gray-900">{exam.durationPerStage}m</p>
          <p className="text-[10px] text-gray-400">per stage · {exam.breakDuration}m istirahat</p>
        </motion.div>

        {/* Participants */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-white p-5 shadow-sm border border-stone-100"
        >
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-gray-400">Peserta</p>
          <p className="font-display text-xl font-black text-gray-900">{exam.participantCount ?? 0}</p>
          <p className="text-[10px] text-gray-400">siswa terdaftar</p>
        </motion.div>
      </div>

      {/* Real-time Stats Placeholder */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-white p-6 shadow-sm border border-stone-100"
      >
        <h2 className="mb-4 text-sm font-bold text-gray-900">Statistik Real-time</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl bg-stone-50 p-4 text-center">
            <Users size={20} className="mx-auto mb-2 text-blue-500" />
            <p className="font-display text-2xl font-black text-gray-900">{exam.participantCount ?? 0}</p>
            <p className="text-[11px] text-gray-500">Peserta</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-4 text-center">
            <BarChart3 size={20} className="mx-auto mb-2 text-emerald-500" />
            <p className="font-display text-2xl font-black text-gray-900">
              {exam.avgScore !== null && exam.avgScore !== undefined ? exam.avgScore.toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-gray-500">Rata-rata Skor</p>
          </div>
          <div className="rounded-xl bg-stone-50 p-4 text-center">
            <Trophy size={20} className="mx-auto mb-2 text-amber-500" />
            <p className="font-display text-2xl font-black text-gray-900">{exam.totalStages}</p>
            <p className="text-[11px] text-gray-500">Total Stage</p>
          </div>
        </div>
      </motion.div>

      {/* Navigation Links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 gap-3 lg:grid-cols-3"
      >
        {[
          {
            title: 'Ruang Tunggu',
            desc: 'Monitor siswa yang sudah join dan mulai ujian',
            icon: Users,
            href: `/admin/mast/${examId}/waiting-room`,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            enabled: exam.mode === 'manual_start',
          },
          {
            title: 'Monitor Istirahat',
            desc: 'Pantau siswa yang sedang istirahat antar stage',
            icon: Coffee,
            href: `/admin/mast/${examId}/breaks`,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            enabled: true,
          },
          {
            title: 'Rekap Hasil',
            desc: 'Lihat skor, predikat, dan analisis hasil ujian',
            icon: Trophy,
            href: `/admin/mast/${examId}/results`,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            enabled: true,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              href={item.href}
              className={`group rounded-2xl bg-white p-5 shadow-sm border border-stone-100 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                !item.enabled ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`rounded-xl p-2.5 ${item.bg}`}>
                  <Icon size={18} className={item.color} />
                </div>
                <span className="text-xs text-gray-400 group-hover:text-violet-600 transition-colors">
                  Buka →
                </span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-gray-900">{item.title}</h3>
              <p className="mt-1 text-xs text-gray-500">{item.desc}</p>
              {!item.enabled && (
                <p className="mt-2 text-[10px] font-medium text-amber-600">Hanya untuk mode manual</p>
              )}
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
};

export default AdminMASTDetailPage;
