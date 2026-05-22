import { Metadata } from 'next';
import Image from 'next/image';

export const metadata: Metadata = { title: 'Tentang AKURAT' };

const values = [
  {
    icon: '🎯',
    title: 'Adaptif',
    desc: 'Menyesuaikan dengan kemampuan setiap siswa',
  },
  {
    icon: '🔬',
    title: 'Berbasis Riset',
    desc: 'Dibangun di atas teori IRT dan MSAT',
  },
  {
    icon: '🎮',
    title: 'Menyenangkan',
    desc: 'Gamifikasi yang memotivasi belajar',
  },
  {
    icon: '📊',
    title: 'Data-Driven',
    desc: 'Analisis mendalam untuk setiap siswa',
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:py-24">
      {/* Hero */}
      <div className="mb-16 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-cyan shadow-lg shadow-primary/20">
          <Image src="/icons/logo-icon.png" alt="" width={40} height={40} />
        </div>
        <h1 className="mb-4 font-display text-4xl font-extrabold text-gray-900">
          Tentang AKURAT
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-relaxed text-gray-500">
          Platform asesmen kimia adaptif yang menggunakan AI untuk memahami cara
          berpikir siswa dan menyesuaikan pengalaman belajar secara personal.
        </p>
      </div>

      {/* Mission */}
      <div className="mb-16 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-10 lg:p-14">
        <h2 className="mb-4 font-display text-2xl font-extrabold text-gray-900">
          Misi Kami
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-600">
          Membuka pintu pengetahuan kimia untuk semua siswa dengan pendekatan
          yang adaptif, personal, dan menyenangkan. Kami percaya setiap siswa
          memiliki cara belajar yang unik, dan AKURAT hadir untuk menyesuaikan
          pengalaman belajar dengan kebutuhan masing-masing.
        </p>
      </div>

      {/* Values */}
      <div className="mb-16">
        <h2 className="mb-8 text-center font-display text-2xl font-extrabold text-gray-900">
          Nilai Kami
        </h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="mb-3 block text-3xl">{v.icon}</span>
              <h3 className="mb-1 font-display text-sm font-bold text-gray-900">
                {v.title}
              </h3>
              <p className="text-xs text-gray-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Technology */}
      <div className="mb-16 rounded-3xl bg-gray-900 p-10 text-white lg:p-14">
        <h2 className="mb-4 font-display text-2xl font-extrabold">
          Teknologi MSAT
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-gray-300">
          Multistage Adaptive Testing memungkinkan sistem menyesuaikan tingkat
          kesulitan soal secara real-time. Jika siswa menjawab benar, soal
          berikutnya lebih sulit. Jika salah, sistem memberikan soal lebih mudah
          sambil mengidentifikasi miskonsepsi spesifik yang dimiliki siswa.
        </p>
      </div>

      {/* Team */}
      <div className="text-center">
        <h2 className="mb-3 font-display text-2xl font-extrabold text-gray-900">
          Tim
        </h2>
        <p className="text-sm text-gray-500">
          Dikembangkan oleh <strong>AKURAT Riset Group</strong> — tim peneliti
          dan pengembang yang berdedikasi untuk meningkatkan kualitas pendidikan
          kimia di Indonesia.
        </p>
      </div>
    </div>
  );
}
