'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';
import { PREDIKAT_COLORS, type PredikatName } from '@/types/msat';

interface CertificateDetail {
  id: string;
  userId: string;
  examTitle: string;
  score: number;
  predikat: string;
  peringkat?: number;
  issuedAt: { _seconds: number } | null;
  certificateNo: string;
}

interface SessionInfo {
  conclusions: {
    knowing: { score: number; level: string };
    applying: { score: number; level: string };
    reasoning: { score: number; level: string };
    overall: { description: string };
  } | null;
  peringkat: number | null;
}

interface UserProfile {
  displayName: string;
  identityNumber: string;
  identityType: string;
  institution: string;
}

function formatDate(ts: { _seconds: number } | null): string {
  if (!ts) return '-';
  return new Date(ts._seconds * 1000).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

const PERINGKAT_ROMAN: Record<number, string> = {
  1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V',
};

const CertificateDetailPage: FC = () => {
  const params = useParams();
  const { user } = useExamAuth();
  const certId = params.id as string;

  const [cert, setCert] = useState<CertificateDetail | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [examCode, setExamCode] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !certId) return;
    try {
      const token = await user.getIdToken();

      const certRes = await fetch(`/api/exam/certificates/${certId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (certRes.ok) {
        const data = await certRes.json();
        setCert(data.certificate);
        setSession(data.session);
        setExamCode(data.examCode ?? '');
      }

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

  const predName = (cert.predikat ?? 'Terbatas') as PredikatName;
  const peringkat = cert.peringkat ?? session?.peringkat ?? 5;
  const knowing = session?.conclusions?.knowing?.score ?? 0;
  const applying = session?.conclusions?.applying?.score ?? 0;
  const reasoning = session?.conclusions?.reasoning?.score ?? 0;
  const description = session?.conclusions?.overall?.description ??
    'Sertifikat ini diterbitkan oleh AKURAT sebagai bukti kompetensi kimia berdasarkan asesmen adaptif multistage.';

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .cert-page, .cert-page * { visibility: visible; }
          .cert-page { position: absolute; left: 0; top: 0; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 0; }
        }
      `}</style>

      {/* Top bar */}
      <div className="no-print mx-auto max-w-5xl px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href="/exam/certificates" className="flex items-center gap-1.5 text-xs font-semibold text-[#5B6475] hover:text-[#0E1E47]">
            <ArrowLeft size={14} /> Kembali
          </Link>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-lg bg-[#6320EE] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5218C7]">
            <Printer size={15} /> Cetak / Unduh PDF
          </button>
        </div>
      </div>

      {/* Certificate — landscape A4 */}
      <div className="cert-page mx-auto max-w-5xl px-4 pb-12">
        <div className="relative overflow-hidden bg-white shadow-lg" style={{ aspectRatio: '297/210' }}>

          {/* Borders */}
          <div className="pointer-events-none absolute" style={{ inset: '8mm', border: '1.5px solid #C4B5FD' }} />
          <div className="pointer-events-none absolute" style={{ inset: '10mm', border: '0.5px solid #E9E2FF' }} />

          {/* Corner ornaments */}
          {['top-[7mm] left-[7mm]', 'top-[7mm] right-[7mm] scale-x-[-1]', 'bottom-[7mm] left-[7mm] scale-y-[-1]', 'bottom-[7mm] right-[7mm] scale-[-1]'].map((pos, i) => (
            <div key={i} className={`pointer-events-none absolute h-7 w-7 ${pos}`}>
              <svg viewBox="0 0 28 28" fill="none"><path d="M0 28V4C0 1.79 1.79 0 4 0h24" stroke="#C4B5FD" strokeWidth="1.5" /></svg>
            </div>
          ))}

          {/* Top accent */}
          <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: 'linear-gradient(90deg, #6320EE 0%, #8B5CF6 30%, #F59E0B 50%, #8B5CF6 70%, #6320EE 100%)' }} />

          {/* Seal watermark */}
          <div className="pointer-events-none absolute bottom-[18mm] right-[22mm] h-14 w-14 opacity-[0.12]">
            <svg viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="45" stroke="#6320EE" strokeWidth="2" />
              <circle cx="50" cy="50" r="38" stroke="#6320EE" strokeWidth="0.5" />
              <circle cx="50" cy="50" r="20" stroke="#6320EE" strokeWidth="1" />
              <text x="50" y="46" textAnchor="middle" fontFamily="Nunito,sans-serif" fontWeight="900" fontSize="11" fill="#6320EE">AKURAT</text>
              <text x="50" y="58" textAnchor="middle" fontFamily="Ubuntu,sans-serif" fontWeight="500" fontSize="5" fill="#6320EE" letterSpacing="0.5">TERVERIFIKASI</text>
              <path d="M50 8 L53 18 L63 18 L55 24 L58 34 L50 28 L42 34 L45 24 L37 18 L47 18 Z" fill="#6320EE" opacity="0.3" />
            </svg>
          </div>

          {/* Content */}
          <div className="absolute flex flex-col" style={{ inset: '14mm 18mm' }}>

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2.5">
              <div className="flex items-center gap-3">
                <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={40} height={40} />
                <div className="h-7 w-px bg-[#D1D5DB]" />
                <div>
                  <p className="font-display text-lg font-extrabold leading-tight text-[#1a1040]">AKURAT</p>
                  <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-[#9CA3AF]">Adaptive Chemistry Learning</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#9CA3AF]">Sertifikat Kompetensi</p>
                <p className="mt-0.5 font-mono text-[10px] text-[#6B7280]">{cert.certificateNo}</p>
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ padding: '0 20px' }}>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#6320EE]">Sertifikat Kompetensi Kimia</p>
              <p className="mt-1.5 font-serif text-sm font-semibold text-[#6B7280]" style={{ fontFamily: 'Cormorant Garamond, serif', letterSpacing: '0.06em' }}>Multistage Adaptive Scored Testing</p>

              <h2 className="mt-4 font-serif text-[28px] font-bold leading-tight text-[#1a1040]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {cert.examTitle}
              </h2>

              {examCode && (
                <div className="mt-2.5 inline-flex flex-col items-center rounded border border-[#D1D5DB] px-3.5 py-1">
                  <span className="text-[7px] font-bold uppercase tracking-[0.15em] text-[#9CA3AF]">Kode Penyelenggaraan</span>
                  <span className="font-mono text-[13px] font-bold tracking-[0.12em] text-[#6B7280]">{examCode}</span>
                </div>
              )}

              <div className="mx-auto my-4 h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, #6320EE, transparent)' }} />

              <p className="text-[8px] font-medium uppercase tracking-[0.2em] text-[#9CA3AF]">Diberikan kepada</p>
              <h3 className="mt-1.5 font-serif text-[30px] font-bold leading-tight text-[#1a1040]" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                {profile?.displayName ?? '-'}
              </h3>
              <p className="mt-1 text-[11px] text-[#6B7280]">
                {profile?.identityType}: {profile?.identityNumber}
                <span className="mx-1.5 text-[#D1D5DB]">&middot;</span>
                {profile?.institution}
              </p>

              {/* Score */}
              <div className="mt-4 flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#9CA3AF]">Skor Akhir</p>
                  <p className="font-display text-[34px] font-black leading-none text-[#1a1040]">{cert.score}</p>
                </div>
                <div className="h-9 w-px bg-[#E5E7EB]" />
                <div className="text-center">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#9CA3AF]">Predikat</p>
                  <p className="font-display text-xl font-extrabold leading-none text-[#6320EE]">{cert.predikat}</p>
                  <p className="mt-0.5 text-[9px] text-[#9CA3AF]">Peringkat {PERINGKAT_ROMAN[peringkat] ?? peringkat}</p>
                </div>
              </div>

              {/* Cognitive */}
              <div className="mt-4 flex justify-center gap-14">
                {[
                  { label: 'Knowing', value: knowing },
                  { label: 'Applying', value: applying },
                  { label: 'Reasoning', value: reasoning },
                ].map((cog) => (
                  <div key={cog.label} className="text-center">
                    <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">{cog.label}</p>
                    <p className="font-display text-xl font-extrabold leading-none text-[#1a1040]">{cog.value}%</p>
                    <div className="mx-auto mt-2 h-px w-6 bg-[#E5E7EB]" />
                  </div>
                ))}
              </div>

              {/* Description */}
              <p className="mx-auto mt-4 max-w-lg text-center text-[9px] leading-relaxed text-[#9CA3AF]">
                {description}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-2">
              <div className="flex items-center gap-2">
                <Image src="/icons/Akurat_Logo.svg" alt="" width={18} height={18} className="opacity-30" />
                <div className="text-[7px] leading-relaxed text-[#D1D5DB]">
                  Diterbitkan secara digital oleh sistem AKURAT Exam.<br />
                  Dokumen ini dapat diverifikasi secara daring.
                </div>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-[#9CA3AF]">{formatDate(cert.issuedAt)}</p>
                <p className="mt-0.5 text-[7px] text-[#D1D5DB]">akurat-76834.web.app</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CertificateDetailPage;