'use client';

import { FC, ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { ScientificCalculator } from '@/components/tools/ScientificCalculator';
import { PeriodicTableRef } from '@/components/tools/PeriodicTableRef';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <AuthGuard>
      <Navbar />
      <main
        id="main-content"
        className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-6 md:pb-6"
      >
        {children}
      </main>
      <MobileNav />
      <ScientificCalculator />
      <PeriodicTableRef />
    </AuthGuard>
  );
};

export default DashboardLayout;
