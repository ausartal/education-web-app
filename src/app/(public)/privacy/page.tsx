import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - AKURAT',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      <h1 className="mb-6 font-display text-3xl text-gray-900">
        Privacy Policy
      </h1>
      <p className="mb-8 text-sm text-gray-500">
        Terakhir diperbarui: 22 Mei 2026
      </p>

      <div className="space-y-6 text-sm leading-relaxed text-gray-600">
        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            1. Informasi yang Kami Kumpulkan
          </h2>
          <p>
            Kami mengumpulkan informasi yang Anda berikan saat mendaftar (nama,
            email, sekolah) serta data penggunaan platform (jawaban quiz, waktu
            belajar, progress).
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            2. Penggunaan Informasi
          </h2>
          <p>
            Data Anda digunakan untuk menyediakan layanan adaptif, menganalisis
            miskonsepsi, melacak progress belajar, dan meningkatkan kualitas
            platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            3. Keamanan Data
          </h2>
          <p>
            Kami menggunakan Firebase Authentication dan Firestore dengan
            security rules ketat untuk melindungi data Anda. Password dienkripsi
            dan tidak pernah disimpan dalam bentuk plain text.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">
            4. Berbagi Data
          </h2>
          <p>
            Kami tidak menjual atau membagikan data pribadi Anda kepada pihak
            ketiga. Data hanya diakses oleh guru/admin yang berwenang dalam
            konteks pembelajaran.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-bold text-gray-900">5. Kontak</h2>
          <p>
            Untuk pertanyaan terkait privasi, hubungi kami di{' '}
            <a
              href="mailto:akurat.support@gmail.com"
              className="text-primary hover:underline"
            >
              akurat.support@gmail.com
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
