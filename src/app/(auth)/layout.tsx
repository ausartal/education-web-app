import { FC, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout: FC<AuthLayoutProps> = ({ children }) => {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FBFAFE] lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative hidden min-h-screen overflow-hidden border-r border-[#E7E1F1] bg-[#F4F0FC] px-12 py-10 lg:flex lg:flex-col xl:px-16">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at center, rgba(99,32,238,0.11) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
          aria-hidden
        />
        <div className="absolute -left-28 top-1/4 h-64 w-64 rounded-full bg-[#F59E0B]/15 blur-2xl" />
        <div className="absolute -right-28 bottom-20 h-80 w-80 rounded-full bg-[#6320EE]/15 blur-3xl" />

        <Link href="/" className="relative z-10 w-fit" aria-label="AKURAT home">
          <Image
            src="/icons/Akurat_Logo_Text.svg"
            alt="AKURAT"
            width={152}
            height={56}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>

        <div className="relative z-10 my-auto max-w-xl">
          <h2 className="font-display text-5xl font-extrabold leading-[1.04] text-[#27254F] xl:text-6xl">
            Build confidence,
            <span className="block text-[#6320EE]">one concept</span>
            <span className="block">
              at a <span className="text-[#F59E0B]">time.</span>
            </span>
          </h2>
          <p className="mt-7 max-w-lg text-base leading-7 text-slate-600">
            Understand misconceptions, follow a personalized learning path, and
            see measurable progress in chemistry.
          </p>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {[
              'Adaptive assessments',
              'Clear learning progress',
              'Guided chemistry practice',
              'Support for every level',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2.5 text-sm font-semibold text-[#343150]"
              >
                <CheckCircle2
                  size={18}
                  className="text-[#6320EE]"
                  aria-hidden
                />
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          © 2026 AKURAT. Chemistry learning, measured with precision.
        </p>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12 xl:px-20">
        <div className="absolute left-5 top-5 flex w-[calc(100%-2.5rem)] items-center justify-between lg:left-10 lg:top-8 lg:w-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-[#6320EE]"
          >
            <ArrowLeft size={16} aria-hidden />
            Back to home
          </Link>
          <Link href="/" className="lg:hidden" aria-label="AKURAT home">
            <Image
              src="/icons/Akurat_Logo_Text.svg"
              alt="AKURAT"
              width={112}
              height={42}
              className="h-8 w-auto"
              priority
            />
          </Link>
        </div>

        <div className="w-full max-w-[500px] pt-12 lg:pt-0">{children}</div>
      </section>
    </main>
  );
};

export default AuthLayout;
