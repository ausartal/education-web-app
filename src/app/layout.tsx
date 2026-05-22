import type { Metadata } from 'next';
import { Poppins, Inter, Fira_Code } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AKURAT - Asesmen Kimia Ukur Adaptif Terpadu',
  description:
    'Platform edukasi berbasis AI untuk asesmen Chemistry Stoichiometry dengan Multistage Adaptive Testing',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body
        className={`${poppins.variable} ${inter.variable} ${firaCode.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
