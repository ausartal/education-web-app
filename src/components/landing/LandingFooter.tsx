import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const navColumns = [
  {
    links: [
      { href: '/', label: 'Home' },
      { href: '#learning-resources', label: 'Features' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/contact', label: 'Contact Us' },
    ],
  },
  {
    links: [
      { href: '/terms', label: 'Terms of Services' },
      { href: '/privacy', label: 'Privacy Policy' },
    ],
  },
  {
    links: [
      {
        href: 'mailto:akurat.support@gmail.com',
        label: 'akurat.support@gmail.com',
      },
      { href: 'tel:+62123456789000', label: '+62 123 456 789 000' },
    ],
  },
];

export const LandingFooter: FC = () => {
  return (
    <footer className="bg-gray-50 px-4 pt-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              <Image
                src="/icons/logo-icon.png"
                alt="AKURAT"
                width={40}
                height={40}
              />
              <span className="font-display text-xl text-gray-900">AKURAT</span>
            </div>
            <p className="text-sm text-gray-500">
              Opening the Door to Chemical Knowledge
            </p>
          </div>

          {/* Nav Columns */}
          <div className="flex flex-wrap gap-12 lg:gap-16">
            {navColumns.map((col, i) => (
              <ul key={i} className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="mt-10 border-t border-gray-200" />

        {/* Copyright */}
        <div className="flex items-center justify-between py-6">
          <p className="text-xs text-gray-500">@2026 AKURAT RISET GROUP</p>
          <Link
            href="/cookies"
            className="text-xs text-gray-600 hover:text-gray-900"
          >
            Cookies Settings
          </Link>
        </div>
      </div>
    </footer>
  );
};
