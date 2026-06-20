import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const Footer: FC = () => {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex items-center">
            <Image
              src="/icons/Akurat_Logo_Text.svg"
              alt="AKURAT"
              width={110}
              height={41}
              className="h-8 w-auto object-contain"
            />
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <Link href="/about" className="hover:text-gray-700">
              Tentang
            </Link>
            <Link href="/contact" className="hover:text-gray-700">
              Kontak
            </Link>
            <Link href="/privacy" className="hover:text-gray-700">
              Privasi
            </Link>
            <Link href="/terms" className="hover:text-gray-700">
              Ketentuan
            </Link>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} AKURAT. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
