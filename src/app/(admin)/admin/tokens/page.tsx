'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Coins, Users, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSection, AdminSkeleton } from '@/components/admin/AdminUI';
import { MAX_ADJUSTMENT } from '@/lib/token-ledger';

interface TokenOverview {
  summary: {
    outstanding: number;
    holders: number;
    participants: number;
    last30Days: { granted: number; deducted: number; net: number };
    mockTokens: number;
    selfServicePurchases: boolean;
  };
  ledger: Array<{
    id: string; userId: string; userName: string; userEmail: string;
    delta: number; balanceAfter: number; reason: string; createdAtMs: number | null;
  }>;
}

interface Participant { id: string; displayName: string; email: string; tokenBalance?: number }

const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500';

export default function TokensPage() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useAuthSWR<TokenOverview>('/api/admin/tokens');
  const { data: people } = useAuthSWR<{ users: Participant[] }>('/api/admin/exam-users?limit=100');

  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Participant | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || picked) return [];
    return (people?.users ?? [])
      .filter((p) => `${p.displayName} ${p.email}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [people, search, picked]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !picked) return;
    setSaving(true);
    setFeedback(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/exam-users/${picked.id}/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ delta: Number(delta), reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal mengubah saldo');
      setFeedback({ ok: true, text: `Saldo ${picked.displayName} sekarang ${body.balance} token.` });
      setPicked(null);
      setSearch('');
      setDelta('');
      setReason('');
      await mutate();
    } catch (err) {
      setFeedback({ ok: false, text: err instanceof Error ? err.message : 'Gagal mengubah saldo' });
    }
    setSaving(false);
  };

  if (isLoading) return <div className="mx-auto max-w-[1200px] overflow-hidden rounded-xl border border-slate-200 bg-white"><AdminSkeleton rows={6} /></div>;
  if (error || !data) return <AdminErrorState onRetry={() => { void mutate(); }} />;

  const { summary, ledger } = data;
  const deltaNumber = Number(delta);
  const canSubmit = !!picked && Number.isInteger(deltaNumber) && deltaNumber !== 0 && reason.trim().length >= 5 && !saving;

  const cards = [
    { icon: Coins, color: 'text-indigo-700', value: summary.outstanding.toLocaleString('id-ID'), label: 'Token beredar (saldo peserta)' },
    { icon: Users, color: 'text-violet-700', value: `${summary.holders} / ${summary.participants}`, label: 'Peserta yang memegang token' },
    { icon: TrendingUp, color: 'text-emerald-700', value: `${summary.last30Days.net >= 0 ? '+' : ''}${summary.last30Days.net}`, label: `30 hari: +${summary.last30Days.granted} / -${summary.last30Days.deducted} penyesuaian admin` },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
      <AdminPageHeader icon={<Coins size={22} />} eyebrow="AKURAT Exam" title="Token Peserta" description="Lihat saldo token, sesuaikan saldo dengan alasan yang tercatat, dan tinjau riwayat perubahan." />

      <section className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ icon: Icon, color, value, label }) => (
          <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <Icon size={18} className={color} aria-hidden="true" />
            <p className="mt-4 text-3xl font-extrabold text-slate-900">{value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
          </article>
        ))}
      </section>

      <div className={`flex gap-3 rounded-xl border p-4 ${summary.selfServicePurchases ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <ShieldCheck size={18} className={`mt-0.5 shrink-0 ${summary.selfServicePurchases ? 'text-amber-700' : 'text-emerald-700'}`} aria-hidden="true" />
        <div>
          <p className={`text-sm font-bold ${summary.selfServicePurchases ? 'text-amber-900' : 'text-emerald-900'}`}>
            {summary.selfServicePurchases ? 'Pembelian mandiri aktif tanpa pembayaran' : 'Pembelian mandiri dinonaktifkan'}
          </p>
          <p className={`mt-1 text-xs leading-5 ${summary.selfServicePurchases ? 'text-amber-800' : 'text-emerald-800'}`}>
            {summary.selfServicePurchases
              ? 'Peserta bisa menambah token sendiri tanpa membayar. Ini hanya untuk pengembangan; matikan sebelum token dipakai untuk menarik biaya.'
              : 'Peserta tidak bisa menambah token sendiri. Penambahan dilakukan admin di bawah sampai penyedia pembayaran terhubung.'}
            {summary.mockTokens > 0 && ` Ada ${summary.mockTokens} token dari pembelian uji (mock) yang tercatat.`}
          </p>
        </div>
      </div>

      <AdminSection title="Sesuaikan saldo" description={`Perubahan maksimal ${MAX_ADJUSTMENT} token per tindakan. Peserta menerima notifikasi dan perubahan masuk audit log.`}>
        <form onSubmit={submit} className="grid gap-4 p-5 md:grid-cols-[1.2fr_0.5fr_1.4fr_auto] md:items-end">
          <div className="relative">
            <label htmlFor="participant" className="mb-1.5 block text-xs font-semibold text-slate-600">Peserta</label>
            {picked ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm">
                <span className="truncate"><strong>{picked.displayName}</strong> <span className="text-slate-500">· saldo {picked.tokenBalance ?? 0}</span></span>
                <button type="button" onClick={() => setPicked(null)} className="ml-2 text-xs font-semibold text-indigo-700 hover:underline">Ganti</button>
              </div>
            ) : (
              <input id="participant" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama atau email" autoComplete="off" className={inputClass} />
            )}
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {matches.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setPicked(p); setSearch(''); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50">
                      <span className="font-semibold text-slate-800">{p.displayName}</span>
                      <span className="block text-xs text-slate-500">{p.email} · saldo {p.tokenBalance ?? 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="delta" className="mb-1.5 block text-xs font-semibold text-slate-600">Jumlah (+/−)</label>
            <input id="delta" type="number" value={delta} onChange={(e) => setDelta(e.target.value)} step={1} min={-MAX_ADJUSTMENT} max={MAX_ADJUSTMENT} placeholder="5" className={inputClass} />
          </div>
          <div>
            <label htmlFor="reason" className="mb-1.5 block text-xs font-semibold text-slate-600">Alasan</label>
            <input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Contoh: Kompensasi gangguan jaringan saat ujian" className={inputClass} />
          </div>
          <button type="submit" disabled={!canSubmit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
        {feedback && (
          <p role={feedback.ok ? 'status' : 'alert'} className={`px-5 pb-4 text-sm font-medium ${feedback.ok ? 'text-emerald-700' : 'text-rose-600'}`}>{feedback.text}</p>
        )}
      </AdminSection>

      <AdminSection title="Riwayat penyesuaian" description="200 perubahan terakhir oleh administrator.">
        {ledger.length === 0 ? (
          <AdminEmptyState title="Belum ada penyesuaian" description="Perubahan saldo oleh admin akan tercatat di sini." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <tr><th className="px-5 py-3">Waktu</th><th className="px-4 py-3">Peserta</th><th className="px-4 py-3 text-right">Perubahan</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Alasan</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">{entry.createdAtMs ? new Date(entry.createdAtMs).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td className="px-4 py-3"><p className="text-sm font-semibold text-slate-800">{entry.userName || entry.userId}</p><p className="text-xs text-slate-500">{entry.userEmail}</p></td>
                    <td className={`px-4 py-3 text-right text-sm font-bold tabular-nums ${entry.delta > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{entry.delta > 0 ? '+' : ''}{entry.delta}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-slate-600">{entry.balanceAfter}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{entry.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminSection>
    </div>
  );
}
