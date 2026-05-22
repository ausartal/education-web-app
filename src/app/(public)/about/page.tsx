import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tentang AKURAT',
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <h1 className="mb-6 font-display text-3xl text-gray-900">
        Tentang AKURAT
      </h1>

      <div className="space-y-6 text-sm leading-relaxed text-gray-600">
        <p>
          <strong className="text-gray-900">AKURAT</strong> (Asesmen Kimia Ukur
          Adaptif Terpadu) adalah platform edukasi berbasis AI yang menggunakan
          teknologi Multistage Adaptive Testing (MSAT) khusus untuk asesmen
          Chemistry Stoichiometry.
        </p>

        <p>
          Platform ini dirancang untuk pembelajaran, latihan, ujian adaptif, dan
          analisis mendalam profil pemahaman konsep serta miskonsepsi siswa.
        </p>

        <h2 className="pt-4 text-lg font-bold text-gray-900">Misi Kami</h2>
        <p>
          Membuka pintu pengetahuan kimia untuk semua siswa dengan pendekatan
          yang adaptif, personal, dan menyenangkan. Kami percaya setiap siswa
          memiliki cara belajar yang unik, dan AKURAT hadir untuk menyesuaikan
          pengalaman belajar dengan kebutuhan masing-masing.
        </p>

        <h2 className="pt-4 text-lg font-bold text-gray-900">Teknologi MSAT</h2>
        <p>
          Multistage Adaptive Testing memungkinkan sistem menyesuaikan tingkat
          kesulitan soal secara real-time berdasarkan jawaban siswa. Jika siswa
          menjawab benar, soal berikutnya akan lebih sulit. Jika salah, sistem
          akan memberikan soal yang lebih mudah sambil mengidentifikasi
          miskonsepsi spesifik.
        </p>

        <h2 className="pt-4 text-lg font-bold text-gray-900">Tim</h2>
        <p>
          AKURAT dikembangkan oleh AKURAT Riset Group — tim peneliti dan
          pengembang yang berdedikasi untuk meningkatkan kualitas pendidikan
          kimia di Indonesia.
        </p>
      </div>
    </div>
  );
}
