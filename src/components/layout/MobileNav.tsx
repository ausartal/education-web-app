'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, School, GraduationCap, BookOpen, User } from 'lucide-react';

const tabs = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/kelas', label: 'Kelas', icon: School },
  { href: '/ujian', label: 'Ujian', icon: GraduationCap },
  { href: '/materi', label: 'Materi', icon: BookOpen },
  { href: '/profile', label: 'Profil', icon: User },
];

export const MobileNav: FC = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <ul className="flex h-14 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
                aria-label={tab.label}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
