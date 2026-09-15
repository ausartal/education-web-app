'use client';

import { FC, useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, Printer, Download } from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';

interface CertificateDetail {
  id: string;
  userId: string;
  examTitle: string;
  score: number;
  predikat: string;
  issuedAt: { _seconds: number } | null;
  certificateNo: string;
}

interface UserProfile {
  displayName: string;
  identityNumber: string;
  identityType: string;
  institution: string;
  photoURL: string | null;
}

function formatDate(ts: { _seconds: number } | null): string {
  if (!ts) return '-';
  return new Date(ts._seconds * 1000).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const CertificateDetailPage: FC = () => {
  const params = useParams();
  const { user } = useExamAuth();
  const certId = params.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [cert, setCert] = useState<CertificateDetail | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !certId) return;
    try {
      const token = await user.getIdToken();

      // Fetch certificate
      const certRes = await fetch(`/api/exam/certificates/${certId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (certRes.ok) {
        const data = await certRes.json();
        setCert(data.certificate);
      }

      // Fetch profile for name/identity
      const profRes = await fetch('/api/exam/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profRes.ok) {
        const data = await profRes.json();
        setProfile(data.profile);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, certId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-[#5B6475]">Sertifikat tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .certificate-print, .certificate-print * { visibility: visible; }
          .certificate-print { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Actions bar — hidden when printing */}
      <div className="no-print mx-auto max-w-3xl px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Sertifikat</h1>
            <p className="text-sm text-[#5B6475]">{cert.examTitle}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-[#6320EE] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5218C7]">
              <Printer size={15} /> Cetak / Unduh PDF
            </button>
          </div>
        </div>
      </div>

      {/* Certificate preview — printable */}
      <div className="certificate-print mx-auto max-w-3xl px-4 pb-12">
        <div ref={printRef} className="rounded-lg bg-white p-8 ring-1 ring-[#DCE5F2] sm:p-12"
          style={{ aspectRatio: '210/297' }}>

          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DCE5F2] pb-6">
            <div className="flex items-center gap-2.5">
              <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={32} height={32} />
              <span className="font-display text-sm font-extrabold text-[#0E1E47]">
                UjiTuntas by AKURAT
              </span>
            </div>
            <span className="font-mono text-xs text-[#9CA3AF]">{cert.certificateNo}</span>
          </div>

          {/* Body */}
          <div className="py-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#6320EE]">
              Sertifikat Kompetensi
            </p>
            <h2 className="mt-4 font-display text-3xl font-extrabold text-[#0E1E47]">
              {cert.examTitle}
            </h2>

            <div className="mx-auto mt-8 max-w-md">
              <p className="text-sm text-[#5B6475]">Diberikan kepada</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-[#0E1E47]">
                {profile?.displayName ?? '-'}
              </p>
              <p className="mt-1 text-sm text-[#5B6475]">
                {profile?.identityType}: {profile?.identityNumber}
              </p>
              <p className="text-sm text-[#5B6475]">{profile?.institution}</p>
            </div>

            <div className="mx-auto mt-8 flex items-center justify-center gap-8">
              <div className="text-center">
                <p className="text-xs text-[#9CA3AF]">Skor</p>
                <p className="font-display text-3xl font-extrabold text-[#0E1E47]">{cert.score}</p>
              </div>
              <div className="h-12 w-px bg-[#DCE5F2]" />
              <div className="text-center">
                <p className="text-xs text-[#9CA3AF]">Predikat</p>
                <p className="font-display text-xl font-extrabold text-[#6320EE]">{cert.predikat}</p>
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-sm text-xs leading-relaxed text-[#9CA3AF]">
              Sertifikat ini diterbitkan oleh UjiTuntas by AKURAT sebagai bukti kompetensi
              kimia berdasarkan asesmen adaptif multistage.
            </p>
          </div>

          {/* Footer */}
          <div className="border-t border-[#DCE5F2] pt-6 text-center">
            <p className="text-xs text-[#9CA3AF]">
              Diterbitkan pada {formatDate(cert.issuedAt)}
            </p>
            <p className="mt-1 text-[10px] text-[#DCE5F2]">
              Dokumen ini divalidasi secara digital oleh sistem UjiTuntas.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default CertificateDetailPage;