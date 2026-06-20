import { FC, ReactNode } from 'react';
import Image from 'next/image';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return (
    <main className="flex min-h-screen bg-white">
      {/* Left Panel - Branded with decorative shapes */}
      <div className="relative hidden w-1/2 overflow-hidden bg-[#F4F5F8] lg:block">
        {/* Grid background — perspective grid */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #C7CDD9 1px, transparent 1px), linear-gradient(to bottom, #C7CDD9 1px, transparent 1px)',
            backgroundSize: '52px 52px',
            transform: 'perspective(800px) rotateX(45deg) scale(1.4)',
            transformOrigin: 'center bottom',
          }}
          aria-hidden
        />

        {/* Top-left: Cyan partial circle (ring) */}
        <div
          className="absolute -left-16 -top-16 h-44 w-44 rounded-full border-[28px] border-[#00C2FF]"
          aria-hidden
        />

        {/* Top-center: Purple blur blob */}
        <Image
          src="/icons/shape-rounded.svg"
          alt=""
          width={400}
          height={280}
          className="absolute -top-10 left-1/2 -translate-x-1/4 opacity-90"
          aria-hidden
        />

        {/* Right-middle: Yellow crescent */}
        <div className="absolute right-[12%] top-[42%]" aria-hidden>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M60 0C93.137 0 120 26.863 120 60C120 93.137 93.137 120 60 120C57.5 120 55 119.8 52.5 119.4C76 116 95 96 99 72C103 48 91 26 71 14C68 12 65 11 62 10C61.3 6 60.7 3 60 0Z"
              fill="#FBD300"
            />
          </svg>
        </div>

        {/* Left-middle: Blue/cyan half-moon */}
        <div className="absolute left-[6%] top-[50%]" aria-hidden>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 60C0 26.863 26.863 0 60 0C60 0 60 26 47 47C34 68 0 60 0 60Z"
              fill="#00C2FF"
            />
          </svg>
        </div>

        {/* Bottom-left: Orange star/flame */}
        <Image
          src="/icons/star.svg"
          alt=""
          width={170}
          height={180}
          className="absolute -bottom-2 -left-4"
          aria-hidden
        />

        {/* Bottom-right: Yellow rounded shape */}
        <div className="absolute bottom-[6%] right-[12%]" aria-hidden>
          <svg
            width="140"
            height="140"
            viewBox="0 0 140 140"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M30 10 Q60 0 100 10 Q130 30 130 70 Q120 110 80 130 Q40 130 20 100 Q10 60 30 10 Z"
              fill="#FBD300"
            />
          </svg>
        </div>

        {/* Center Logo */}
        <div className="relative z-10 flex h-full items-center justify-center px-8">
          <Image
            src="/icons/Akurat_Logo_Text.svg"
            alt="AKURAT"
            width={280}
            height={105}
            className="h-auto w-[260px]"
            priority
          />
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
};

export default AuthLayout;
