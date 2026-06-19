'use client';

import { FC, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { TeacherNavbar } from '@/components/layout/TeacherNavbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { TeacherMobileNav } from '@/components/layout/TeacherMobileNav';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { AdminPreviewBanner } from '@/components/admin/AdminPreviewBanner';
import { useAuth } from '@/context/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: FC<DashboardLayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const pathname = usePathname();
  const isTeacher =
    profile?.role === 'teacher' || pathname.startsWith('/teacher');

  return (
    <AuthGuard>
      {isTeacher ? <TeacherNavbar /> : <Navbar />}
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-6 md:pb-6"
      >
        {children}
      </main>
      {isTeacher ? <TeacherMobileNav /> : <MobileNav />}
      <AdminPreviewBanner />
    </AuthGuard>
  );
};

export default DashboardLayout;
