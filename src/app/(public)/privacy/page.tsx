import { Metadata } from 'next';
import { Shield } from 'lucide-react';

export const metadata: Metadata = { title: 'Privacy Policy - AKURAT' };

const sections = [
  {
    title: '1. Informasi yang Kami Kumpulkan',
    content:
      'Kami mengumpulkan informasi yang Anda berikan saat mendaftar (nama, email, sekolah) serta data penggunaan platform (jawaban quiz, waktu belajar, progress). Data ini digunakan semata-mata untuk meningkatkan pengalaman belajar Anda.',
  },
  {
    title: '2. Penggunaan Informasi',
    content:
      'Data Anda digunakan untuk menyediakan layanan adaptif, menganalisis miskonsepsi, melacak progress belajar, dan meningkatkan kualitas platform. Kami tidak menggunakan data Anda untuk tujuan iklan.',
  },
  {
    title: '3. Keamanan Data',
    content:
      'Kami menggunakan Firebase Authentication dan Firestore dengan security rules ketat untuk melindungi data Anda. Password dienkripsi dan tidak pernah disimpan dalam bentuk plain text. Semua komunikasi menggunakan HTTPS.',
  },
  {
    title: '4. Berbagi Data',
    content:
      'Kami tidak menjual atau membagikan data pribadi Anda kepada pihak ketiga. Data hanya diakses oleh guru/admin yang berwenang dalam konteks pembelajaran.',
  },
  {
    title: '5. Hak Anda',
    content:
      'Anda berhak mengakses, memperbarui, atau menghapus data pribadi Anda kapan saja melalui halaman Settings. Untuk penghapusan akun permanen, hubungi tim support kami.',
  },
  {
    title: '6. Kontak',
    content:
      'Untuk pertanyaan terkait privasi, hubungi kami di akurat.support@gmail.com',
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Shield size={24} className="text-primary" />
        </div>
        <h1 className="mb-3 font-display text-3xl font-extrabold text-gray-900">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-500">
          Terakhir diperbarui: 22 Mei 2026
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.title} className="rounded-2xl bg-white p-7 shadow-sm">
            <h2 className="mb-3 font-display text-base font-bold text-gray-900">
              {s.title}
            </h2>
            <p className="text-sm leading-relaxed text-gray-600">{s.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
