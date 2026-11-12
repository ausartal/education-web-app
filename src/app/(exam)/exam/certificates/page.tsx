'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';
import {
  Award, Loader2, Download, Printer, ArrowRight, FileText,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';

interface Certificate {
  id: string;
  examTitle: string;
  score: number;
  predikat: string;
  issuedAt: { _seconds: number } | null;
  certificateNo: string;
}

const PREDIKAT_STYLES: Record<string, string> = {
  Istimewa: 'text-violet-700 bg-violet-50 ring-violet-200',
  Unggul: 'text-blue-700 bg-blue-50 ring-blue-200',
  Madya: 'text-amber-700 bg-amber-50 ring-amber-200',
  Semenjana: 'text-orange-700 bg-orange-50 ring-orange-200',
  Terbatas: 'text-rose-700 bg-rose-50 ring-rose-200',
};

function formatDate(ts: unknown): string {
  if (!ts) return '-';
  const o = ts as Record<string, unknown>;
  const secs = (o._seconds ?? o.seconds) as number | undefined;
  if (typeof secs === 'number') return new Date(secs * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

const ExamCertificatesPage: FC = () => {
  const { user } = useExamAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCertificates = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/exam/certificates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCertificates(data.certificates ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Sertifikat</h1>
      <p className="mt-1 text-sm text-[#5B6475]">
        Sertifikat diterbitkan oleh admin setelah ujian selesai diverifikasi.
      </p>

      {certificates.length === 0 ? (
        <EmptyState
          className="mt-8"
          tone="violet"
          icon={<Award size={32} />}
          title="Belum ada sertifikat"
          description="Sertifikat akan muncul setelah admin memverifikasi dan menyetujui hasil ujianmu."
          action={
            <Link href="/exam" className="inline-flex items-center gap-1.5 rounded-xl bg-[#5841EA] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#4D38D4]">
              Mulai Ujian <ArrowRight size={12} />
            </Link>
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {certificates.map((cert) => {
            const predStyle = PREDIKAT_STYLES[cert.predikat] ?? 'text-gray-600 bg-gray-50 ring-gray-200';
            return (
              <div key={cert.id} className="rounded-lg bg-[#F8F7FF] p-5 ring-1 ring-[#E5E0F5]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0E1E47]">{cert.examTitle}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-display text-lg font-extrabold text-[#0E1E47]">
                        {cert.score}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ring-1 ${predStyle}`}>
                        {cert.predikat}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#9CA3AF]">
                      {formatDate(cert.issuedAt)} &middot; {cert.certificateNo}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/exam/certificates/${cert.id}`} title="Lihat"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE5F2] text-[#5B6475] transition-colors hover:bg-gray-50">
                      <FileText size={14} />
                    </Link>
                    <Link href={`/exam/certificates/${cert.id}`} title="Unduh PDF"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#DCE5F2] text-[#5B6475] transition-colors hover:bg-gray-50">
                      <Download size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExamCertificatesPage;