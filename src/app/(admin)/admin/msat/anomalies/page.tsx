'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, ExternalLink, RotateCcw, ShieldAlert, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { AdminEmptyState, AdminErrorState, AdminPageHeader, AdminSection, AdminSkeleton } from '@/components/admin/AdminUI';
import {
  describeFlag,
  filterAnomalies,
  reviewState,
  type AnomalyItem,
  type ReviewState,
  type Severity,
} from '@/lib/anomaly';

interface AnomalyResponse {
  items: AnomalyItem[];
  exams: Array<{ id: string; title: string }>;
}

const STATE_TABS: Array<{ value: ReviewState | 'all'; label: string }> = [
  { value: 'pending', label: 'Perlu ditinjau' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'dismissed', label: 'Diabaikan' },
  { value: 'all', label: 'Semua' },
];

const SEVERITY_STYLE: Record<Severity, { label: string; className: string }> = {
  high: { label: 'Tinggi', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  medium: { label: 'Sedang', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  low: { label: 'Rendah', className: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export default function AnomaliesPage() {
  const { user } = useAuth();
  const { data, error, isLoading, mutate } = useAuthSWR<AnomalyResponse>('/api/admin/msat/anomalies');
  const [state, setState] = useState<ReviewState | 'all'>('pending');
  const [severity, setSeverity] = useState<Severity | 'all'>('all');
  const [examId, setExamId] = useState('');
  const [query, setQuery] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const items = useMemo(
    () => filterAnomalies(data?.items ?? [], { state, severity, examId: examId || undefined, query }),
    [data, state, severity, examId, query],
  );
  const pendingCount = (data?.items ?? []).filter((i) => reviewState(i.review) === 'pending').length;

  const submit = async (id: string, verdict: 'dismissed' | 'confirmed' | 'reopen', text = '') => {
    if (!user) return;
    setBusy(id);
    setMessage('');
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/msat/anomalies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verdict, note: text }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Gagal menyimpan keputusan');
      setNoteFor(null);
      setNote('');
      await mutate();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menyimpan keputusan');
    }
    setBusy(null);
  };

  if (isLoading) return <div className="mx-auto max-w-[1200px] overflow-hidden rounded-xl border border-slate-200 bg-white"><AdminSkeleton rows={6} /></div>;
  if (error || !data) return <AdminErrorState onRetry={() => { void mutate(); }} />;

  const inputClass = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500';

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 pb-10">
      <AdminPageHeader
        eyebrow="AKURAT Exam"
        icon={<ShieldAlert size={22} />}
        title="Anomali Ujian"
        description="Sesi yang ditandai sistem: terlalu cepat, terlambat mengirim, skor turun mendadak, atau dihentikan. Tinjau lalu putuskan."
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Status tinjauan">
          {STATE_TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={state === tab.value}
              onClick={() => setState(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${state === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
              {tab.value === 'pending' && pendingCount > 0 && <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-700">{pendingCount}</span>}
            </button>
          ))}
        </div>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity | 'all')} className={inputClass} aria-label="Tingkat keparahan">
          <option value="all">Semua tingkat</option>
          <option value="high">Tinggi</option>
          <option value="medium">Sedang</option>
          <option value="low">Rendah</option>
        </select>
        <select value={examId} onChange={(e) => setExamId(e.target.value)} className={inputClass} aria-label="Ujian">
          <option value="">Semua ujian</option>
          {data.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
        </select>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari peserta atau ujian" className={`${inputClass} min-w-[200px] flex-1`} />
      </div>

      {message && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>}

      <AdminSection title={`${items.length} sesi`} description="Diurutkan dari yang paling serius dan terbaru. Yang sudah ditinjau berada di bawah.">
        {items.length === 0 ? (
          <AdminEmptyState title="Tidak ada anomali" description="Tidak ada sesi yang cocok dengan filter ini." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const sev = SEVERITY_STYLE[item.severity];
              const rs = reviewState(item.review);
              const open = noteFor === item.id;
              return (
                <li key={item.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <ShieldAlert size={18} className={item.severity === 'high' ? 'mt-0.5 text-rose-500' : 'mt-0.5 text-amber-500'} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.studentName}
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${sev.className}`}>{sev.label}</span>
                        {rs !== 'pending' && (
                          <span className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${rs === 'confirmed' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {rs === 'confirmed' ? 'Dikonfirmasi' : 'Diabaikan'}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">{item.examTitle}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.flags.map((flag) => (
                          <span key={flag} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">{describeFlag(flag).label}</span>
                        ))}
                      </div>
                      {item.review?.note && <p className="mt-2 text-xs italic text-slate-500">Catatan: {item.review.note}</p>}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/msat/${item.examId}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                        Buka ujian <ExternalLink size={12} />
                      </Link>
                      {rs === 'pending' ? (
                        <>
                          <button onClick={() => submit(item.id, 'dismissed')} disabled={busy === item.id} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
                            <Check size={12} /> Abaikan
                          </button>
                          <button onClick={() => { setNoteFor(open ? null : item.id); setNote(''); }} className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100">
                            <X size={12} /> Konfirmasi
                          </button>
                        </>
                      ) : (
                        <button onClick={() => submit(item.id, 'reopen')} disabled={busy === item.id} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                          <RotateCcw size={12} /> Buka kembali
                        </button>
                      )}
                    </div>
                  </div>

                  {open && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <label htmlFor={`note-${item.id}`} className="mb-1 block text-xs font-semibold text-slate-600">Catatan temuan (wajib)</label>
                      <textarea id={`note-${item.id}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-[11px] text-slate-400">Untuk membatalkan hasil atau menghentikan sesi, gunakan tombol di halaman ujian.</p>
                        <button onClick={() => submit(item.id, 'confirmed', note)} disabled={busy === item.id || note.trim().length < 5} className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50">
                          Simpan konfirmasi
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  );
}
