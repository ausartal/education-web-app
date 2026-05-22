'use client';

import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const targetUsers = [
  'Students who want to get grading on chemistry',
  'Students who want to prepare learn chemistry',
  'Students who want to improve their grades',
  'Students who have high interest in chemistry',
  'Students who want to test their knowledge',
];

const chemistryTopics = [
  {
    name: 'Compound',
    desc: 'Substances consisting of 2+ elements',
    icon: '/images/topic-compound.png',
  },
  {
    name: 'Atom',
    desc: 'The smallest building of matter',
    icon: '/images/topic-atom.png',
  },
  {
    name: 'Periodic Table',
    desc: 'A map that organizes all elements',
    icon: '/images/topic-periodic-table.png',
  },
  {
    name: 'Mol',
    desc: 'Unit for counting the number of particles',
    icon: '/images/topic-mol.png',
  },
  {
    name: 'Chemical Reaction',
    desc: 'Symbolic changes in substances in reactions',
    icon: '/images/topic-chemical-reaction.png',
  },
  {
    name: 'Stoichiometry',
    desc: '"Calculating" in chemical reactions',
    icon: '/images/topic-stoichiometry.png',
  },
  {
    name: 'Solution',
    desc: 'A mixture of solute and solvent',
    icon: '/images/topic-solution.png',
  },
];

const features = [
  {
    title: 'Tutorial video',
    description:
      'Watch interesting and informative videos to learn various chemistry topics.',
    icon: '/icons/feature-video-learning.svg',
    bg: 'bg-[#EFF1FE]',
  },
  {
    title: 'Discussion forum',
    description:
      'Join online discussion forums to exchange ideas with other students and get help from teachers.',
    icon: '/icons/feature-discussion-forum.svg',
    bg: 'bg-white border border-gray-100',
  },
  {
    title: 'Practice and quizzes',
    description:
      'Test your understanding with challenging interactive exercises and quizzes.',
    icon: '/icons/feature-quiz-table.svg',
    bg: 'bg-[#F1F3F8]',
  },
  {
    title: 'Learning materials',
    description:
      'Access comprehensive learning materials, including notes, diagrams, and a glossary.',
    icon: '/icons/feature-learning-materials.svg',
    bg: 'bg-white border border-gray-100',
  },
  {
    title: 'Guidance from experienced tutors',
    description:
      'Our team of experienced and professional tutors is ready to help you answer questions and provide the guidance you need.',
    icon: '/icons/feature-community.svg',
    bg: 'bg-[#FFF9E6]',
  },
  {
    title: 'Real Assessment',
    description:
      'Test your understanding with challenging interactive exercises and quizzes.',
    icon: '/icons/feature-reading-book.svg',
    bg: 'bg-[#F1F3F8]',
  },
];

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push(profile?.role === 'teacher' ? '/teacher' : '/dashboard');
    }
  }, [user, profile, loading, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <LandingNavbar />

      {/* Hero - Assessment Section */}
      <section
        id="assessment"
        className="relative overflow-hidden bg-[#FFFCEF] px-4 py-20 lg:px-8 lg:py-28"
      >
        {/* Decorative shapes */}
        <Image
          src="/icons/shape-rect-blue.svg"
          alt=""
          width={80}
          height={80}
          className="absolute left-[5%] top-[15%] hidden h-20 w-20 lg:block"
          aria-hidden
        />
        <Image
          src="/icons/dot-cyan.svg"
          alt=""
          width={48}
          height={48}
          className="absolute left-[8%] top-[30%] hidden lg:block"
          aria-hidden
        />
        <Image
          src="/icons/shape-rect-purple.svg"
          alt=""
          width={120}
          height={120}
          className="absolute left-[42%] top-[20%] hidden h-32 w-32 lg:block"
          aria-hidden
        />
        <Image
          src="/icons/dot-yellow.svg"
          alt=""
          width={56}
          height={56}
          className="absolute bottom-[20%] left-[8%] hidden lg:block"
          aria-hidden
        />
        <Image
          src="/icons/star.svg"
          alt=""
          width={56}
          height={56}
          className="absolute bottom-[15%] left-[35%] hidden lg:block"
          aria-hidden
        />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Left - Quiz Mockup */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative flex-1"
          >
            <Image
              src="/images/hero-quiz-mockup.png"
              alt="AKURAT adaptive assessment showing misconception detection"
              width={620}
              height={480}
              className="relative z-10 w-full max-w-xl drop-shadow-2xl"
              priority
            />
          </motion.div>

          {/* Right - Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex-1"
          >
            <h1 className="mb-4 font-display text-4xl font-extrabold leading-[1.15] text-gray-900 lg:text-5xl">
              <span className="text-primary-orange">Guided</span>{' '}
              <span className="text-gray-900">Courses With Every</span>{' '}
              <span className="text-primary">Journey</span>
            </h1>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-500">
              Experience how AKURAT maps misconceptions in real-time
              <br />
              Select an answer to see the adaptive routing
            </p>

            {/* Target Users */}
            <ul className="space-y-3">
              {targetUsers.map((user, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-center justify-between rounded-xl bg-white px-5 py-3.5 shadow-sm ring-1 ring-gray-100/80 transition-all hover:shadow-md hover:ring-primary/30"
                >
                  <span className="text-sm font-medium text-gray-800">
                    {user}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-orange text-xs font-bold text-white shadow-sm">
                    {i + 1}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Learning Material */}
      <section id="learning-material" className="px-4 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-center"
          >
            <h2 className="mb-3 font-display text-3xl font-extrabold text-gray-900 lg:text-4xl">
              Chemistry Materials We Teach
            </h2>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-gray-500">
              Here, we offer a variety of chemistry materials designed for all
              levels, from beginner to advanced. Our material covers a variety
              of fundamental topics in chemistry.
            </p>
          </motion.div>

          {/* Row 1 - 4 cards */}
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {chemistryTopics.slice(0, 4).map((topic, i) => (
              <motion.div
                key={topic.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 rounded-2xl bg-gray-50 px-5 py-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              >
                <Image
                  src={topic.icon}
                  alt={topic.name}
                  width={56}
                  height={56}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-gray-900">
                    {topic.name}
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
                    {topic.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Row 2 - 3 cards centered */}
          <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {chemistryTopics.slice(4).map((topic, i) => (
              <motion.div
                key={topic.name}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.05 }}
                className="flex items-center gap-4 rounded-2xl bg-gray-50 px-5 py-5 transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-lg"
              >
                <Image
                  src={topic.icon}
                  alt={topic.name}
                  width={56}
                  height={56}
                  className="shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-gray-900">
                    {topic.name}
                  </h3>
                  <p className="text-xs leading-relaxed text-gray-500 line-clamp-2">
                    {topic.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Learning Resources */}
      <section
        id="learning-resources"
        className="bg-gray-50/40 px-4 py-20 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-14 grid gap-6 lg:grid-cols-2">
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="font-display text-3xl font-extrabold leading-tight text-gray-900 lg:text-4xl"
            >
              What do you get at
              <br />
              <span className="text-primary">AKURAT?</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="self-end text-sm leading-relaxed text-gray-500"
            >
              AKURAT is an online learning platform specifically designed to
              help you learn chemistry easily, fun and effectively. We offer a
              variety of learning programs tailored to your needs and learning
              level.
            </motion.p>
          </div>

          {/* Feature Grid */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`group rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${feature.bg}`}
              >
                <div className="mb-6 flex h-32 items-center justify-center">
                  <Image
                    src={feature.icon}
                    alt={feature.title}
                    width={140}
                    height={140}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <h3 className="mb-2 font-display text-lg font-bold text-gray-900">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-500">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-20 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] bg-gradient-to-br from-primary via-blue-600 to-primary-cyan p-12 text-center text-white shadow-2xl shadow-primary/20 lg:p-20"
        >
          {/* Decorative */}
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-12 h-56 w-56 rounded-full bg-white/10" />
          <Image
            src="/icons/star.svg"
            alt=""
            width={32}
            height={32}
            className="absolute right-12 top-8 opacity-60"
            aria-hidden
          />

          <div className="relative">
            <h2 className="mb-4 font-display text-3xl font-extrabold leading-tight lg:text-5xl">
              Ready to Master Chemistry?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-sm text-white/80 lg:text-base">
              Join AKURAT today and experience personalized, adaptive learning
              that helps you understand chemistry deeply.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="rounded-full bg-white px-10 py-4 text-sm font-bold text-primary shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Get Started Free
              </Link>
              <Link
                href="/login"
                className="rounded-full border-2 border-white/30 bg-white/10 px-10 py-4 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                Sign In
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      <LandingFooter />
    </>
  );
}
