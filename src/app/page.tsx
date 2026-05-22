import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import Image from 'next/image';
import Link from 'next/link';

const topics = [
  { name: 'Konsep Mol', icon: '/images/topic-mol.png' },
  { name: 'Atom', icon: '/images/topic-atom.png' },
  { name: 'Stoikiometri', icon: '/images/topic-stoichiometry.png' },
  { name: 'Reaksi Kimia', icon: '/images/topic-chemical-reaction.png' },
  { name: 'Larutan', icon: '/images/topic-solution.png' },
  { name: 'Tabel Periodik', icon: '/images/topic-periodic-table.png' },
];

const features = [
  {
    emoji: '🎯',
    title: 'Adaptive Testing',
    description:
      'Soal menyesuaikan kemampuanmu secara real-time. Lebih pintar, soal lebih menantang.',
  },
  {
    emoji: '🔍',
    title: 'Deteksi Miskonsepsi',
    description:
      'Sistem mengidentifikasi kesalahan pemahaman spesifik dan memberikan feedback langsung.',
  },
  {
    emoji: '📊',
    title: 'Analisis Mendalam',
    description:
      'Lihat profil pemahamanmu: apa yang sudah dikuasai dan apa yang perlu diperbaiki.',
  },
  {
    emoji: '🏆',
    title: 'Gamifikasi',
    description:
      'XP, streak, achievements, dan leaderboard membuat belajar jadi menyenangkan.',
  },
];

export default function Home() {
  return (
    <>
      <LandingNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white px-4 pb-16 pt-12 lg:px-8 lg:pb-24 lg:pt-20">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-[300px] w-[300px] rounded-full bg-primary-cyan/5 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Left - Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
              <span>🧪</span> Platform Asesmen Kimia Adaptif
            </div>
            <h1 className="mb-5 font-display text-4xl leading-tight text-gray-900 lg:text-5xl xl:text-6xl">
              Belajar Kimia
              <br />
              <span className="bg-gradient-to-r from-primary to-primary-cyan bg-clip-text text-transparent">
                Lebih Cerdas
              </span>
            </h1>
            <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-500 lg:text-lg">
              AKURAT menggunakan AI untuk menyesuaikan soal dengan kemampuanmu,
              mendeteksi miskonsepsi, dan membantu kamu menguasai stoikiometri
              dengan cara yang menyenangkan.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/register"
                className="rounded-full bg-primary px-8 py-3.5 text-center text-sm font-semibold text-white shadow-primary transition-all hover:shadow-lg"
              >
                Mulai Belajar Gratis
              </Link>
              <Link
                href="#features"
                className="rounded-full border border-gray-200 px-8 py-3.5 text-center text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Pelajari Lebih Lanjut
              </Link>
            </div>
          </div>

          {/* Right - Student Image */}
          <div className="relative flex-1">
            <div className="relative mx-auto w-fit">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-primary-cyan/10 blur-2xl" />
              <Image
                src="/images/hero-student-female.png"
                alt="Siswa belajar dengan AKURAT"
                width={420}
                height={420}
                className="relative z-10"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Topics Strip */}
      <section className="border-y border-gray-100 bg-gray-50 px-4 py-8">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-8 overflow-x-auto">
          {topics.map((topic) => (
            <div
              key={topic.name}
              className="flex shrink-0 flex-col items-center gap-2"
            >
              <Image src={topic.icon} alt={topic.name} width={40} height={40} />
              <span className="text-xs font-medium text-gray-600">
                {topic.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-4 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="mb-3 font-display text-3xl text-gray-900 lg:text-4xl">
              Kenapa AKURAT?
            </h2>
            <p className="mx-auto max-w-xl text-sm leading-relaxed text-gray-500">
              Bukan sekadar latihan soal biasa — AKURAT memahami cara berpikirmu
              dan menyesuaikan pengalaman belajar secara personal.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="mb-4 block text-3xl">{feature.emoji}</span>
                <h3 className="mb-2 text-base font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 px-4 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-14 text-center font-display text-3xl text-gray-900 lg:text-4xl">
            Cara Kerja
          </h2>

          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                title: 'Mulai Belajar',
                desc: 'Pelajari materi stoikiometri dari dasar hingga mahir',
              },
              {
                step: '2',
                title: 'Ujian Adaptif',
                desc: 'Sistem menyesuaikan kesulitan soal berdasarkan jawabanmu',
              },
              {
                step: '3',
                title: 'Lihat Hasilnya',
                desc: 'Dapatkan analisis mendalam tentang pemahaman dan miskonsepsimu',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="mb-2 text-base font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-to-r from-primary to-primary-cyan p-10 text-center text-white lg:p-16">
          <h2 className="mb-4 font-display text-3xl lg:text-4xl">
            Siap Mulai Belajar?
          </h2>
          <p className="mb-8 text-sm text-white/80 lg:text-base">
            Bergabung dengan siswa lain yang sudah meningkatkan pemahaman kimia
            mereka dengan AKURAT.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-primary transition-all hover:shadow-lg"
          >
            Daftar Gratis Sekarang
          </Link>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}
