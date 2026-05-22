import { FC } from 'react';
import Image from 'next/image';

const targetUsers = [
  'Students who want to get grading on chemistry',
  'Students who want to prepare learn chemistry',
  'Student that want to improve their grades',
  'Student who have high interest in chemistry',
  'Student who want to test their knowledge',
];

export const HeroSection: FC = () => {
  return (
    <section
      id="assessment"
      className="relative overflow-hidden bg-[#FAFAF5] px-4 py-16 lg:px-8 lg:py-24"
    >
      {/* Decorative shapes */}
      <div className="absolute -left-8 top-1/4 h-24 w-24 rotate-45 rounded-lg bg-primary-cyan opacity-60" />
      <div className="absolute bottom-1/4 left-10 h-32 w-32 rotate-12 rounded-lg bg-primary-orange opacity-50" />
      <div className="absolute right-1/4 top-16 h-20 w-20 rounded-xl bg-primary opacity-40" />

      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-20">
        {/* Left - Quiz Mockup */}
        <div className="relative flex-1">
          <Image
            src="/images/hero-quiz-mockup.png"
            alt="AKURAT adaptive assessment interface showing misconception detection"
            width={580}
            height={440}
            className="relative z-10 w-full max-w-[580px]"
            priority
          />
        </div>

        {/* Right - Content */}
        <div className="flex-1">
          <h1 className="mb-4 text-4xl font-bold leading-tight text-gray-900 lg:text-5xl">
            <span className="italic text-primary-orange">Guided</span>{' '}
            <span className="font-display">Courses With Every</span>{' '}
            <span className="text-primary">Journey</span>
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-gray-500">
            Experience how AKURAT maps misconceptions in real-time
            <br />
            Select an answer to see the adaptive routing
          </p>

          {/* Target Users List */}
          <ul className="space-y-3">
            {targetUsers.map((user, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-3.5 shadow-xs"
              >
                <span className="text-sm font-medium text-gray-800">
                  {user}
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-orange text-xs font-bold text-white">
                  {i + 1}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};
