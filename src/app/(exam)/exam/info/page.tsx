'use client';

import { FC, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Clock, Shield, Zap, BookOpen, Target, Lightbulb,
  FlaskConical, Layers, Trophy, BarChart3, CheckCircle2,
  ChevronDown, ChevronUp, ArrowRight, ArrowDown,
  GraduationCap, Sparkles, Info, AlertTriangle, HelpCircle,
  FileText, Monitor, Wifi, Coffee, Eye, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

/* ── Section IDs for navigation ── */
const sections = [
  { id: 'format', label: 'Format Ujian' },
  { id: 'scoring', label: 'Penilaian' },
  { id: 'domains', label: 'Domain Kognitif' },
  { id: 'expect', label: 'Yang Diharapkan' },
  { id: 'prepare', label: 'Persiapan' },
  { id: 'faq', label: 'FAQ' },
] as const;

/* ── Stat cards data ── */
const statCards = [
  { icon: BookOpen, value: '36', label: 'Soal', sub: '12 per stage', targetId: 'format', color: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-700' },
  { icon: Layers, value: '3', label: 'Stage', sub: 'Adaptif', targetId: 'format', color: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700' },
  { icon: Brain, value: '3', label: 'Domain', sub: 'Kognitif', targetId: 'domains', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { icon: Trophy, value: '5', label: 'Predikat', sub: 'Istimewa–Terbatas', targetId: 'scoring', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700' },
];

/* ── Stage detail data ── */
const stageDetails = [
  {
    stage: 1, difficulty: 'Medium', questions: 12, time: 'Sesuai pengaturan guru',
    desc: 'Semua siswa memulai dari level yang sama. Soal dirancang untuk mengukur pemahaman dasar kimia pada tingkat kesulitan sedang.',
    breakdown: '4 soal Knowing + 4 soal Applying + 4 soal Reasoning',
    passCriteria: 'Minimal 8 dari 12 soal benar (60%)',
    ifPass: 'Naik ke Stage 2 Tinggi — soal lebih menantang',
    ifFail: 'Turun ke Stage 2 Rendah — soal lebih mudah',
    icon: Layers, gradient: 'from-amber-400 to-orange-400', bg: 'bg-amber-50', ring: 'ring-amber-100', text: 'text-amber-700',
  },
  {
    stage: 2, difficulty: 'Tinggi / Rendah', questions: 12, time: 'Sesuai pengaturan guru',
    desc: 'Tingkat kesulitan menyesuaikan hasil Stage 1. Ini adalah stage adaptif pertama yang memetakan kemampuanmu.',
    breakdown: '4 soal Knowing + 4 soal Applying + 4 soal Reasoning',
    passCriteria: 'Minimal 8 dari 12 soal benar (60%)',
    ifPass: 'Stage 2 Tinggi → Stage 3 Tinggi. Stage 2 Rendah → Stage 3 Medium',
    ifFail: 'Stage 2 Tinggi → Stage 3 Medium. Stage 2 Rendah → Stage 3 Rendah',
    icon: Target, gradient: 'from-blue-400 to-cyan-400', bg: 'bg-blue-50', ring: 'ring-blue-100', text: 'text-blue-700',
  },
  {
    stage: 3, difficulty: 'Lebih Tinggi → Lebih Rendah', questions: 12, time: 'Sesuai pengaturan guru',
    desc: 'Stage penentuan. Jalur kesulitanmu di stage ini, dikombinasikan dengan kelulusan, menentukan predikat akhirmu.',
    breakdown: '4 soal Knowing + 4 soal Applying + 4 soal Reasoning',
    passCriteria: 'Minimal 8 dari 12 soal benar (60%)',
    ifPass: 'Predikat naik satu tingkat dari base jalur',
    ifFail: 'Predikat sesuai base jalur',
    icon: Trophy, gradient: 'from-violet-400 to-purple-400', bg: 'bg-violet-50', ring: 'ring-violet-100', text: 'text-violet-700',
  },
];

/* ── Predikat data ── */
const predikatTable = [
  { name: 'Istimewa', rank: 'I', path: 'Lebih Tinggi', condition: 'S2=tinggi, S3=tinggi, lulus S3', color: 'violet' },
  { name: 'Unggul', rank: 'II', path: 'Lebih Tinggi / Medium Lebih Tinggi', condition: 'S3=tinggi gagal, atau S3=medium (S2=tinggi) lulus', color: 'blue' },
  { name: 'Madya', rank: 'III', path: 'Medium Lebih Tinggi / Medium Lebih Rendah', condition: 'S3=medium (S2=tinggi) gagal, atau S3=medium (S2=rendah) lulus', color: 'amber' },
  { name: 'Semenjana', rank: 'IV', path: 'Medium Lebih Rendah / Lebih Rendah', condition: 'S3=medium (S2=rendah) gagal, atau S3=rendah lulus', color: 'orange' },
  { name: 'Terbatas', rank: 'V', path: 'Lebih Rendah', condition: 'S2=rendah, S3=rendah, gagal S3', color: 'rose' },
];

const predikatDescriptions: Record<string, string> = {
  Istimewa: 'Menguasai seluruh konsep dasar kimia secara mendalam (Knowing), terampil mengaplikasikan rumus dan hukum kimia tanpa kekeliruan pada berbagai variasi soal (Applying), serta mampu menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan masalah kontekstual non-rutin melalui penalaran ilmiah yang logis dan kritis (Reasoning).',
  Unggul: 'Memiliki pemahaman konsep dasar kimia yang kokoh (Knowing) dan mampu menerapkannya secara akurat pada situasi prosedural (Applying), serta mulai mampu melakukan penalaran ilmiah untuk menginterpretasikan data dan menyelesaikan masalah kontekstual tingkat menengah (Reasoning).',
  Madya: 'Memahami istilah dan prinsip-prinsip utama kimia (Knowing) serta mampu mengaplikasikannya pada perhitungan atau masalah sederhana yang rutin (Applying), namun penalarannya masih terbatas pada hubungan sebab-akibat langsung dan belum konsisten pada kasus terintegrasi (Reasoning).',
  Semenjana: 'Mengenali beberapa fakta dan definisi dasar kimia (Knowing), namun masih mengalami kesulitan atau kerap terjadi miskonsepsi saat menerapkan konsep pada soal (Applying), serta belum mampu melakukan analisis penalaran secara mandiri (Reasoning).',
  Terbatas: 'Hanya mengingat sebagian kecil pengetahuan kimia yang sangat parsial (Knowing), belum mampu menerapkan rumus/prinsip secara tepat (Applying), dan belum mampu menunjukkan kemampuan penalaran ilmiah (Reasoning).',
};

const colorMap: Record<string, { text: string; bg: string; ring: string; badge: string; bar: string }> = {
  violet: { text: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-200', badge: 'bg-violet-100 text-violet-700', bar: 'bg-violet-400' },
  blue: { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-400' },
  amber: { text: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  orange: { text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200', badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-400' },
  rose: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200', badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-400' },
};

/* ── Domain data ── */
const domains = [
  {
    id: 'knowing', name: 'Knowing', label: 'Pemahaman Konsep', icon: Lightbulb,
    desc: 'Mengukur kemampuan mengingat, memahami, dan menjelaskan prinsip-prinsip dasar kimia. Ini adalah fondasi dari semua pembelajaran kimia.',
    whatItTests: ['Mengingat rumus dan persamaan kimia', 'Memahami konsep mol, massa atom, dan tabel periodik', 'Menjelaskan hukum dasar kimia (Kekekalan Massa, Avogadro)', 'Mengidentifikasi sifat-sifat unsur dan senyawa'],
    example: 'Soal tipe: "Jelaskan mengapa air memiliki titik didih lebih tinggi dari hidrogen sulfida berdasarkan ikatan hidrogen."',
    color: 'emerald', gradient: 'from-emerald-400 to-teal-400',
  },
  {
    id: 'applying', name: 'Applying', label: 'Penerapan Konsep', icon: Target,
    desc: 'Mengukur kemampuan mengaplikasikan rumus dan hukum kimia pada berbagai variasi soal, termasuk perhitungan dan penyelesaian masalah prosedural.',
    whatItTests: ['Menghitung mol, massa, dan volume gas', 'Menyelesaikan soal stoikiometri', 'Menggunakan hukum gas ideal (PV=nRT)', 'Menentukan pH larutan dan kesetimbangan'],
    example: 'Soal tipe: "Hitung volume gas O₂ yang diperlukan untuk membakar 16 gram metana (CH₄) pada STP."',
    color: 'blue', gradient: 'from-blue-400 to-cyan-400',
  },
  {
    id: 'reasoning', name: 'Reasoning', label: 'Penalaran Ilmiah', icon: Brain,
    desc: 'Mengukur kemampuan menganalisis masalah kompleks, mengintegrasikan multi-konsep, dan memecahkan soal kontekstual non-rutin melalui penalaran ilmiah.',
    whatItTests: ['Menganalisis data eksperimen dan grafik', 'Menyelesaikan soal kontekstual multi-langkah', 'Mengintegrasikan konsep dari berbagai topik', 'Mengevaluasi argumen ilmiah dan membuat kesimpulan'],
    example: 'Soal tipe: "Dari data eksperimen berikut, tentukan orde reaksi dan tetapan laju reaksinya."',
    color: 'violet', gradient: 'from-violet-400 to-purple-400',
  },
];

const domainColorMap: Record<string, { text: string; bg: string; ring: string }> = {
  emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
  blue: { text: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-100' },
  violet: { text: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-100' },
};

/* ── FAQ data ── */
const faqData = [
  { q: 'Berapa lama waktu ujian?', a: 'Setiap stage memiliki batas waktu yang ditentukan oleh guru saat membuat ujian. Secara umum, setiap stage diberikan waktu 20–40 menit. Ada waktu istirahat 10 menit antar stage yang bisa di-skip oleh guru.' },
  { q: 'Apakah ada pengurangan nilai untuk jawaban salah?', a: 'Tidak ada pengurangan nilai untuk jawaban salah. Disarankan untuk menjawab semua soal meskipun tidak yakin, karena tidak ada penalti.' },
  { q: 'Bagaimana cara mengetahui predikatku?', a: 'Setelah menyelesaikan semua 3 stage, kamu akan langsung melihat hasil lengkap: predikat keseluruhan (Istimewa–Terbatas), skor per domain kognitif (Knowing, Applying, Reasoning), dan deskripsi kompetensimu.' },
  { q: 'Bisakah ujian di-pause?', a: 'Tidak bisa. Setelah dimulai, ujian harus diselesaikan sampai akhir. Pastikan kamu sudah siap sebelum menekan tombol "Mulai Ujian".' },
  { q: 'Apa yang terjadi jika koneksi internet terputus?', a: 'Jawaban yang sudah dikirim tetap tersimpan. Kamu bisa melanjutkan dari stage terakhir yang belum selesai. Namun, waktu ujian tetap berjalan, jadi pastikan koneksi stabil.' },
  { q: 'Mengapa soal terasa lebih sulit di stage berikutnya?', a: 'Itu berarti kamu lulus di stage sebelumnya! Sistem adaptif akan memberikan soal yang lebih menantang untuk mengukur batas kemampuanmu. Jangan panik — ini adalah fitur, bukan bug.' },
  { q: 'Apa bedanya MSAT dengan ujian biasa?', a: 'MSAT menggunakan sistem adaptif multistage — tingkat kesulitan soal menyesuaikan performamu. Ujian biasa memberikan soal yang sama untuk semua siswa. MSAT dirancang untuk mengukur kompetensi secara lebih akurat.' },
  { q: 'Bagaimana jika saya hanya lulus di Stage 1?', a: 'Jika kamu hanya lulus di Stage 1, kamu akan masuk jalur Rendah di Stage 2 dan 3. Predikat akhir tergantung performa di stage selanjutnya. Tetap berusaha di setiap stage!' },
  { q: 'Apakah hasil MSAT bisa diulang?', a: 'Tergantung kebijakan guru. Beberapa ujian bisa diulang, beberapa hanya bisa sekali. Tanyakan kepada gurumu tentang kebijakan pengulangan.' },
  { q: 'Apa yang dimaksud dengan "jalur" di Stage 3?', a: 'Jalur menunjukkan tingkat kesulitan soal yang kamu terima. Ada 4 jalur: Lebih Tinggi (paling sulit), Medium Lebih Tinggi, Medium Lebih Rendah, dan Lebih Rendah (paling mudah). Jalur ditentukan oleh performa di Stage 1 dan 2.' },
];

/* ── Page Component ── */

const ExamInfoPage: FC = () => {
  const [activeSection, setActiveSection] = useState('format');
  const [expandedPredikat, setExpandedPredikat] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [expandedStage, setExpandedStage] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* Intersection Observer for active section tracking */
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#5841EA] via-[#6C5CE7] to-[#7B6AEF] px-4 pt-12 pb-16 text-white sm:px-6 sm:pt-16 sm:pb-20">
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/[0.08] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-white/[0.06] blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 top-1/4 h-40 w-40 rounded-full bg-white/[0.04] blur-2xl" />
        <span className="pointer-events-none absolute left-[6%] top-[12%] font-display text-6xl font-bold text-white/[0.04] select-none">H₂O</span>
        <span className="pointer-events-none absolute right-[8%] top-[8%] font-display text-5xl font-bold text-white/[0.035] select-none">O₂</span>
        <span className="pointer-events-none absolute left-[12%] bottom-[15%] font-display text-7xl font-bold text-white/[0.03] select-none">CO₂</span>
        <span className="pointer-events-none absolute right-[10%] bottom-[20%] font-display text-5xl font-bold text-white/[0.035] select-none">CH₄</span>

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg shadow-black/10 backdrop-blur-sm">
              <FlaskConical size={30} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/50">Panduan Lengkap</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">MSAT by Akurat</h1>
            <p className="mt-1 text-base font-medium text-white/70 sm:text-lg">Multistage Adaptive Scored Testing</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60 sm:text-[15px]">
              Sistem ujian adaptif kimia yang mengukur kompetensi siswa secara menyeluruh. Tingkat kesulitan soal menyesuaikan kemampuanmu di setiap stage, memberikan gambaran akurat tentang penguasaan konsep kimia.
            </p>
          </motion.div>

          {/* ── Stat Cards (clickable) ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }} className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  onClick={() => scrollTo(card.targetId)}
                  className="group relative overflow-hidden rounded-2xl bg-white/10 p-4 text-left backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-lg hover:shadow-black/10 sm:p-5"
                >
                  <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-white/[0.06] transition-transform group-hover:scale-125" />
                  <Icon size={20} className="mb-2 text-white/70" />
                  <p className="font-display text-3xl font-black tracking-tight">{card.value}</p>
                  <p className="text-sm font-bold text-white/90">{card.label}</p>
                  <p className="mt-0.5 text-[11px] text-white/50">{card.sub}</p>
                  <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 transition-transform group-hover:translate-x-0.5 group-hover:text-white/60" />
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Sticky Tab Navigation ── */}
      <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative">
            {/* Bottom border line */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-gray-200" />

            <nav className="no-scrollbar flex gap-0.5 overflow-x-auto py-0">
              {sections.map(({ id, label }, i) => {
                const isActive = activeSection === id;
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`relative flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-[13px] font-semibold transition-colors sm:px-5 sm:text-sm ${
                      isActive
                        ? 'text-[#5841EA]'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <span className={`hidden h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold sm:flex ${
                      isActive ? 'bg-[#5841EA] text-white' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                    {label}
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeInfoTab"
                        className="absolute inset-x-3 -bottom-px h-[2.5px] rounded-full bg-[#5841EA]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">

        {/* ══════════════════════════════════════════════════════════════
            SECTION 1: FORMAT UJIAN
        ══════════════════════════════════════════════════════════════ */}
        <section id="format" className="scroll-mt-32">
          <SectionHeader
            number="01"
            icon={FileText}
            title="Format Ujian"
            subtitle="Struktur dan alur ujian MSAT dari awal hingga akhir"
          />

          {/* Overview */}
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 p-5 ring-1 ring-violet-100 sm:p-6">
            <p className="text-[15px] leading-relaxed text-gray-700">
              MSAT terdiri dari <span className="font-bold text-[#5841EA]">3 stage</span>, masing-masing berisi <span className="font-bold text-[#5841EA]">12 soal pilihan ganda</span>. Setiap stage terdiri dari 4 soal Knowing, 4 soal Applying, dan 4 soal Reasoning. Tingkat kesulitan soal di Stage 2 dan 3 <span className="font-bold">menyesuaikan performamu</span> di stage sebelumnya — ini yang disebut <span className="font-bold text-[#5841EA]">adaptif</span>.
            </p>
          </div>

          {/* Stage Cards */}
          <div className="space-y-4">
            {stageDetails.map((s, i) => {
              const Icon = s.icon;
              const isOpen = expandedStage === s.stage;
              return (
                <motion.div
                  key={s.stage}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <button
                    onClick={() => setExpandedStage(isOpen ? null : s.stage)}
                    className={`w-full rounded-2xl ${s.bg} p-5 ring-1 ${s.ring} text-left transition-all hover:shadow-md sm:p-6`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-sm`}>
                        <Icon size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Stage {s.stage}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.text} bg-white ring-1 ${s.ring}`}>{s.difficulty}</span>
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-500 ring-1 ring-gray-200">{s.questions} soal</span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-[#0E1E47] sm:text-base">{s.desc}</p>
                      </div>
                      <div className="shrink-0">
                        {isOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
                        <div className="mt-2 rounded-2xl bg-white p-5 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-6">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <InfoItem label="Komposisi Soal" value={s.breakdown} />
                            <InfoItem label="Kriteria Lulus" value={s.passCriteria} />
                            <InfoItem label="Jika Lulus" value={s.ifPass} icon={<ArrowRight size={12} className="text-emerald-500" />} />
                            <InfoItem label="Jika Tidak Lulus" value={s.ifFail} icon={<ArrowRight size={12} className="text-amber-500" />} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {i < stageDetails.length - 1 && (
                    <div className="my-2 flex justify-center">
                      <ArrowDown size={16} className="text-gray-300" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Flow Diagram */}
          <div className="mt-8 rounded-2xl bg-white p-5 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-6">
            <h3 className="mb-4 text-sm font-bold text-[#0E1E47]">Alur Adaptif</h3>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Visual flow */}
                <div className="flex items-center justify-between gap-2 text-center text-[11px]">
                  <FlowNode label="Stage 1" sub="Medium" color="amber" />
                  <FlowArrow />
                  <div className="flex flex-col gap-2">
                    <FlowNode label="S2 Tinggi" sub="Lulus S1" color="blue" />
                    <FlowNode label="S2 Rendah" sub="Gagal S1" color="slate" />
                  </div>
                  <FlowArrow />
                  <div className="flex flex-col gap-2">
                    <FlowNode label="S3 Lebih Tinggi" sub="Lulus S2 Tinggi" color="violet" />
                    <FlowNode label="S3 Med. Tinggi" sub="Gagal S2 Tinggi" color="blue" />
                    <FlowNode label="S3 Med. Rendah" sub="Lulus S2 Rendah" color="amber" />
                    <FlowNode label="S3 Lebih Rendah" sub="Gagal S2 Rendah" color="rose" />
                  </div>
                  <FlowArrow />
                  <div className="flex flex-col gap-2">
                    <FlowNode label="Istimewa" sub="Peringkat I" color="violet" />
                    <FlowNode label="Unggul" sub="Peringkat II" color="blue" />
                    <FlowNode label="Madya" sub="Peringkat III" color="amber" />
                    <FlowNode label="Semenjana" sub="Peringkat IV" color="orange" />
                    <FlowNode label="Terbatas" sub="Peringkat V" color="rose" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 2: PENILAIAN
        ══════════════════════════════════════════════════════════════ */}
        <section id="scoring" className="mt-16 scroll-mt-32 sm:mt-20">
          <SectionHeader
            number="02"
            icon={Trophy}
            title="Sistem Penilaian"
            subtitle="Bagaimana predikatmu ditentukan"
          />

          {/* Scoring explanation */}
          <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-5 ring-1 ring-amber-100 sm:p-6">
            <h3 className="mb-2 text-sm font-bold text-amber-800">Bagaimana Predikat Ditentukan?</h3>
            <p className="text-[14px] leading-relaxed text-amber-900/80">
              Predikat <span className="font-bold">bukan</span> berdasarkan skor numerik (persentase), melainkan berdasarkan <span className="font-bold">jalur kesulitan stage</span> yang kamu tempuh dan <span className="font-bold">kelulusan di Stage 3</span>. Semakin tinggi jalur yang berhasil kamu lalui, semakin tinggi predikatmu.
            </p>
          </div>

          {/* Predikat Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Predikat</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Peringkat</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Jalur Stage 3</th>
                    <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Kondisi</th>
                  </tr>
                </thead>
                <tbody>
                  {predikatTable.map((p) => {
                    const c = colorMap[p.color];
                    return (
                      <tr key={p.name} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-4">
                          <span className={`text-sm font-bold ${c.text}`}>{p.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-xs font-black text-gray-600">{p.rank}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.badge}`}>{p.path}</span>
                        </td>
                        <td className="px-5 py-4 text-xs text-gray-500">{p.condition}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Predikat Detail Cards */}
          <div className="mt-6 space-y-3">
            {predikatTable.map((p) => {
              const c = colorMap[p.color];
              const isOpen = expandedPredikat === p.name;
              return (
                <div key={p.name}>
                  <button
                    onClick={() => setExpandedPredikat(isOpen ? null : p.name)}
                    className={`flex w-full items-center gap-3 rounded-2xl ${c.bg} p-4 ring-1 ${c.ring} text-left transition-all hover:shadow-sm sm:p-5`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-gray-600 shadow-sm">{p.rank}</div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-base font-bold ${c.text}`}>{p.name}</span>
                      <p className="mt-0.5 text-[11px] text-gray-500">{p.condition}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="shrink-0 text-gray-400" /> : <ChevronDown size={16} className="shrink-0 text-gray-400" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                        <div className="mt-2 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100">
                          <p className="text-[13px] leading-relaxed text-gray-600">{predikatDescriptions[p.name]}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 3: DOMAIN KOGNITIF
        ══════════════════════════════════════════════════════════════ */}
        <section id="domains" className="mt-16 scroll-mt-32 sm:mt-20">
          <SectionHeader
            number="03"
            icon={GraduationCap}
            title="Domain Kognitif"
            subtitle="3 aspek kompetensi yang diukur di setiap stage"
          />

          <div className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-5 ring-1 ring-emerald-100 sm:p-6">
            <p className="text-[14px] leading-relaxed text-gray-700">
              Setiap stage terdiri dari <span className="font-bold text-emerald-700">12 soal</span> yang dibagi rata ke dalam 3 domain kognitif: <span className="font-bold">Knowing</span> (pemahaman), <span className="font-bold">Applying</span> (penerapan), dan <span className="font-bold">Reasoning</span> (penalaran). Skor per domain dihitung independen dan menghasilkan <span className="font-bold">3 simpulan kognitif</span> tambahan di luar predikat keseluruhan.
            </p>
          </div>

          <div className="space-y-4">
            {domains.map((d, i) => {
              const Icon = d.icon;
              const c = domainColorMap[d.color];
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-2xl ${c.bg} p-5 ring-1 ${c.ring} sm:p-6`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${d.gradient} text-white shadow-sm`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`text-lg font-bold ${c.text}`}>{d.name}</h3>
                      <p className="text-xs font-semibold text-gray-500">{d.label}</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-gray-600">{d.desc}</p>

                      <div className="mt-4">
                        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Yang Diuji</p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {d.whatItTests.map((item, j) => (
                            <div key={j} className="flex items-start gap-2">
                              <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-gray-400" />
                              <span className="text-xs text-gray-600">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-white/80 p-3 ring-1 ring-gray-200">
                        <p className="text-[11px] font-bold text-gray-400">Contoh Soal</p>
                        <p className="mt-1 text-xs italic leading-relaxed text-gray-600">{d.example}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Level explanation */}
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-6">
            <h3 className="mb-4 text-sm font-bold text-[#0E1E47]">Level Kompetensi per Domain</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { level: 'Tinggi', range: '≥75%', desc: 'Menguasai dan konsisten', color: 'emerald' },
                { level: 'Sedang', range: '50–74%', desc: 'Pemahaman cukup, ada celah', color: 'amber' },
                { level: 'Rendah', range: '<50%', desc: 'Perlu penguatan', color: 'rose' },
              ].map((l) => (
                <div key={l.level} className={`rounded-xl bg-${l.color}-50 p-4 ring-1 ring-${l.color}-100`}>
                  <p className={`text-sm font-bold text-${l.color}-700`}>{l.level}</p>
                  <p className="text-lg font-black text-gray-700">{l.range}</p>
                  <p className="mt-1 text-xs text-gray-500">{l.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 4: YANG DIHARAPKAN
        ══════════════════════════════════════════════════════════════ */}
        <section id="expect" className="mt-16 scroll-mt-32 sm:mt-20">
          <SectionHeader
            number="04"
            icon={Eye}
            title="Yang Diharapkan"
            subtitle="Apa yang perlu kamu ketahui sebelum ujian"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Monitor, title: 'Mode Layar Penuh', desc: 'Ujian berjalan dalam mode fullscreen. Kamu tidak bisa membuka tab atau aplikasi lain selama ujian berlangsung.', color: 'violet' },
              { icon: Clock, title: 'Waktu Terbatas', desc: 'Setiap stage punya batas waktu. Timer akan terlihat di layar. Jawaban otomatis dikirim saat waktu habis.', color: 'blue' },
              { icon: Coffee, title: 'Istirahat Antar Stage', desc: 'Ada waktu istirahat 10 menit setelah Stage 1 dan 2. Gunakan untuk menyegarkan pikiran.', color: 'amber' },
              { icon: Wifi, title: 'Koneksi Stabil', desc: 'Pastikan internet stabil. Jawaban tersimpan otomatis, tapi waktu tetap berjalan jika terputus.', color: 'emerald' },
              { icon: Zap, title: 'Hasil Instan', desc: 'Setelah menyelesaikan semua stage, predikat dan analisis kognitif langsung ditampilkan.', color: 'rose' },
              { icon: Shield, title: 'Integritas Terjaga', desc: 'Sistem memantau pola jawaban untuk mendeteksi kecurangan. Bermainlah dengan jujur.', color: 'slate' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white p-5 shadow-md shadow-black/[0.03] ring-1 ring-black/[0.04]"
                >
                  <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-${item.color}-50`}>
                    <Icon size={20} className={`text-${item.color}-600`} />
                  </div>
                  <h3 className="text-sm font-bold text-[#0E1E47]">{item.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Timeline */}
          <div className="mt-8 rounded-2xl bg-white p-5 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-6">
            <h3 className="mb-5 text-sm font-bold text-[#0E1E47]">Alur Waktu Ujian</h3>
            <div className="relative space-y-0">
              {[
                { time: 'Mulai', label: 'Masuk dengan kode ujian', desc: 'Tunggu di ruang tunggu jika mode manual' },
                { time: 'Stage 1', label: '12 soal — Medium', desc: 'Semua siswa mulai dari level sama' },
                { time: 'Istirahat', label: '10 menit', desc: 'Segarkan pikiranmu' },
                { time: 'Stage 2', label: '12 soal — Tinggi/Rendah', desc: 'Soal menyesuaikan hasil Stage 1' },
                { time: 'Istirahat', label: '10 menit', desc: 'Persiapan untuk stage terakhir' },
                { time: 'Stage 3', label: '12 soal — Jalur akhir', desc: 'Stage penentuan predikat' },
                { time: 'Selesai', label: 'Lihat hasil', desc: 'Predikat + 3 simpulan kognitif' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${
                      item.time === 'Selesai' ? 'bg-emerald-100 text-emerald-600' : item.time === 'Istirahat' ? 'bg-amber-100 text-amber-600' : 'bg-violet-100 text-violet-600'
                    }`}>
                      {i + 1}
                    </div>
                    {i < 6 && <div className="h-full w-px bg-gray-200" />}
                  </div>
                  <div className="pb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{item.time}</p>
                    <p className="text-sm font-bold text-[#0E1E47]">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 5: PERSIAPAN
        ══════════════════════════════════════════════════════════════ */}
        <section id="prepare" className="mt-16 scroll-mt-32 sm:mt-20">
          <SectionHeader
            number="05"
            icon={Lightbulb}
            title="Persiapan & Tips"
            subtitle="Strategi untuk hasil terbaik"
          />

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Before exam */}
            <div className="rounded-2xl bg-white p-5 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#0E1E47]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-600">1</span>
                Sebelum Ujian
              </h3>
              <div className="space-y-2.5">
                {[
                  'Pelajari konsep dasar kimia: mol, stoikiometri, ikatan kimia, kesetimbangan',
                  'Latihan soal dari berbagai tingkat kesulitan',
                  'Pahami rumus-rumus utama dan cara mengaplikasikannya',
                  'Istirahat yang cukup malam sebelum ujian',
                  'Siapkan perangkat dan koneksi internet yang stabil',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-violet-400" />
                    <span className="text-[13px] text-gray-600">{tip}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* During exam */}
            <div className="rounded-2xl bg-white p-5 shadow-lg shadow-black/[0.04] ring-1 ring-black/[0.04] sm:p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-[#0E1E47]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">2</span>
                Selama Ujian
              </h3>
              <div className="space-y-2.5">
                {[
                  'Baca setiap soal dengan teliti sebelum menjawab',
                  'Jawab semua soal — tidak ada pengurangan untuk jawaban salah',
                  'Kelola waktu dengan baik — jangan terlalu lama di satu soal',
                  'Manfaatkan waktu istirahat untuk menyegarkan pikiran',
                  'Jangan panik jika soal terasa sulit — itu artinya kamu di jalur yang tepat',
                  'Periksa kembali jawaban sebelum mengirim',
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-blue-400" />
                    <span className="text-[13px] text-gray-600">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key insight */}
          <div className="mt-6 rounded-2xl bg-gradient-to-r from-[#5841EA] to-[#7B6AEF] p-6 text-white sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold">Ingat: Adaptif adalah Fitur, Bukan Ancaman</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/80">
                  Jika soal terasa lebih sulit di stage berikutnya, itu berarti kamu <span className="font-bold text-white">lulus</span> di stage sebelumnya. Sistem adaptif dirancang untuk menemukan batas kemampuanmu — jadi soal yang menantang adalah pertanda baik. Berikan yang terbaik di setiap stage!
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════
            SECTION 6: FAQ
        ══════════════════════════════════════════════════════════════ */}
        <section id="faq" className="mt-16 scroll-mt-32 sm:mt-20">
          <SectionHeader
            number="06"
            icon={HelpCircle}
            title="Pertanyaan Umum"
            subtitle="Jawaban untuk pertanyaan yang sering diajukan"
          />

          <div className="space-y-2">
            {faqData.map((item, i) => {
              const isOpen = expandedFaq === i;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : i)}
                    className="flex w-full items-center gap-3 rounded-xl bg-white px-5 py-4 text-left shadow-sm ring-1 ring-black/[0.04] transition-all hover:bg-gray-50 hover:shadow-md"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#5841EA]/10 text-[11px] font-bold text-[#5841EA]">{i + 1}</span>
                    <span className="flex-1 text-sm font-semibold text-[#0E1E47]">{item.q}</span>
                    {isOpen ? <ChevronUp size={16} className="shrink-0 text-gray-400" /> : <ChevronDown size={16} className="shrink-0 text-gray-400" />}
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                        <div className="rounded-b-xl bg-gray-50 px-5 py-4 ring-1 ring-gray-100">
                          <p className="text-[13px] leading-relaxed text-gray-600">{item.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-16 text-center sm:mt-20">
          <div className="rounded-3xl bg-gradient-to-br from-[#5841EA] to-[#7B6AEF] p-8 text-white shadow-xl shadow-[#5841EA]/20 sm:p-10">
            <h2 className="font-display text-2xl font-extrabold sm:text-3xl">Siap Menguji Kompetensimu?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/70">Masukkan kode ujian dari gurumu dan buktikan penguasaan konsep kiamu!</p>
            <Link
              href="/exam"
              className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-[#5841EA] shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Mulai Ujian <ArrowRight size={16} />
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
};

/* ── Helper Components ── */

const SectionHeader: FC<{ number: string; icon: LucideIcon; title: string; subtitle: string }> = ({ number, icon: Icon, title, subtitle }) => (
  <div className="mb-8">
    <div className="mb-3 flex items-center gap-3">
      <span className="font-display text-3xl font-black text-[#5841EA]/20">{number}</span>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#5841EA]/10">
        <Icon size={20} className="text-[#5841EA]" />
      </div>
    </div>
    <h2 className="font-display text-2xl font-extrabold text-[#0E1E47] sm:text-3xl">{title}</h2>
    <p className="mt-1 text-sm text-gray-400">{subtitle}</p>
  </div>
);

const InfoItem: FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-start gap-2">
    {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-0.5 text-[13px] text-gray-600">{value}</p>
    </div>
  </div>
);

const FlowNode: FC<{ label: string; sub: string; color: string }> = ({ label, sub, color }) => {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 ring-amber-200 text-amber-700',
    blue: 'bg-blue-50 ring-blue-200 text-blue-700',
    violet: 'bg-violet-50 ring-violet-200 text-violet-700',
    rose: 'bg-rose-50 ring-rose-200 text-rose-700',
    orange: 'bg-orange-50 ring-orange-200 text-orange-700',
    slate: 'bg-slate-50 ring-slate-200 text-slate-600',
  };
  return (
    <div className={`rounded-lg px-3 py-2 ring-1 ${colors[color] ?? colors.slate}`}>
      <p className="text-[11px] font-bold">{label}</p>
      <p className="text-[9px] opacity-70">{sub}</p>
    </div>
  );
};

const FlowArrow: FC = () => (
  <div className="flex items-center px-1">
    <ArrowRight size={14} className="text-gray-300" />
  </div>
);

export default ExamInfoPage;
