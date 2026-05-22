import type { Metadata } from 'next';
import { Nunito, Ubuntu, Space_Mono } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { OfflineIndicator } from '@/components/shared/OfflineIndicator';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-display',
  display: 'swap',
});

const ubuntu = Ubuntu({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  variable: '--font-body',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AKURAT - Asesmen Kimia Ukur Adaptif Terpadu',
  description:
    'Platform edukasi berbasis AI untuk asesmen Chemistry Stoichiometry dengan Multistage Adaptive Testing',
  manifest: '/manifest.json',
  themeColor: '#1A73E8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${nunito.variable} ${ubuntu.variable} ${spaceMono.variable} antialiased`}
      >
        <AuthProvider>
          <ToastProvider>
            <a href="#main-content" className="skip-to-content">
              Skip to content
            </a>
            <OfflineIndicator />
            {children}
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
