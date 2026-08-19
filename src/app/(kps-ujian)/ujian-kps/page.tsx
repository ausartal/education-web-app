'use client';

import { FC, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { KPS_CONFIG, KPS_INDICATOR_LABELS, KPS_INDICATOR_ORDER } from '@/types/kps';
import {
  FlaskConical,
  Clock,
  Target,
  Layers,
  ArrowRight,
  History,
  Loader2,
  AlertCircle,
  CheckCircle,
  Shield,
  Zap,
  LayoutDashboard,
  BarChart3,
  Award,
  BookOpen,
  Info,
  Menu,
  X,
} from 'lucide-react';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

const KPSLandingPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  const [code, setCode] = useState('');
  const [starting, setStarting] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (!user) return;
  }, [user]);

  const handleStart = async () => {
    if (!code.trim()) {
      addToast('error', 'Masukkan kode akses terlebih dahulu');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    setStarting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/kps/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.completed) { router.push(`/ujian-kps/${data.sessionId}/results`); return; }
        addToast('error', data.error || 'Gagal memulai ujian');
        return;
      }
      sessionStorage.setItem(`exam_init_${data.sessionId}`, JSON.stringify(data));
      router.push(`/ujian-kps/${data.sessionId}`);
    } catch {
      addToast('error', 'Terjadi kesalahan, coba lagi');
    } finally {
      setStarting(false);
    }
  };

  const infoCards = [
    { icon: Target, label: 'Soal', value: `${KPS_CONFIG.totalQuestions}`, desc: 'pertanyaan', gradient: 'from-violet-500 to-indigo-500' },
    { icon: Clock, label: 'Waktu', value: `${KPS_CONFIG.totalDurationMinutes}`, desc: 'menit', gradient: 'from-amber-500 to-orange-500' },
    { icon: Layers, label: 'Tahap', value: `${KPS_CONFIG.totalStages}`, desc: 'adaptif', gradient: 'from-emerald-500 to-teal-500' },
    { icon: FlaskConical, label: 'Indikator', value: '7', desc: 'KPS', gradient: 'from-blue-500 to-cyan-500' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-md shadow-violet-200/50">
              <FlaskConical size={18} className="text-white" />
            </div>
            <span className="font-display text-lg font-extrabold text-stone-800">UKKBI</span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: '/ujian-kps/dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { href: '/ujian-kps/scores', label: 'Skor', icon: BarChart3 },
              { href: '/ujian-kps/credentials', label: 'Sertifikat', icon: Award },
              { href: '/ujian-kps/riwayat', label: 'Riwayat', icon: History },
              { href: '/ujian-kps/learning', label: 'Belajar', icon: BookOpen },
              { href: '/ujian-kps/info', label: 'Info', icon: Info },
            ].map((nav) => {
              const Icon = nav.icon;
              return (
                <button
                  key={nav.href}
                  onClick={() => router.push(nav.href)}
                  className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-500 transition-all hover:bg-stone-50 hover:text-violet-600"
                >
                  <Icon size={13} />
                  {nav.label}
                </button>
              );
            })}
          </nav>

          {/* Mobile Toggle */}
          <button className="md:hidden" onClick={() => setMobileNav(!mobileNav)}>
            {mobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileNav && (
          <div className="border-t border-stone-100 bg-white px-4 py-3 md:hidden">
            <div className="grid grid-cols-3 gap-2">
              {[
                { href: '/ujian-kps/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { href: '/ujian-kps/scores', label: 'Skor', icon: BarChart3 },
                { href: '/ujian-kps/credentials', label: 'Sertifikat', icon: Award },
                { href: '/ujian-kps/riwayat', label: 'Riwayat', icon: History },
                { href: '/ujian-kps/learning', label: 'Belajar', icon: BookOpen },
                { href: '/ujian-kps/info', label: 'Info', icon: Info },
              ].map((nav) => {
                const Icon = nav.icon;
                return (
                  <button
                    key={nav.href}
                    onClick={() => { router.push(nav.href); setMobileNav(false); }}
                    className="flex flex-col items-center gap-1 rounded-xl p-3 text-stone-500 transition-all hover:bg-violet-50 hover:text-violet-600"
                  >
                    <Icon size={18} />
                    <span className="text-[10px] font-semibold">{nav.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        {/* Hero Banner */}
        <motion.div {...fade(0)} className="mb-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 p-8 shadow-xl shadow-indigo-200/40 lg:p-12">
            {/* Decorative circles */}
            <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/5" />
            <div className="absolute right-1/4 top-1/2 h-20 w-20 rounded-full bg-white/5" />

            <div className="relative">
              <div className="mb-4 flex items-center gap-2">
                <span className="rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm">
                  Placement Test
                </span>
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white lg:text-4xl">
                Keterampilan Proses<br />Sains Kimia
              </h1>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-white/70">
                Tes penempatan yang mengukur 7 indikator KPS pada materi Kesetimbangan Kimia
                melalui 3 tahap adaptif dengan tingkat kesulitan bertahap.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                  <Zap size={12} />
                  {KPS_CONFIG.totalQuestions} Soal
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                  <Clock size={12} />
                  {KPS_CONFIG.totalDurationMinutes} Menit
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                  <Shield size={12} />
                  Anti-Cheat
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Code Input + Info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Access Code Card */}
            <motion.div {...fade(0.1)}>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80 lg:p-8">
                <h2 className="font-display text-lg font-extrabold text-stone-800">Masukkan Kode Akses</h2>
                <p className="mt-1 text-sm text-stone-400">Dapatkan kode dari guru atau admin untuk memulai ujian</p>

                <div className="mt-5">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="XXXXXX"
                    maxLength={6}
                    className="w-full rounded-2xl border-2 border-stone-100 bg-stone-50/50 px-5 py-4 text-center font-mono text-3xl font-bold tracking-[0.35em] text-stone-800 transition-all placeholder:tracking-[0.35em] placeholder:text-stone-300 focus:border-violet-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <button
                  onClick={handleStart}
                  disabled={starting || code.length < 6}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:opacity-40 disabled:shadow-none"
                >
                  {starting ? (
                    <><Loader2 size={18} className="animate-spin" /> Memulai...</>
                  ) : (
                    <>Mulai Ujian <ArrowRight size={18} /></>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Info Cards Grid */}
            <motion.div {...fade(0.15)}>
              <div className="grid grid-cols-2 gap-3">
                {infoCards.map((card, i) => {
                  const Icon = card.icon;
                  return (
                    <motion.div
                      key={card.label}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100/80 transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} shadow-sm`}>
                        <Icon size={18} className="text-white" />
                      </div>
                      <p className="font-display text-2xl font-extrabold text-stone-800">{card.value}</p>
                      <p className="text-xs text-stone-400">{card.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* Right: Indicators + Warning */}
          <div className="lg:col-span-2 space-y-6">
            {/* KPS Indicators */}
            <motion.div {...fade(0.2)}>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
                <h3 className="font-display text-sm font-extrabold uppercase tracking-wider text-stone-400">
                  7 Indikator KPS
                </h3>
                <div className="mt-4 space-y-2">
                  {KPS_INDICATOR_ORDER.map((indicator, idx) => (
                    <motion.div
                      key={indicator}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.04 }}
                      className="flex items-center gap-3 rounded-xl bg-stone-50 px-3.5 py-2.5 transition-colors hover:bg-violet-50"
                    >
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 text-[11px] font-bold text-violet-600">
                        {idx + 1}
                      </span>
                      <span className="text-[13px] font-medium text-stone-600">
                        {KPS_INDICATOR_LABELS[indicator]}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Warning Card */}
            <motion.div {...fade(0.3)}>
              <div className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
                <div className="flex gap-3">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-amber-500" />
                  <div>
                    <p className="text-[13px] font-bold text-amber-800">Perhatian</p>
                    <ul className="mt-2 space-y-1.5">
                      {[
                        'Ujian bersifat strict, tidak bisa di-pause',
                        'Timer berjalan terus termasuk saat jeda',
                        'Fullscreen wajib selama ujian',
                        'Jawaban otomatis dikumpulkan saat waktu habis',
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2 text-xs text-amber-700">
                          <CheckCircle size={12} className="mt-0.5 flex-shrink-0 text-amber-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default KPSLandingPage;
