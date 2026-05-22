import { FC, ReactNode } from 'react';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout: FC<PublicLayoutProps> = ({ children }) => {
  return (
    <>
      <LandingNavbar />
      <main className="min-h-screen">{children}</main>
      <LandingFooter />
    </>
  );
};

export default PublicLayout;
