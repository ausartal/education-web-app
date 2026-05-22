import { FC } from 'react';
import Image from 'next/image';

const features = [
  {
    title: 'Tutorial video',
    description:
      'Watch interesting and informative videos to learn various chemistry topics.',
    highlight: false,
  },
  {
    title: 'Discussion forum',
    description:
      'Join online discussion forums to exchange ideas with other students and get help from teachers.',
    highlight: false,
  },
  {
    title: 'Practice and quizzes',
    description:
      'Test your understanding with challenging interactive exercises and quizzes.',
    highlight: false,
  },
  {
    title: 'Learning materials',
    description:
      'Access comprehensive learning materials, including notes, diagrams, and a glossary.',
    highlight: false,
  },
  {
    title: 'Guidance from experienced tutors',
    description:
      'Our team of experienced and professional tutors is ready to help you answer questions and provide the guidance you need.',
    highlight: true,
  },
  {
    title: 'Real Assessment',
    description:
      'Test your understanding with challenging interactive exercises and quizzes.',
    highlight: false,
  },
];

export const LearningResourcesSection: FC = () => {
  return (
    <section id="learning-resources" className="px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <h2 className="font-display text-3xl leading-tight text-gray-900 lg:text-4xl">
            What do you get at
            <br />
            <span className="text-primary">AKURAT?</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-gray-500 lg:text-right">
            AKURAT is an online learning platform specifically designed to help
            you learn chemistry easily, fun and effectively. We offer a variety
            of learning programs tailored to your needs and learning level.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`rounded-2xl p-6 pb-8 ${
                feature.highlight
                  ? 'bg-[#FFF9E6]'
                  : 'border border-gray-100 bg-white'
              }`}
            >
              <div className="mb-6 flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                <Image
                  src="/images/features-grid.png"
                  alt={feature.title}
                  width={200}
                  height={140}
                  className="h-auto w-auto max-h-32 object-contain"
                />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-gray-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
