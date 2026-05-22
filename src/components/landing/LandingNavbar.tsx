import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '#learning-material', label: 'Learning Material' },
  { href: '#learning-resources', label: 'Learning Resources' },
  { href: '#assessment', label: 'Assessment' },
];

export const LandingNavbar: FC = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/icons/logo-icon.png"
            alt="AKURAT"
            width={32}
            height={32}
          />
          <span className="font-display text-lg tracking-tight text-gray-900">
            AKURAT
          </span>
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-gray-800 px-5 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
        </div>
      </nav>
    </header>
  );
};
