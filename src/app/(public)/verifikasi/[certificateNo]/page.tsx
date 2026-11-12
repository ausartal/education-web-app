'use client';

import { FC, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BadgeCheck, Loader2, ShieldAlert, SearchX, Award, CalendarDays, UserRound, BookOpenCheck } from 'lucide-react';

interface Verification {
  valid: boolean;
  status: 'valid' | 'revoked' | 'unknown';
  certificateNo?: string;
  examTitle?: string;
  predikat?: string | null;
  holder?: string;
  issuedAt?: string | null;
  error?: string;
}

type ViewState = { kind: 'loading' } | { kind: 'done'; data: Verification } | { kind: 'error'; message: string };

const VerifyCertificatePage: FC = () => {
  const { certificateNo } = useParams<{ certificateNo: string }>();
  const [view, setView] = useState<ViewState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/certificates/${encodeURIComponent(certificateNo)}`);
        const data: Verification = await res.json().catch(() => ({ valid: false, status: 'unknown' as const }));
        if (cancelled) return;
        if (res.status === 429) setView({ kind: 'error', message: data.error ?? 'Terlalu banyak permintaan. Coba lagi sebentar lagi.' });
        else if (res.status >= 500) setView({ kind: 'error', message: 'Layanan verifikasi sedang bermasalah. Coba lagi nanti.' });
        else setView({ kind: 'done', data });
      } catch {
        if (!cancelled) setView({ kind: 'error', message: 'Tidak dapat terhubung. Periksa koneksi internetmu.' });
      }
    })();
    return () => { cancelled = true; };
  }, [certificateNo]);

  const tone =
    view.kind === 'done' && view.data.status === 'valid' ? { hero: 'from-emerald-500 to-teal-600', Icon: BadgeCheck, title: 'Sertifikat Asli', note: 'Sertifikat ini diterbitkan resmi oleh AKURAT.' }
    : view.kind === 'done' && view.data.status === 'revoked' ? { hero: 'from-rose-500 to-pink-600', Icon: ShieldAlert, title: 'Sertifikat Dicabut', note: 'Sertifikat ini pernah diterbitkan tetapi sudah tidak berlaku.' }
    : { hero: 'from-gray-500 to-gray-600', Icon: SearchX, title: 'Tidak Ditemukan', note: 'Nomor ini tidak cocok dengan sertifikat yang pernah diterbitkan AKURAT.' };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 lg:py-24">
      <div className="mb-6 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-[#6320EE]">Verifikasi Sertifikat</p>
        <p className="mt-2 font-mono text-sm text-gray-500">{certificateNo}</p>
      </div>

      {view.kind === 'loading' && (
        <div className="flex flex-col items-center gap-3 rounded-3xl bg-white py-20 shadow-sm ring-1 ring-gray-100" role="status">
          <Loader2 size={28} className="animate-spin text-[#6320EE]" aria-hidden="true" />
          <p className="text-sm text-gray-500">Memeriksa sertifikat…</p>
        </div>
      )}

      {view.kind === 'error' && (
        <div role="alert" className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
          <ShieldAlert size={28} className="mx-auto mb-3 text-amber-500" aria-hidden="true" />
          <p className="text-sm font-semibold text-gray-700">{view.message}</p>
        </div>
      )}

      {view.kind === 'done' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-gray-100">
          <div className={`bg-gradient-to-br ${tone.hero} px-6 py-8 text-center text-white`}>
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <tone.Icon size={32} aria-hidden="true" />
            </div>
            <h1 className="font-display text-2xl font-extrabold">{tone.title}</h1>
            <p className="mt-1 text-sm text-white/85">{tone.note}</p>
          </div>

          {view.data.status !== 'unknown' && (
            <dl className="divide-y divide-gray-50 px-6 py-2">
              {[
                { icon: UserRound, label: 'Pemegang', value: view.data.holder },
                { icon: BookOpenCheck, label: 'Ujian', value: view.data.examTitle },
                { icon: Award, label: 'Predikat', value: view.data.predikat ?? '-' },
                {
                  icon: CalendarDays,
                  label: 'Diterbitkan',
                  value: view.data.issuedAt ? new Date(view.data.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
                },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 py-3.5">
                  <Icon size={16} className="shrink-0 text-gray-400" aria-hidden="true" />
                  <dt className="w-24 shrink-0 text-xs font-semibold text-gray-500">{label}</dt>
                  <dd className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="border-t border-gray-50 px-6 py-4 text-center text-xs text-gray-400">
            Demi privasi, nama pemegang sertifikat hanya ditampilkan sebagian.
          </p>
        </motion.div>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/verifikasi" className="font-semibold text-[#6320EE] hover:underline">Periksa nomor lain</Link>
      </p>
    </div>
  );
};

export default VerifyCertificatePage;
