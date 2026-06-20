'use client';

import { FC } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, HelpCircle, Users, ClipboardList, School } from 'lucide-react';

const teacherTabs = [
  { href: '/teacher', label: 'Home', icon: Home },
  { href: '/teacher/kelas', label: 'Kelas', icon: School },
  { href: '/teacher/ujian', label: 'Ujian', icon: ClipboardList },
  { href: '/teacher/materials', label: 'Materi', icon: BookOpen },
  { href: '/teacher/students', label: 'Siswa', icon: Users },
];

export const TeacherMobileNav: FC = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <ul className="flex h-14 items-center justify-around">
        {teacherTabs.map((tab) => {
          const isActive =
            tab.href === '/teacher'
              ? pathname === '/teacher'
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 text-xs transition-colors ${
                  isActive
                    ? 'text-emerald-600'
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
