import { Metadata } from 'next';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export const metadata: Metadata = { title: 'Contact Us - AKURAT' };

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'akurat.support@gmail.com',
    href: 'mailto:akurat.support@gmail.com',
  },
  {
    icon: Phone,
    label: 'Telepon',
    value: '+62 123 456 789 000',
    href: 'tel:+62123456789000',
  },
  { icon: MapPin, label: 'Lokasi', value: 'Indonesia', href: null },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 lg:py-24">
      {/* Header */}
      <div className="mb-14 text-center">
        <h1 className="mb-3 font-display text-3xl font-extrabold text-gray-900">
          Hubungi Kami
        </h1>
        <p className="mx-auto max-w-md text-sm text-gray-500">
          Punya pertanyaan atau feedback? Kami senang mendengar dari Anda.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        {/* Contact Info */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-blue-600 to-primary-cyan p-8 text-white">
            <h2 className="mb-6 font-display text-lg font-bold">
              Informasi Kontak
            </h2>
            <div className="space-y-6">
              {contactInfo.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-xs text-white/60">{item.label}</p>
                      {item.href ? (
                        <a
                          href={item.href}
                          className="text-sm font-medium hover:underline"
                        >
                          {item.value}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">{item.value}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Decorative */}
            <div className="mt-12 flex gap-2">
              <div className="h-2 w-2 rounded-full bg-white/30" />
              <div className="h-2 w-2 rounded-full bg-white/20" />
              <div className="h-2 w-2 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-3">
          <form className="space-y-5 rounded-3xl bg-white p-8 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Nama
                </label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                  placeholder="Nama lengkap"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                  placeholder="nama@email.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Subjek
              </label>
              <input
                type="text"
                className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                placeholder="Topik pesan"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Pesan
              </label>
              <textarea
                rows={5}
                required
                className="w-full rounded-xl border-0 bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20"
                placeholder="Tulis pesan Anda..."
              />
            </div>
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 text-sm font-bold text-white shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              <Send size={16} /> Kirim Pesan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
