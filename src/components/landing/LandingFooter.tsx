import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const LandingFooter: FC = () => {
  return (
    <footer className="bg-[#F8F9FB] px-4 pt-16 lg:px-8 lg:pt-20">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
          {/* Brand */}
          <div>
            <div className="mb-5">
              <Image
                src="/icons/Akurat_Logo_Text.svg"
                alt="AKURAT"
                width={200}
                height={75}
                className="h-16 w-auto object-contain"
              />
            </div>
            <p className="text-sm leading-relaxed text-gray-500">
              Opening the Door to Chemical Knowledge
            </p>
          </div>

          {/* Nav Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="#learning-resources"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  Contact Us
                </Link>
              </li>
            </ul>

            <ul className="space-y-3">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  Terms of Services
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>

            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:akurat.support@gmail.com"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  akurat.support@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+62123456789000"
                  className="text-sm text-gray-700 transition-colors hover:text-primary"
                >
                  +62 123 456 789 000
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Gradient Divider */}
        <div className="mt-12 h-[2px] rounded-full bg-gradient-to-r from-primary via-blue-500 to-primary-cyan" />

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-gray-500">
            @2026 AKURAT RISET GROUP — All rights reserved
          </p>
          <Link
            href="/cookies"
            className="text-xs text-gray-600 underline-offset-2 hover:underline"
          >
            Cookies Settings
          </Link>
        </div>
      </div>
    </footer>
  );
};
