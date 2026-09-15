'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard, Loader2, CheckCircle2, AlertCircle, ArrowRight, Package,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';

interface TokenRecord {
  id: string;
  status: 'active' | 'used' | 'expired';
  purchasedAt: { _seconds: number } | null;
  usedAt: { _seconds: number } | null;
  amount: number;
}

const PACKAGES = [
  { quantity: 1, price: 25000, label: '1 Token', discount: null },
  { quantity: 5, price: 100000, label: '5 Token', discount: 'Hemat 20%' },
  { quantity: 10, price: 175000, label: '10 Token', discount: 'Hemat 30%' },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: 'Aktif', color: 'text-emerald-700 bg-emerald-50' },
  used: { label: 'Terpakai', color: 'text-gray-600 bg-gray-100' },
  expired: { label: 'Kedaluwarsa', color: 'text-red-600 bg-red-50' },
};

function formatDate(ts: { _seconds: number } | null): string {
  if (!ts) return '-';
  return new Date(ts._seconds * 1000).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

const ExamTokensPage: FC = () => {
  const { user, examUser, refreshProfile } = useExamAuth();
  const [tokens, setTokens] = useState<TokenRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const tokenBalance = examUser?.tokenBalance ?? 0;

  const fetchTokens = useCallback(async () => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/exam/tokens', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTokens(); }, [fetchTokens]);

  const handleBuy = async (quantity: number, amount: number) => {
    if (!user) return;
    setError('');
    setSuccess('');
    setBuying(quantity);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/exam/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ quantity, amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal membeli token');
      }
      await refreshProfile();
      await fetchTokens();
      setSuccess(`${quantity} token berhasil dibeli.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Token Ujian</h1>
      <p className="mt-1 text-sm text-[#5B6475]">
        Token digunakan untuk mengikuti ujian. Setiap ujian menghabiskan 1 token.
      </p>

      {/* Token balance */}
      <div className="mt-6 flex items-center gap-4 rounded-lg bg-white p-5 ring-1 ring-[#DCE5F2]">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F0EDFF]">
          <CreditCard size={22} className="text-[#6320EE]" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#5B6475]">Token Aktif</p>
          <p className="font-display text-3xl font-extrabold text-[#0E1E47]">{tokenBalance}</p>
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

      {/* Packages */}
      <div className="mt-8">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Paket Token</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {PACKAGES.map((pkg) => {
            const isBuying = buying === pkg.quantity;
            return (
              <button key={pkg.quantity} onClick={() => handleBuy(pkg.quantity, pkg.price)}
                disabled={buying !== null}
                className="rounded-lg bg-white p-5 text-left ring-1 ring-[#DCE5F2] transition-all hover:ring-[#6320EE]/40 disabled:opacity-50">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-[#6320EE]" />
                  <span className="text-sm font-bold text-[#0E1E47]">{pkg.label}</span>
                </div>
                <p className="mt-2 font-display text-xl font-extrabold text-[#0E1E47]">
                  {formatCurrency(pkg.price)}
                </p>
                {pkg.discount && (
                  <span className="mt-1 inline-block rounded bg-[#6320EE]/5 px-2 py-0.5 text-[10px] font-bold text-[#6320EE]">
                    {pkg.discount}
                  </span>
                )}
                <div className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-[#6320EE] py-2 text-xs font-bold text-white">
                  {isBuying ? <Loader2 size={13} className="animate-spin" /> : null}
                  {isBuying ? 'Memproses...' : 'Pilih'}
                </div>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[#9CA3AF]">
          Pembayaran diproses secara instan. Token langsung masuk setelah pembelian.
        </p>
      </div>

      {/* History */}
      <div className="mt-10">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Riwayat Pembelian</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={18} className="animate-spin text-[#9CA3AF]" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="rounded-lg bg-white py-10 text-center ring-1 ring-[#DCE5F2]">
            <CreditCard size={20} className="mx-auto text-[#9CA3AF]" />
            <p className="mt-2 text-sm text-[#5B6475]">Belum ada pembelian</p>
            <p className="text-xs text-[#9CA3AF]">Pilih paket di atas untuk membeli token.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg bg-white ring-1 ring-[#DCE5F2]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#DCE5F2] bg-[#F8F7FF]">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#5B6475]">Tanggal</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#5B6475]">Harga</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#5B6475]">Status</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => {
                  const st = STATUS_LABEL[t.status] ?? STATUS_LABEL.active;
                  return (
                    <tr key={t.id} className="border-b border-[#DCE5F2] last:border-0">
                      <td className="px-4 py-3 text-[#0E1E47]">{formatDate(t.purchasedAt)}</td>
                      <td className="px-4 py-3 text-[#0E1E47]">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
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