import { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface WelcomeHeroProps {
  name: string;
  streak: number;
}

export const WelcomeHero: FC<WelcomeHeroProps> = ({ name, streak }) => {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-primary-cyan p-6 text-white lg:p-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold">
          Halo, {name.split(' ')[0]}! 👋
        </h1>
        <p className="mb-4 text-sm text-white/80">
          Ayo lanjutkan belajar hari ini
        </p>
        <div className="mb-4 flex items-center gap-2">
          <Image src="/icons/fire.png" alt="streak" width={20} height={20} />
          <span className="text-sm font-semibold">{streak} hari streak</span>
        </div>
        <Link
          href="/materi"
          className="inline-block rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary transition-opacity hover:opacity-90"
        >
          Lanjut Belajar
        </Link>
      </div>
      <Image
        src="/images/hero-student-male.png"
        alt=""
        width={140}
        height={140}
        className="hidden md:block"
      />
    </div>
  );
};
