'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '#learning-material', label: 'Learning material' },
  { href: '#learning-resources', label: 'Learning resources' },
  { href: '#assessment', label: 'Assessment' },
  { href: '#faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
];

export const LandingNavbar: FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? 'border-[#E1E4ED] bg-[#FFFEFC]/95 backdrop-blur-md'
          : 'border-[#E1E4ED] bg-[#FFFEFC]'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:h-20 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/icons/Akurat_Logo_Text.svg"
            alt="AKURAT"
            width={132}
            height={48}
            className="h-10 w-auto object-contain"
          />
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = link.href === pathname;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#EAF0FB] text-[#4867B1]'
                      : 'text-[#626B7E] hover:text-[#4867B1]'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/exam"
            className="flex items-center gap-2 rounded-full border border-[#D8C8FB] bg-[#F4EFFF] px-4 py-2.5 text-sm font-semibold text-[#6320EE] transition-colors hover:bg-[#EADFFF]"
          >
            <Image src="/icons/hero-ujian.svg" alt="" width={16} height={16} />
            MSAT exam
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-[#D9DDE6] bg-white px-5 py-2.5 text-sm font-semibold text-[#344057] transition-colors hover:border-[#AEB7C8]"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[#6320EE] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#5218C7]"
          >
            Get started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white md:hidden">
          <ul className="space-y-1 p-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex gap-2 border-t border-gray-100 p-4">
            <Link
              href="/login"
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-[#0E1E47]"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-center text-sm font-semibold text-white"
            >
              Get started
            </Link>
            <Link
              href="/exam"
              className="flex-1 rounded-xl bg-[#7B6AEF] py-2.5 text-center text-sm font-semibold text-white"
            >
              Exam
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
