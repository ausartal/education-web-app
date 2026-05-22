import { FC, ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return (
    <main className="flex min-h-screen">
      {/* Left Panel - Branded */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gray-50 lg:block">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Decorative shapes */}
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-primary-cyan opacity-80" />
        <div className="absolute right-20 top-10 h-32 w-32 rounded-full bg-primary blur-3xl" />
        <div className="absolute -left-5 bottom-40 h-36 w-36 rotate-45 rounded-lg bg-primary-cyan opacity-70" />
        <div className="absolute bottom-20 right-10 h-40 w-40 rotate-12 rounded-lg bg-primary-orange opacity-70" />
        <div className="absolute -bottom-5 -left-5 text-6xl">⭐</div>
        <div className="absolute right-32 top-1/3 h-20 w-20 rounded-full border-[6px] border-primary-orange opacity-80" />

        {/* Center Logo */}
        <div className="relative flex h-full items-center justify-center">
          <Image
            src="/icons/logo-horizontal.png"
            alt="AKURAT"
            width={320}
            height={80}
            className="relative z-10"
          />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
};

export default AuthLayout;
