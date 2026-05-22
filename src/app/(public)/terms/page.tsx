import { Metadata } from 'next';
import { FileText } from 'lucide-react';

export const metadata: Metadata = { title: 'Terms of Service - AKURAT' };

const sections = [
  {
    title: '1. Penerimaan Ketentuan',
    content:
      'Dengan mengakses dan menggunakan platform AKURAT, Anda menyetujui untuk terikat oleh ketentuan layanan ini. Jika Anda tidak setuju, harap tidak menggunakan layanan kami.',
  },
  {
    title: '2. Akun Pengguna',
    content:
      'Anda bertanggung jawab menjaga kerahasiaan akun dan password Anda. Setiap aktivitas yang terjadi di akun Anda menjadi tanggung jawab Anda. Segera laporkan jika ada akses tidak sah.',
  },
  {
    title: '3. Penggunaan yang Diperbolehkan',
    content:
      'Platform ini hanya boleh digunakan untuk tujuan edukasi. Dilarang menyalin soal, membagikan jawaban ujian, menggunakan bot/script, atau melakukan tindakan yang merugikan pengguna lain.',
  },
  {
    title: '4. Hak Kekayaan Intelektual',
    content:
      'Semua materi, soal, algoritma, dan konten di platform AKURAT dilindungi hak cipta. Pengguna tidak diperkenankan memperbanyak atau mendistribusikan konten tanpa izin tertulis dari AKURAT Riset Group.',
  },
  {
    title: '5. Pembatasan Tanggung Jawab',
    content:
      'AKURAT menyediakan layanan "sebagaimana adanya". Kami berusaha menjaga ketersediaan platform, namun tidak menjamin layanan akan selalu tersedia tanpa gangguan.',
  },
  {
    title: '6. Perubahan Ketentuan',
    content:
      'Kami berhak mengubah ketentuan ini sewaktu-waktu. Perubahan akan diinformasikan melalui email atau notifikasi dalam aplikasi. Penggunaan berkelanjutan setelah perubahan berarti Anda menyetujui ketentuan baru.',
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 lg:py-24">
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100">
          <FileText size={24} className="text-violet-600" />
        </div>
        <h1 className="mb-3 font-display text-3xl font-extrabold text-gray-900">
          Terms of Service
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
