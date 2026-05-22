'use client';

import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#learning-material', label: 'Learning Material' },
  { href: '#learning-resources', label: 'Learning Resources' },
  { href: '#assessment', label: 'Assessment' },
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
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'border-b border-gray-100 bg-white/85 shadow-sm backdrop-blur-md'
          : 'bg-white'
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:h-20 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/icons/logo-icon.png"
            alt="AKURAT"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
          />
          <span className="font-display text-xl font-extrabold tracking-tight text-[#0E1E47]">
            AKURAT
          </span>
        </Link>

        {/* Desktop Nav */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => {
            const isActive = link.href === '/' && pathname === '/';
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'text-[#5841EA]'
                      : 'text-gray-600 hover:text-[#5841EA]'
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
            className="rounded-xl border border-gray-200 bg-white px-6 py-2.5 text-sm font-semibold text-[#0E1E47] transition-colors hover:bg-gray-50"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-[#5841EA] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#5841EA]/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
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
          <div className="flex gap-3 border-t border-gray-100 p-4">
            <Link
              href="/login"
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-center text-sm font-semibold text-[#0E1E47]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex-1 rounded-xl bg-[#5841EA] py-2.5 text-center text-sm font-semibold text-white"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
