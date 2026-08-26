'use client';

import { FC } from 'react';
import Link from 'next/link';
import { ArrowLeft, Construction } from 'lucide-react';

const MsatResultsPage: FC = () => {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin/msat" className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Hasil Ujian MSAT</h1>
          <p className="text-xs text-stone-400">Rekap nilai semua siswa</p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-20 ring-1 ring-stone-100">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50">
          <Construction size={24} className="text-amber-500" />
        </div>
        <p className="text-sm font-semibold text-stone-600">Dalam Pengembangan</p>
        <p className="mt-1 text-xs text-stone-400">Fitur ini sedang dalam tahap pembuatan</p>
      </div>
    </div>
  );
};

export default MsatResultsPage;
