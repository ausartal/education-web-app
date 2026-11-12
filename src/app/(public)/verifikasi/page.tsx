'use client';

import { FC, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Search } from 'lucide-react';
import { isValidCertificateNo } from '@/lib/certificate-verify';

const VerifyIndexPage: FC = () => {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const clean = value.trim();
    if (!isValidCertificateNo(clean)) {
      setError('Nomor sertifikat tidak valid. Contoh: AKR-2026-00012');
      return;
    }
    router.push(`/verifikasi/${encodeURIComponent(clean)}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16 lg:py-24">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6320EE] to-indigo-600 text-white shadow-lg shadow-violet-200">
          <BadgeCheck size={30} aria-hidden="true" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-gray-900">Verifikasi Sertifikat</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          Pastikan sertifikat AKURAT yang kamu terima asli. Masukkan nomor sertifikat yang tertera di bagian kanan atas.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <label htmlFor="cert-no" className="mb-2 block text-sm font-semibold text-gray-700">Nomor sertifikat</label>
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true" />
          <input
            id="cert-no"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="AKR-2026-00012"
            autoComplete="off"
            className="w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 font-mono text-sm outline-none focus:border-[#6320EE] focus:ring-4 focus:ring-[#6320EE]/10"
            aria-invalid={!!error}
            aria-describedby={error ? 'cert-error' : undefined}
          />
        </div>
        {error && <p id="cert-error" role="alert" className="mt-2 text-xs font-medium text-rose-600">{error}</p>}
        <button type="submit" className="mt-4 w-full rounded-xl bg-[#6320EE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#5418D4]">
          Periksa
        </button>
      </form>
    </div>
  );
};

export default VerifyIndexPage;
