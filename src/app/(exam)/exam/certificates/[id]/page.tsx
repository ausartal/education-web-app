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
    knowing: { score: number; level: string; description?: string };
    applying: { score: number; level: string; description?: string };
    reasoning: { score: number; level: string; description?: string };
    overall: { description: string; predikat?: string };
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

const DOMAIN_FALLBACKS: Record<string, Record<string, string>> = {
  knowing: {
    Tinggi: 'Menunjukkan penguasaan yang kuat dan konsisten terhadap fakta, istilah, prinsip, serta hubungan antarkonsep. Peserta mampu menjelaskan landasan konsep secara akurat sebagai dasar penyelesaian masalah.',
    Sedang: 'Memahami konsep dan prinsip utama dengan cukup baik, namun konsistensi masih perlu diperkuat pada konsep yang lebih kompleks atau membutuhkan keterhubungan beberapa gagasan.',
    Rendah: 'Penguasaan fakta dan konsep dasar masih terbatas. Penguatan terstruktur diperlukan sebelum peserta melanjutkan ke penerapan dan analisis yang lebih kompleks.',
  },
  applying: {
    Tinggi: 'Mampu memilih serta menerapkan rumus, hukum, dan prosedur yang relevan secara tepat pada beragam konteks, termasuk variasi soal yang tidak sepenuhnya rutin.',
    Sedang: 'Mampu menerapkan konsep pada situasi prosedural yang familiar, tetapi masih memerlukan latihan untuk menentukan strategi pada variasi konteks yang baru.',
    Rendah: 'Penerapan konsep dan prosedur belum konsisten. Peserta perlu memperkuat pemilihan rumus, urutan penyelesaian, dan pemeriksaan kembali hasil.',
  },
  reasoning: {
    Tinggi: 'Mampu menafsirkan informasi, menghubungkan beberapa konsep, mengevaluasi bukti, dan membangun penyelesaian logis untuk masalah kontekstual maupun non-rutin.',
    Sedang: 'Mulai mampu menalar hubungan sebab-akibat dan membaca pola, tetapi analisis pada persoalan terintegrasi masih membutuhkan penguatan.',
    Rendah: 'Penalaran ilmiah masih berfokus pada informasi langsung. Latihan analisis data, argumentasi berbasis bukti, dan integrasi konsep perlu diprioritaskan.',
  },
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
  const domainResults = [
    { key: 'knowing', label: 'Knowing', subtitle: 'Penguasaan Konsep', score: knowing, result: session?.conclusions?.knowing },
    { key: 'applying', label: 'Applying', subtitle: 'Penerapan Konsep', score: applying, result: session?.conclusions?.applying },
    { key: 'reasoning', label: 'Reasoning', subtitle: 'Penalaran Ilmiah', score: reasoning, result: session?.conclusions?.reasoning },
  ].map(item => ({
    ...item,
    level: item.result?.level ?? (item.score >= 75 ? 'Tinggi' : item.score >= 50 ? 'Sedang' : 'Rendah'),
    narrative: item.result?.description ?? DOMAIN_FALLBACKS[item.key][item.result?.level ?? (item.score >= 75 ? 'Tinggi' : item.score >= 50 ? 'Sedang' : 'Rendah')],
  }));

  return (
    <>
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .cert-pages, .cert-pages * { visibility: visible; }
          .cert-pages { position: absolute; inset: 0; padding: 0 !important; }
          .cert-sheet { width: 297mm !important; height: 210mm !important; box-shadow: none !important; break-after: page; page-break-after: always; }
          .cert-sheet:last-child { break-after: auto; page-break-after: auto; }
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
      <div className="cert-pages mx-auto max-w-5xl space-y-6 px-4 pb-12">
        <div className="cert-sheet relative overflow-hidden bg-white shadow-lg" style={{ aspectRatio: '297/210' }}>

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

        {/* Page 2 — competency analysis */}
        <div className="cert-sheet relative overflow-hidden bg-white shadow-lg" style={{ aspectRatio: '297/210' }}>
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#6320EE] via-[#8B5CF6] to-[#F59E0B]" />
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#6320EE]/[0.035]" />
          <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-[#F59E0B]/[0.04]" />

          <div className="absolute flex flex-col" style={{ inset: '13mm 16mm 11mm' }}>
            <header className="flex items-start justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-3">
                <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={36} height={36} />
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.22em] text-[#6320EE]">AKURAT Exam</p>
                  <h2 className="font-display text-xl font-extrabold text-[#141B34]">Laporan Analisis Kompetensi</h2>
                  <p className="mt-0.5 text-[9px] text-[#6B7280]">Interpretasi hasil Multistage Adaptive Scored Testing</p>
                </div>
              </div>
              <div className="text-right text-[8px] leading-relaxed text-[#6B7280]">
                <p className="font-mono font-semibold text-[#374151]">{cert.certificateNo}</p>
                <p>{formatDate(cert.issuedAt)}</p>
                <p>Halaman 2 dari 2</p>
              </div>
            </header>

            <div className="mt-3 grid grid-cols-[1.45fr_0.55fr] gap-3">
              <section className="rounded-lg border border-[#E9E2FF] bg-[#FAF9FF] px-4 py-3">
                <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-[#7C3AED]">Simpulan keseluruhan</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="font-display text-lg font-extrabold text-[#1F2937]">{cert.predikat}</h3>
                  <span className="text-[9px] font-semibold text-[#7C3AED]">Peringkat {PERINGKAT_ROMAN[peringkat] ?? peringkat}</span>
                </div>
                <p className="mt-1.5 text-[9px] leading-[1.55] text-[#4B5563]">{description}</p>
              </section>
              <section className="flex items-center justify-around rounded-lg bg-[#141B34] px-4 py-3 text-white">
                <div className="text-center"><p className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/50">Skor akhir</p><p className="font-display text-3xl font-black">{cert.score}</p></div>
                <div className="h-9 w-px bg-white/15" />
                <div className="min-w-0 text-center"><p className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/50">Peserta</p><p className="mt-1 max-w-[120px] truncate text-[11px] font-bold">{profile?.displayName ?? '-'}</p><p className="mt-0.5 max-w-[120px] truncate text-[7px] text-white/50">{profile?.institution ?? '-'}</p></div>
              </section>
            </div>

            <section className="mt-3 grid flex-1 grid-cols-3 gap-3">
              {domainResults.map((domain, index) => (
                <article key={domain.key} className="flex flex-col rounded-lg border border-[#E5E7EB] bg-white p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[7px] font-bold uppercase tracking-[0.16em] text-[#9CA3AF]">Domain {index + 1}</span>
                      <h3 className="mt-0.5 text-[12px] font-extrabold text-[#1F2937]">{domain.label}</h3>
                      <p className="text-[8px] text-[#6B7280]">{domain.subtitle}</p>
                    </div>
                    <div className="text-right"><p className="font-display text-2xl font-black leading-none text-[#6320EE]">{domain.score}%</p><p className="mt-1 text-[8px] font-bold text-[#4B5563]">{domain.level}</p></div>
                  </div>
                  <div className="my-2.5 h-1 overflow-hidden rounded-full bg-[#F1F5F9]"><div className="h-full rounded-full bg-gradient-to-r from-[#6320EE] to-[#9F67FF]" style={{ width: `${Math.max(2, Math.min(100, domain.score))}%` }} /></div>
                  <p className="text-[8.5px] leading-[1.55] text-[#4B5563]">{domain.narrative}</p>
                  <div className="mt-auto border-t border-[#F1F5F9] pt-2">
                    <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-[#9CA3AF]">Fokus pengembangan</p>
                    <p className="mt-1 text-[8px] leading-[1.45] text-[#6B7280]">
                      {domain.level === 'Tinggi' ? 'Pertahankan konsistensi melalui soal lintas konsep dan konteks baru.' : domain.level === 'Sedang' ? 'Perkuat konsistensi melalui latihan bertahap dan evaluasi kesalahan.' : 'Prioritaskan penguatan konsep dasar dengan latihan terarah dan umpan balik.'}
                    </p>
                  </div>
                </article>
              ))}
            </section>

            <footer className="mt-3 flex items-center justify-between border-t border-[#E5E7EB] pt-2 text-[7px] text-[#9CA3AF]">
              <p className="max-w-[650px] leading-relaxed">Laporan ini merupakan interpretasi diagnostik berdasarkan respons peserta pada asesmen adaptif. Hasil digunakan untuk memetakan kekuatan dan area pengembangan, bukan sebagai satu-satunya dasar pengambilan keputusan akademik.</p>
              <p className="ml-6 shrink-0 font-mono">{examCode || cert.certificateNo}</p>
            </footer>
          </div>
        </div>
      </div>
    </>
  );
};

export default CertificateDetailPage;
