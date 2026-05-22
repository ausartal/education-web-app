import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - AKURAT',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <h1 className="mb-6 font-display text-3xl text-gray-900">
        Terms of Service
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Terakhir diperbarui: 22 Mei 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-600">
        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            1. Penerimaan Ketentuan
          </h2>
          <p>
            Dengan mengakses dan menggunakan platform AKURAT, Anda menyetujui
            untuk terikat oleh ketentuan layanan ini.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            2. Akun Pengguna
          </h2>
          <p>
            Anda bertanggung jawab menjaga kerahasiaan akun dan password Anda.
            Setiap aktivitas yang terjadi di akun Anda menjadi tanggung jawab
            Anda.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            3. Penggunaan yang Diperbolehkan
          </h2>
          <p>
            Platform ini hanya boleh digunakan untuk tujuan edukasi. Dilarang
            menyalin soal, membagikan jawaban ujian, atau menggunakan bot/script
            untuk mengakses platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            4. Konten dan Hak Kekayaan Intelektual
          </h2>
          <p>
            Semua materi, soal, dan konten di platform AKURAT dilindungi hak
            cipta. Pengguna tidak diperkenankan memperbanyak atau
            mendistribusikan konten tanpa izin tertulis.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            5. Pembatasan Tanggung Jawab
          </h2>
          <p>
            AKURAT menyediakan layanan &quot;sebagaimana adanya&quot;. Kami
            tidak menjamin bahwa platform akan selalu tersedia tanpa gangguan.
          </p>
        </section>
      </div>
    </div>
  );
}
