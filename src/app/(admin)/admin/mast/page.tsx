'use client';

import { FC, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ClipboardList, Plus, RefreshCw, Loader2, Copy, Check,
  Users, Clock, ChevronRight, Settings2,
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

function fmtDate(iso: string | null | { toDate?: () => Date }) {
  if (!iso) return '—';
  const d = typeof iso === 'object' && 'toDate' in iso && iso.toDate ? iso.toDate() : new Date(iso as string);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface MASTExamListItem extends Omit<MASTExam, 'createdAt' | 'startedAt' | 'completedAt'> {
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  participantCount: number;
}

const AdminMASTListPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [exams, setExams] = useState<MASTExamListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchExams = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/mast-exams', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Gagal memuat data');
      const data = await res.json();
      setExams(data.exams ?? data ?? []);
    } catch {
      addToast('error', 'Gagal memuat daftar ujian MAST');
    } finally {
      setLoading(false);
    }
  }, [user, addToast]);

  useEffect(() => { fetchExams(); }, [fetchExams]);

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      addToast('error', 'Gagal menyalin kode');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Ujian MAST</h1>
            <p className="text-sm text-gray-500">Kelola ujian adaptif bertingkat MAST</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchExams}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-500 shadow-xs hover:bg-stone-50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <Link
            href="/admin/mast/create"
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus size={15} /> Buat Ujian Baru
          </Link>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white shadow-sm border border-stone-100 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] text-stone-400">
                <th className="px-5 py-3.5 text-left font-medium">Judul Ujian</th>
                <th className="px-3 py-3.5 text-left font-medium">Kode</th>
                <th className="px-3 py-3.5 text-left font-medium">Mode</th>
                <th className="px-3 py-3.5 text-left font-medium">Status</th>
                <th className="px-3 py-3.5 text-left font-medium">Peserta</th>
                <th className="px-3 py-3.5 text-left font-medium">Dibuat</th>
                <th className="px-3 py-3.5 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {exams.map((exam, i) => {
                const statusCfg = STATUS_CONFIG[exam.status] ?? STATUS_CONFIG.draft;
                const modeCfg = MODE_LABELS[exam.mode] ?? MODE_LABELS.auto_start;
                return (
                  <motion.tr
                    key={exam.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-stone-50/50 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/mast/${exam.id}`} className="group">
                        <p className="font-semibold text-gray-900 group-hover:text-violet-700 transition-colors">
                          {exam.title}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{exam.description}</p>
                      </Link>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <code className="rounded-lg bg-violet-50 px-2 py-1 font-mono text-[11px] font-bold text-violet-700">
                          {exam.examCode}
                        </code>
                        <button
                          onClick={() => copyCode(exam.examCode, exam.id)}
                          className="text-gray-300 hover:text-violet-500 transition-colors"
                          title="Salin kode"
                        >
                          {copiedId === exam.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${modeCfg.color}`}>
                        {modeCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-gray-400" />
                        <span className="font-bold text-gray-900">{exam.participantCount ?? 0}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-[10px] text-gray-400 whitespace-nowrap">
                      {fmtDate(exam.createdAt)}
                    </td>
                    <td className="px-3 py-3.5">
                      <Link
                        href={`/admin/mast/${exam.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-gray-500 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                      >
                        Detail <ChevronRight size={12} />
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
              {exams.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-50">
                        <ClipboardList size={28} className="text-stone-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-400">Belum ada ujian MAST</p>
                        <p className="text-xs text-gray-300 mt-1">Buat ujian baru untuk memulai</p>
                      </div>
                      <Link
                        href="/admin/mast/create"
                        className="mt-2 flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                      >
                        <Plus size={15} /> Buat Ujian Baru
                      </Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Summary strip */}
      {exams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {[
            { label: 'Total Ujian', value: exams.length, icon: ClipboardList, color: 'text-violet-600', bg: 'bg-violet-50' },
            { label: 'Draft', value: exams.filter(e => e.status === 'draft').length, icon: Settings2, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Berlangsung', value: exams.filter(e => e.status === 'in_progress' || e.status === 'active').length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Peserta', value: exams.reduce((sum, e) => sum + (e.participantCount ?? 0), 0), icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={`rounded-2xl ${s.bg} p-4`}>
                <div className="mb-2 inline-flex rounded-xl p-2 bg-white/60">
                  <Icon size={16} className={s.color} />
                </div>
                <p className="font-display text-2xl font-black text-gray-900">{s.value}</p>
                <p className="text-[11px] font-semibold text-gray-600">{s.label}</p>
              </div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default AdminMASTListPage;
