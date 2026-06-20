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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-200/60 bg-white/90 backdrop-blur-md md:hidden">
      <ul className="flex h-[60px] items-center justify-around px-2">
        {tabs.map(tab => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors"
                aria-label={tab.label}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-violet-100'
                    : 'bg-transparent'
                }`}>
                  <Icon
                    size={19}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    className={isActive ? 'text-violet-600' : 'text-stone-400'}
                  />
                </div>
                <span className={isActive ? 'text-violet-600 font-semibold' : 'text-stone-400'}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
