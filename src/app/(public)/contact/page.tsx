import { Metadata } from 'next';
import { Mail, Phone, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact Us - AKURAT',
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:py-24">
      <h1 className="mb-3 font-display text-3xl text-gray-900">Contact Us</h1>
      <p className="mb-12 text-sm text-gray-500">
        Punya pertanyaan? Hubungi kami melalui form di bawah atau kontak
        langsung.
      </p>

      <div className="grid gap-12 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Mail size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Email</h3>
              <a
                href="mailto:akurat.support@gmail.com"
                className="text-sm text-gray-600 hover:text-primary"
              >
                akurat.support@gmail.com
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Phone size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Telepon</h3>
              <a
                href="tel:+62123456789000"
                className="text-sm text-gray-600 hover:text-primary"
              >
                +62 123 456 789 000
              </a>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Alamat</h3>
              <p className="text-sm text-gray-600">Indonesia</p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <form className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">
              Nama
            </label>
            <input
              type="text"
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">
              Email
            </label>
            <input
              type="email"
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-900">
              Pesan
            </label>
            <textarea
              rows={5}
              required
              className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              placeholder="Tulis pesan Anda..."
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Kirim Pesan
          </button>
        </form>
      </div>
    </div>
  );
}
