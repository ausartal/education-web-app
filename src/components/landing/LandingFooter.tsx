import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const footerGroups = [
  {
    title: 'Explore',
    links: [
      { href: '/', label: 'Home' },
      { href: '/#learning-material', label: 'Learning Material' },
      { href: '/#learning-resources', label: 'Learning Resources' },
      { href: '/#assessment', label: 'Assessment' },
    ],
  },
  {
    title: 'Information',
    links: [
      { href: '/#faq', label: 'FAQ' },
      { href: '/#pricing', label: 'Assessment Pricing' },
      { href: '/#contact', label: 'Contact Support' },
    ],
  },
];

export const LandingFooter: FC = () => {
  return (
    <footer className="border-t border-[#E8E5F0] bg-[#F8F7FB] px-4 pt-16 lg:px-8 lg:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_2fr] lg:gap-20">
          <div>
            <Link href="/" aria-label="AKURAT home">
              <Image
                src="/icons/Akurat_Logo_Text.svg"
                alt="AKURAT"
                width={160}
                height={58}
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-600">
              Precision chemistry assessment and adaptive learning pathways
              designed to turn misconceptions into lasting understanding.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-[#1E1B4B]">
                  {group.title}
                </h3>
                <ul className="space-y-3">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-600 transition-colors hover:text-[#6320EE]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.08em] text-[#1E1B4B]">
                Contact
              </h3>
              <ul className="space-y-3">
                <li>
                  <a
                    href="mailto:akurat.support@gmail.com"
                    className="break-all text-sm text-slate-600 transition-colors hover:text-[#6320EE]"
                  >
                    akurat.support@gmail.com
                  </a>
                </li>
                <li>
                  <a
                    href="tel:+62123456789000"
                    className="text-sm text-slate-600 transition-colors hover:text-[#6320EE]"
                  >
                    +62 123 456 789 000
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 h-px bg-[#DDDDE5]" />
        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © 2026 AKURAT. All rights reserved.
          </p>
          <p className="text-xs text-slate-500">
            Chemistry learning, measured with precision.
          </p>
        </div>
      </div>
    </footer>
  );
};
