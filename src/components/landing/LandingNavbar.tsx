'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '#learning-material', label: 'Materi' },
  { href: '#learning-resources', label: 'Sumber belajar' },
  { href: '#assessment', label: 'Asesmen' },
  { href: '/about', label: 'Tentang' },
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
          ? 'border-[#DCE5F2] bg-white/95 backdrop-blur-md'
          : 'border-[#DCE5F2] bg-white'
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
                      ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'text-[#5B6475] hover:text-[#1D4ED8]'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg border border-[#B8C7DC] bg-white px-5 py-2.5 text-sm font-semibold text-[#172033] transition-colors hover:border-[#1D4ED8] hover:text-[#1D4ED8]"
          >
            Masuk
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-[#1D4ED8] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF]"
          >
            Daftar
          </Link>
          <Link
            href="/exam"
            className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-2.5 text-sm font-semibold text-[#1D4ED8] transition-colors hover:bg-[#DBEAFE]"
          >
            Ujian MSAT
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
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
              Masuk
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-center text-sm font-semibold text-white"
            >
              Daftar
            </Link>
            <Link
              href="/exam"
              className="flex-1 rounded-xl bg-[#7B6AEF] py-2.5 text-center text-sm font-semibold text-white"
            >
              Ujian
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
