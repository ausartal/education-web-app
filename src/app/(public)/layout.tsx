import { FC, ReactNode } from 'react';
import { Footer } from '@/components/layout/Footer';

interface PublicLayoutProps {
  children: ReactNode;
}

const PublicLayout: FC<PublicLayoutProps> = ({ children }) => {
  return (
    <>
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
};

export default PublicLayout;
