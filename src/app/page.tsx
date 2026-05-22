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
    icon: '🎯',
    title: 'Adaptive Testing',
    description: 'Soal menyesuaikan kemampuanmu secara real-time',
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    icon: '🔍',
    title: 'Deteksi Miskonsepsi',
    description: 'Identifikasi kesalahan pemahaman spesifik',
    gradient: 'from-violet-500/10 to-purple-500/10',
  },
  {
    icon: '📊',
    title: 'Analisis Mendalam',
    description: 'Profil pemahaman dan rekomendasi belajar',
    gradient: 'from-emerald-500/10 to-teal-500/10',
  },
  {
    icon: '🏆',
    title: 'Gamifikasi',
    description: 'XP, streak, dan achievements yang menyenangkan',
    gradient: 'from-amber-500/10 to-orange-500/10',
  },
];

const stats = [
  { value: '96+', label: 'Soal Adaptif' },
  { value: '5', label: 'Topik Materi' },
  { value: '3', label: 'Level Kesulitan' },
  { value: '21', label: 'Soal per Ujian' },
];

export default function Home() {
  return (
    <>
      <LandingNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 lg:px-8 lg:pb-32 lg:pt-24">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-blue-50/30 to-white" />
        <div className="absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -left-40 bottom-0 h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-16 lg:flex-row">
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Platform Asesmen Kimia #1 di Indonesia
            </div>

            <h1 className="mb-6 font-display text-4xl font-extrabold leading-[1.1] text-gray-900 lg:text-6xl">
              Kuasai Kimia dengan{' '}
              <span className="bg-gradient-to-r from-primary via-blue-600 to-cyan-500 bg-clip-text text-transparent">
                Cara Cerdas
              </span>
            </h1>

            <p className="mb-8 max-w-lg text-base leading-relaxed text-gray-500 lg:text-lg">
              AKURAT menggunakan AI untuk menyesuaikan soal dengan kemampuanmu,
              mendeteksi miskonsepsi, dan membantu kamu menguasai kimia dengan
              cara yang personal dan menyenangkan.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/register"
                className="group relative overflow-hidden rounded-full bg-primary px-8 py-4 text-center text-sm font-bold text-white shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary/30"
              >
                <span className="relative z-10">Mulai Belajar Gratis</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
              <Link
                href="#features"
                className="rounded-full border border-gray-200 px-8 py-4 text-center text-sm font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
              >
                Lihat Fitur →
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-4 gap-4 border-t border-gray-100 pt-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <p className="text-2xl font-black text-gray-900 lg:text-3xl">
                    {stat.value}
                  </p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative flex-1">
            <div className="relative mx-auto w-fit">
              <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-primary/10 via-cyan-500/5 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl bg-white p-2 shadow-2xl shadow-gray-200/50">
                <Image
                  src="/images/hero-quiz-mockup.png"
                  alt="AKURAT adaptive assessment"
                  width={500}
                  height={380}
                  className="rounded-2xl"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="border-y border-gray-100 bg-gray-50/50 px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-8">
          {topics.map((topic) => (
            <div key={topic.name} className="flex items-center gap-2.5">
              <Image src={topic.icon} alt={topic.name} width={32} height={32} />
              <span className="text-sm font-medium text-gray-600">
                {topic.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-4 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold text-primary">FITUR</p>
            <h2 className="mb-4 font-display text-3xl font-extrabold text-gray-900 lg:text-4xl">
              Belajar yang Disesuaikan Untukmu
            </h2>
            <p className="mx-auto max-w-xl text-gray-500">
              Bukan sekadar latihan soal — AKURAT memahami cara berpikirmu dan
              menyesuaikan pengalaman belajar secara personal.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className={`group rounded-3xl bg-gradient-to-br ${f.gradient} p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
              >
                <span className="mb-4 block text-4xl">{f.icon}</span>
                <h3 className="mb-2 font-display text-base font-bold text-gray-900">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50/50 px-4 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-semibold text-primary">CARA KERJA</p>
          <h2 className="mb-16 font-display text-3xl font-extrabold text-gray-900 lg:text-4xl">
            3 Langkah Mudah
          </h2>

          <div className="grid gap-12 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Pelajari Materi',
                desc: 'Baca materi interaktif dengan rumus kimia dan contoh soal',
              },
              {
                step: '02',
                title: 'Ujian Adaptif',
                desc: 'Sistem menyesuaikan kesulitan berdasarkan jawabanmu',
              },
              {
                step: '03',
                title: 'Lihat Analisis',
                desc: 'Dapatkan profil pemahaman dan rekomendasi belajar',
              },
            ].map((item) => (
              <div key={item.step}>
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  <span className="font-display text-xl font-black text-primary">
                    {item.step}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="px-4 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-2xl">
                ⭐
              </span>
            ))}
          </div>
          <blockquote className="mb-6 font-display text-2xl font-bold leading-relaxed text-gray-900 lg:text-3xl">
            &ldquo;AKURAT membantu saya memahami stoikiometri yang selama ini
            terasa sulit. Soalnya adaptif dan penjelasannya sangat jelas.&rdquo;
          </blockquote>
          <p className="text-sm text-gray-500">— Siswa SMA, pengguna AKURAT</p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl overflow-hidden rounded-[32px] bg-gradient-to-br from-primary via-blue-600 to-cyan-500 p-12 text-center text-white shadow-2xl shadow-primary/20 lg:p-16">
          <h2 className="mb-4 font-display text-3xl font-extrabold lg:text-4xl">
            Siap Kuasai Kimia?
          </h2>
          <p className="mb-8 text-white/80 lg:text-lg">
            Bergabung sekarang dan rasakan belajar kimia yang personal, adaptif,
            dan menyenangkan.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-full bg-white px-10 py-4 text-sm font-bold text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Daftar Gratis Sekarang
          </Link>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}
