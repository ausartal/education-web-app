'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle, History, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminSection } from '@/components/admin/AdminUI';

interface PaywallResponse {
  state: { enabled: boolean; updatedAtMs: number | null; updatedByName: string | null };
  history: Array<{
    id: string; actorId: string; actorName: string; actorEmail: string;
    from: boolean; to: boolean; reason: string; ip: string; atMs: number | null;
  }>;
}

const formatTime = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export function TokenPaywallPanel() {
  const { user } = useAuth();
  const { data, mutate } = useAuthSWR<PaywallResponse>('/api/admin/token-paywall');
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const enabled = data?.state.enabled ?? false;
  const target = !enabled;

  const close = () => { setConfirming(false); setReason(''); setError(''); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/token-paywall', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: target, reason }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Gagal mengubah pengaturan');
      await mutate(body, { revalidate: false });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah pengaturan');
    }
    setSaving(false);
  };

  return (
    <>
      <AdminSection title="Token berbayar" description="Saat menyala, peserta exam memakai 1 token setiap kali mengikuti ujian MSAT. Saat mati, ujian gratis dan tidak ada potongan.">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <span className={`h-2.5 w-2.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              {data ? (enabled ? 'Menyala' : 'Mati') : 'Memuat...'}
            </p>
            {data?.state.updatedAtMs && (
              <p className="mt-1 text-xs text-slate-500">Terakhir diubah {formatTime(data.state.updatedAtMs)}{data.state.updatedByName ? ` oleh ${data.state.updatedByName}` : ''}</p>
            )}
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Token berbayar"
            disabled={!data}
            onClick={() => setConfirming(true)}
            className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        <div className="border-t border-slate-100 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-bold text-slate-700"><History size={14} /> Riwayat perubahan</h3>
          {!data || data.history.length === 0 ? (
            <p className="text-xs text-slate-500">Belum ada perubahan.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-slate-500">
                  <tr><th className="py-2 pr-4 font-semibold">Waktu</th><th className="py-2 pr-4 font-semibold">Admin</th><th className="py-2 pr-4 font-semibold">Perubahan</th><th className="py-2 pr-4 font-semibold">Alasan</th><th className="py-2 font-semibold">IP</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {data.history.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap py-2 pr-4">{formatTime(row.atMs)}</td>
                      <td className="py-2 pr-4">{row.actorName || row.actorEmail || row.actorId}{row.actorName && row.actorEmail ? <span className="block text-slate-400">{row.actorEmail}</span> : null}</td>
                      <td className="whitespace-nowrap py-2 pr-4 font-semibold">{row.from ? 'Menyala' : 'Mati'} → {row.to ? 'Menyala' : 'Mati'}</td>
                      <td className="py-2 pr-4">{row.reason}</td>
                      <td className="whitespace-nowrap py-2 text-slate-400">{row.ip || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </AdminSection>

      {confirming && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) close(); }} onKeyDown={(event) => { if (event.key === 'Escape' && !saving) close(); }}>
          <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="paywall-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${target ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}><AlertTriangle size={18} /></div>
              <div>
                <h2 id="paywall-title" className="text-base font-bold text-slate-900">{target ? 'Nyalakan token berbayar?' : 'Matikan token berbayar?'}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {target
                    ? 'Mulai sekarang setiap peserta exam memakai 1 token untuk mengikuti ujian. Peserta tanpa saldo tidak bisa masuk.'
                    : 'Mulai sekarang peserta exam bisa mengikuti ujian tanpa token. Saldo yang ada tidak berubah.'}
                </p>
              </div>
            </div>
            <label htmlFor="paywall-reason" className="mb-1.5 mt-5 block text-xs font-semibold text-slate-600">Alasan (dicatat di log)</label>
            <textarea id="paywall-reason" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={200} placeholder="Contoh: Mulai gelombang ujian berbayar" className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60">Batal</button>
              <button type="submit" disabled={saving || reason.trim().length < 5} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${target ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-700 hover:bg-slate-800'}`}>
                {saving && <Loader2 size={14} className="animate-spin" />}
                {target ? 'Ya, nyalakan' : 'Ya, matikan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
