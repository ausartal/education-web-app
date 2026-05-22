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
      className="bg-[#FAFAF5] px-4 py-16 lg:px-8 lg:py-24"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
        {/* Left - Quiz Mockup */}
        <div className="relative flex-1">
          <Image
            src="/images/hero-quiz-mockup.png"
            alt="AKURAT adaptive assessment interface"
            width={600}
            height={450}
            className="w-full max-w-lg"
            priority
          />
        </div>

        {/* Right - Content */}
        <div className="flex-1">
          <h1 className="mb-4 font-display text-4xl leading-tight text-gray-900 lg:text-5xl">
            <span className="text-primary-orange">Guided</span> Courses With
            Every <span className="text-primary">Journey</span>
          </h1>
          <p className="mb-8 text-gray-500">
            Experience how AKURAT maps misconceptions in real-time
            <br />
            Select an answer to see the adaptive routing
          </p>

          {/* Target Users List */}
          <ul className="space-y-3">
            {targetUsers.map((user, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-white px-5 py-3"
              >
                <span className="text-sm font-medium text-gray-800">
                  {user}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-orange text-xs font-bold text-white">
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
