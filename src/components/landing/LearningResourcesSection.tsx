import { FC } from 'react';
import Image from 'next/image';

const features = [
  {
    title: 'Tutorial video',
    description:
      'Watch interesting and informative videos to learn various chemistry topics.',
    image: '/images/features-grid.png',
    highlight: false,
  },
  {
    title: 'Discussion forum',
    description:
      'Join online discussion forums to exchange ideas with other students and get help from teachers.',
    image: '/images/features-grid.png',
    highlight: false,
  },
  {
    title: 'Practice and quizzes',
    description:
      'Test your understanding with challenging interactive exercises and quizzes.',
    image: '/images/features-grid.png',
    highlight: false,
  },
  {
    title: 'Learning materials',
    description:
      'Access comprehensive learning materials, including notes, diagrams, and a glossary.',
    image: '/images/features-grid.png',
    highlight: false,
  },
  {
    title: 'Guidance from experienced tutors',
    description:
      'Our team of experienced and professional tutors is ready to help you answer questions and provide the guidance you need.',
    image: '/images/features-grid.png',
    highlight: true,
  },
  {
    title: 'Real Assessment',
    description:
      'Test your understanding with challenging interactive exercises and quizzes.',
    image: '/images/features-grid.png',
    highlight: false,
  },
];

export const LearningResourcesSection: FC = () => {
  return (
    <section id="learning-resources" className="px-4 py-16 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="font-display text-3xl text-gray-900 lg:text-4xl">
            What do you get at
            <br />
            <span className="text-primary">AKURAT?</span>
          </h2>
          <p className="max-w-lg text-sm text-gray-500">
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
              className={`rounded-2xl p-6 ${
                feature.highlight
                  ? 'bg-yellow-50'
                  : 'border border-gray-100 bg-white'
              }`}
            >
              <div className="mb-6 h-32 w-full overflow-hidden rounded-lg">
                <Image
                  src={feature.image}
                  alt={feature.title}
                  width={300}
                  height={128}
                  className="h-full w-full object-cover object-top"
                />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
