'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar, Clock, Users, FileText, Loader2,
  AlertCircle, CheckCircle2, ArrowRight, Package, CreditCard,
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

interface TokenRecord {
  id: string;
  status: 'active' | 'used' | 'expired';
  purchasedAt: { _seconds: number } | null;
  amount: number;
}

const SESSION_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  waiting: { label: 'Menunggu', color: 'text-amber-700', bg: 'bg-amber-50 ring-amber-200' },
  in_progress: { label: 'Sedang Berlangsung', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  on_break: { label: 'Istirahat', color: 'text-blue-700', bg: 'bg-blue-50 ring-blue-200' },
  completed: { label: 'Selesai', color: 'text-emerald-700', bg: 'bg-emerald-50 ring-emerald-200' },
};

const TOKEN_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'text-emerald-700 bg-emerald-50' },
  used: { label: 'Terpakai', color: 'text-gray-600 bg-gray-100' },
  expired: { label: 'Kedaluwarsa', color: 'text-red-600 bg-red-50' },
};

const PACKAGES = [
  { quantity: 1, price: 25000, label: '1 Token', discount: null },
  { quantity: 5, price: 100000, label: '5 Token', discount: 'Hemat 20%' },
  { quantity: 10, price: 175000, label: '10 Token', discount: 'Hemat 30%' },
];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function formatDate(ts: { _seconds: number } | null): string {
  if (!ts) return '-';
  return new Date(ts._seconds * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ExamTokensPage: FC = () => {
  const router = useRouter();
  const { user, examUser, refreshProfile } = useExamAuth();
  const [exams, setExams] = useState<ScheduledExam[]>([]);
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tokenBalance = examUser?.tokenBalance ?? 0;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const [examRes, tokenRes] = await Promise.all([
        fetch('/api/exam/scheduled', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/exam/tokens', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (examRes.ok) { const d = await examRes.json(); setExams(d.exams ?? []); }
      if (tokenRes.ok) { const d = await tokenRes.json(); setTokens(d.tokens ?? []); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoin = async (exam: ScheduledExam) => {
    if (!user) return;
    setError('');
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
      if (!res.ok) { setError(data.error || 'Gagal bergabung'); setJoining(null); return; }
      if (data.status === 'in_progress') router.push(`/exam/session/${data.sessionId}`);
      else router.push('/exam');
    } catch { setError('Terjadi kesalahan.'); }
    setJoining(null);
  };

  const handleBuy = async (quantity: number, amount: number) => {
    if (!user) return;
    setError(''); setSuccess('');
    setBuying(quantity);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/exam/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ quantity, amount }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Gagal membeli'); }
      await refreshProfile();
      await fetchData();
      setSuccess(`${quantity} token berhasil dibeli.`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Terjadi kesalahan.'); }
    setBuying(null);
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
      <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Ujian & Token</h1>
      <p className="mt-1 text-sm text-[#5B6475]">
        Daftar ujian terjadwal dan kelola token ujian kamu.
      </p>

      {/* Token balance card */}
      <div className="mt-6 rounded-lg bg-[#F0EDFF] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6320EE]/10">
              <CreditCard size={18} className="text-[#6320EE]" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#7C6BC4]">Token Aktif</p>
              <p className="font-display text-2xl font-extrabold text-[#3B2F6B]">{tokenBalance}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Scheduled Exams ── */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7C6BC4]">Ujian Terjadwal</h2>

        {exams.length === 0 ? (
          <div className="rounded-lg bg-[#F8F7FF] py-10 text-center ring-1 ring-[#E5E0F5]">
            <Calendar size={24} className="mx-auto text-[#9B8FC7]" />
            <p className="mt-3 text-sm font-semibold text-[#5B6475]">Belum ada ujian terjadwal</p>
            <p className="mt-1 text-xs text-[#9CA3AF]">Ujian akan muncul setelah admin menjadwalkannya.</p>
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
                const cfg = SESSION_STATUS[exam.sessionStatus];
                if (cfg) { statusLabel = cfg.label; statusColor = `${cfg.color} ${cfg.bg}`; }
              }

              return (
                <div key={exam.id} className="rounded-lg bg-white p-4 ring-1 ring-[#E5E0F5]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-[#0E1E47] truncate">{exam.title}</h3>
                        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ring-1 ${statusColor}`}>{statusLabel}</span>
                      </div>
                      {exam.description && <p className="mt-1 text-xs text-[#5B6475] line-clamp-1">{exam.description}</p>}
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-[#9CA3AF]">
                        <span className="flex items-center gap-1"><FileText size={11} /> {totalQ} soal</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {totalTime} menit</span>
                        <span className="flex items-center gap-1"><Users size={11} /> {exam.totalStages} stage</span>
                      </div>
                    </div>
                    {exam.enrolled ? (
                      <button onClick={() => handleJoin(exam)} disabled={isJoining}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#6320EE] px-3.5 py-2 text-[11px] font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40">
                        {isJoining ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                        Lanjutkan
                      </button>
                    ) : (
                      <button onClick={() => handleJoin(exam)} disabled={isJoining}
                        className="shrink-0 flex items-center gap-1.5 rounded-lg bg-[#F0EDFF] px-3.5 py-2 text-[11px] font-bold text-[#6320EE] ring-1 ring-[#DCCFFC] transition-colors hover:bg-[#E2D9FC] disabled:opacity-40">
                        {isJoining ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
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

      {/* ── Buy Tokens ── */}
      <div className="mt-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#C4944A]">Beli Token</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACKAGES.map((pkg) => {
            const isBuying = buying === pkg.quantity;
            return (
              <button key={pkg.quantity} onClick={() => handleBuy(pkg.quantity, pkg.price)}
                disabled={buying !== null}
                className="rounded-lg bg-[#FFF9EE] p-4 text-left ring-1 ring-[#F0D9A8] transition-all hover:ring-[#D4AA6B] disabled:opacity-50">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-[#C4944A]" />
                  <span className="text-sm font-bold text-[#6B4E1E]">{pkg.label}</span>
                </div>
                <p className="mt-1.5 font-display text-lg font-extrabold text-[#3B2F6B]">{formatCurrency(pkg.price)}</p>
                {pkg.discount && (
                  <span className="mt-1 inline-block rounded bg-[#C4944A]/10 px-2 py-0.5 text-[10px] font-bold text-[#C4944A]">{pkg.discount}</span>
                )}
                <div className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#C4944A] py-2 text-[11px] font-bold text-white">
                  {isBuying ? <Loader2 size={12} className="animate-spin" /> : null}
                  {isBuying ? 'Memproses...' : 'Pilih'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Token History ── */}
      {tokens.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Riwayat Token</h2>
          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-[#E5E0F5]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E0F5] bg-[#F8F7FF]">
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7C6BC4]">Tanggal</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7C6BC4]">Harga</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#7C6BC4]">Status</th>
                </tr>
              </thead>
              <tbody>
                {tokens.slice(0, 10).map((t) => {
                  const st = TOKEN_STATUS[t.status] ?? TOKEN_STATUS.active;
                  return (
                    <tr key={t.id} className="border-b border-[#F0EDF5] last:border-0">
                      <td className="px-4 py-2.5 text-[#0E1E47]">{formatDate(t.purchasedAt)}</td>
                      <td className="px-4 py-2.5 text-[#0E1E47]">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-2.5"><span className={`rounded px-2 py-0.5 text-[10px] font-bold ${st.color}`}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamTokensPage;