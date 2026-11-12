'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Loader2, AlertCircle, CheckCircle2, Package, CreditCard,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';

interface TokenRecord {
  id: string;
  status: 'active' | 'used' | 'expired';
  purchasedAt: { _seconds: number } | null;
  amount: number;
}

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

function formatDate(ts: unknown): string {
  if (!ts) return '-';
  const o = ts as Record<string, unknown>;
  const secs = (o._seconds ?? o.seconds) as number | undefined;
  if (typeof secs === 'number') return new Date(secs * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ExamTokensPage: FC = () => {
  const { user, examUser, refreshProfile } = useExamAuth();
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tokenBalance = examUser?.tokenBalance ?? 0;

  const fetchTokens = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/exam/tokens', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const d = await res.json();
        setTokens(d.tokens ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);
  useLivePoll(fetchTokens);

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
      await fetchTokens();
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
      <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Token Ujian</h1>
      <p className="mt-1 text-sm text-[#5B6475]">
        Beli dan kelola token untuk mengikuti ujian.
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

      {/* Buy Tokens */}
      <div className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#7C6BC4]">Beli Token</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACKAGES.map((pkg) => {
            const isBuying = buying === pkg.quantity;
            const isFeatured = pkg.quantity === 5;
            return (
              <button key={pkg.quantity} onClick={() => handleBuy(pkg.quantity, pkg.price)}
                disabled={buying !== null}
                className={`relative rounded-lg p-5 text-left transition-all disabled:opacity-50 ${
                  isFeatured
                    ? 'bg-[#6320EE] text-white shadow-md shadow-[#6320EE]/20 ring-2 ring-[#6320EE]'
                    : 'bg-[#F0EDFF] ring-1 ring-[#DCCFFC] hover:ring-[#6320EE]/40'
                }`}>
                {pkg.discount && (
                  <span className={`absolute -top-2 right-3 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    isFeatured ? 'bg-white text-[#6320EE]' : 'bg-[#6320EE] text-white'
                  }`}>
                    {pkg.discount}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <Package size={14} className={isFeatured ? 'text-white/70' : 'text-[#6320EE]'} />
                  <span className={`text-sm font-bold ${isFeatured ? 'text-white' : 'text-[#3B2F6B]'}`}>{pkg.label}</span>
                </div>
                <p className={`mt-2 font-display text-xl font-extrabold ${isFeatured ? 'text-white' : 'text-[#1a1040]'}`}>
                  {formatCurrency(pkg.price)}
                </p>
                <p className={`text-[11px] ${isFeatured ? 'text-white/60' : 'text-[#9B8FC7]'}`}>
                  {formatCurrency(Math.round(pkg.price / pkg.quantity))}/token
                </p>
                <div className={`mt-4 flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[11px] font-bold transition-colors ${
                  isFeatured
                    ? 'bg-white text-[#6320EE] hover:bg-white/90'
                    : 'bg-[#6320EE] text-white hover:bg-[#5218C7]'
                }`}>
                  {isBuying ? <Loader2 size={12} className="animate-spin" /> : null}
                  {isBuying ? 'Memproses...' : 'Pilih'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Token History */}
      <div className="mt-10">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Riwayat Token</h2>
        {tokens.length === 0 ? (
          <EmptyState
            compact
            tone="violet"
            icon={<CreditCard size={28} />}
            title="Belum ada riwayat token"
            description="Token yang ditambahkan ke akunmu akan tercatat di sini."
          />
        ) : (
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
                {tokens.slice(0, 10).map((t) => { // batas 10 data terakhir
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
        )}
      </div>
    </div>
  );
};

export default ExamTokensPage;
