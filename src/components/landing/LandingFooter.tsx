import { FC } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export const LandingFooter: FC = () => {
  return (
    <footer className="bg-gray-50 px-4 pt-14 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Image
                src="/icons/logo-icon.png"
                alt="AKURAT"
                width={44}
                height={44}
              />
              <span className="font-display text-2xl tracking-tight text-gray-900">
                AKURAT
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Opening the Door to Chemical Knowledge
            </p>
          </div>

          {/* Nav Columns */}
          <div className="flex flex-wrap gap-16">
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="#learning-resources"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Contact Us
                </Link>
              </li>
            </ul>

            <ul className="space-y-3">
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Terms of Services
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>

            <ul className="space-y-3">
              <li>
                <a
                  href="mailto:akurat.support@gmail.com"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  akurat.support@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+62123456789000"
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  +62 123 456 789 000
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider - gradient line matching design */}
        <div className="mt-10 h-[2px] bg-gradient-to-r from-primary via-primary-cyan to-primary-orange" />

        {/* Copyright */}
        <div className="flex items-center justify-between py-6">
          <p className="text-xs text-gray-500">@2026 AKURAT RISET GROUP</p>
          <Link
            href="/cookies"
            className="text-xs text-gray-600 underline hover:text-gray-900"
          >
            Cookies Settings
          </Link>
        </div>
      </div>
    </footer>
  );
};
