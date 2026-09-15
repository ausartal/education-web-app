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
    icon: '/icons/topic-geometric-thinking.svg',
  },
  {
    name: 'Atom',
    desc: 'The smallest building of matter',
    icon: '/icons/topic-atom-model.svg',
  },
  {
    name: 'Periodic Table',
    desc: 'A map that organizes all elements',
    icon: '/icons/topic-coordinate-geometry.svg',
  },
  {
    name: 'Mol',
    desc: 'Unit for counting the number of particles',
    icon: '/icons/topic-probability-and-chance.svg',
  },
  {
    name: 'Chemical Reaction',
    desc: 'Symbolic changes in substances in reactions',
    icon: '/icons/topic-vectors.svg',
  },
  {
    name: 'Stoichiometry',
    desc: '"Calculating" in chemical reactions',
    icon: '/icons/topic-calculus.svg',
  },
  {
    name: 'Solution',
    desc: 'A mixture of solute and solvent',
    icon: '/icons/topic-chemistry-flask.svg',
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

      <main id="main-content">
        <section className="overflow-hidden border-b border-[#EEF0F5] bg-[#FBFAFE] px-5 pb-20 pt-12 sm:px-8 lg:pb-28 lg:pt-16">
          <div className="mx-auto grid max-w-[1228px] items-center gap-12 lg:min-h-[597px] lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-6">
              <h1 className="font-display text-[46px] font-extrabold uppercase leading-[0.92] tracking-[0.035em] text-[#27254F] sm:text-[58px] lg:text-[70px]">
                From <span className="text-[#6320EE]">curious</span>
                <span className="block">
                  <span className="text-[#6320EE]">to</span> confident
                </span>
              </h1>
              <p className="mt-14 max-w-xl text-base leading-7 text-[#596780] sm:text-lg">
                Go beyond scores. Diagnose chemistry understanding and
                misconceptions with precision through an integrated adaptive
                platform.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                <Link
                  href="/register"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#6320EE] px-8 text-base font-bold text-white shadow-[0_8px_18px_rgba(99,32,238,0.24)] transition-colors duration-200 hover:bg-[#5218C7]"
                >
                  Start learning
                </Link>
                <Link
                  href="/register?role=teacher"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#F59E0B] px-8 text-base font-bold text-[#27254F] shadow-[0_6px_14px_rgba(245,158,11,0.2)] transition-colors duration-200 hover:bg-[#D97706]"
                >
                  Start teaching
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E8EAF1] pt-3 text-sm font-medium text-[#68758B]">
                <span>✧ Interactive learning</span>
                <span className="text-[#CBD1DC]">•</span>
                <span>🎯 Adaptive assessment</span>
                <span className="text-[#CBD1DC]">•</span>
                <span>⚗ Expert guidance</span>
              </div>
              <div
                className="mt-7 flex items-center gap-2"
                aria-label="Slide 1 of 4"
              >
                <span className="h-2 w-12 rounded-full bg-[#9AA8BD]" />
                <span className="h-2 w-2 rounded-full bg-[#D2D8E2]" />
                <span className="h-2 w-2 rounded-full bg-[#D2D8E2]" />
                <span className="h-2 w-2 rounded-full bg-[#D2D8E2]" />
              </div>
            </div>

            <div
              className="relative mx-auto h-[430px] w-full max-w-[460px] sm:h-[460px] lg:col-span-6"
              aria-label="AKURAT learning experience preview"
            >
              <div className="absolute right-2 top-0 h-64 w-64 rounded-full bg-[#F59E0B] sm:-right-2 sm:-top-4 sm:h-72 sm:w-72" />
              <div className="absolute bottom-0 left-2 h-72 w-72 rounded-full bg-[#6320EE] sm:-bottom-4 sm:left-0 sm:h-80 sm:w-80" />
              <div className="absolute left-1/2 top-1/2 flex h-72 w-72 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#F1F0FC] p-5 shadow-[0_20px_44px_rgba(39,37,79,0.18)] sm:h-80 sm:w-80">
                <Image
                  src="/images/hero-pelajar.svg"
                  alt="Student learning with a digital tablet"
                  width={264}
                  height={264}
                  className="h-[264px] w-[264px]"
                  priority
                />
              </div>

              <div className="absolute left-2 top-0 flex items-center gap-3 rounded-full border border-[#E8EAF1] bg-white/95 px-4 py-2.5 shadow-[0_10px_24px_rgba(39,37,79,0.12)] sm:-left-4 sm:-top-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4A86A]">
                  <Image
                    src="/icons/hero-kelas.svg"
                    alt=""
                    width={16}
                    height={16}
                  />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#99A3B5]">
                    Live
                  </p>
                  <p className="text-sm font-extrabold text-[#27254F]">Class</p>
                </div>
              </div>
              <div className="absolute left-0 top-[116px] flex items-center gap-3 rounded-2xl border border-[#E8EAF1] bg-white/95 px-4 py-3 shadow-[0_10px_24px_rgba(39,37,79,0.12)] sm:-left-12 sm:top-28">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E98080]">
                  <Image
                    src="/icons/hero-materi.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                </span>
                <div>
                  <p className="text-base font-extrabold leading-none text-[#27254F]">
                    203+
                  </p>
                  <p className="mt-1 text-xs text-[#68758B]">
                    Learning resources
                  </p>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 min-w-[190px] rounded-2xl border border-[#E8EAF1] bg-white/95 p-3.5 shadow-[0_10px_24px_rgba(39,37,79,0.12)] sm:-bottom-2 sm:-right-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F59E0B]">
                    <Image
                      src="/icons/hero-pelajar-aktif.svg"
                      alt=""
                      width={16}
                      height={16}
                    />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold leading-none text-[#27254F]">
                      98
                    </p>
                    <p className="mt-1 text-[11px] text-[#68758B]">
                      Online students
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex pl-1 text-[9px] font-bold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E2D4F4] text-[#624C8C] ring-2 ring-white">
                    JS
                  </span>
                  <span className="-ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#CDDEF4] text-[#3D5F8D] ring-2 ring-white">
                    AK
                  </span>
                  <span className="-ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#CDEBDD] text-[#386A55] ring-2 ring-white">
                    RD
                  </span>
                  <span className="-ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#F6E6A8] text-[#785F24] ring-2 ring-white">
                    MN
                  </span>
                  <span className="-ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#E4E7EC] text-[#596273] ring-2 ring-white">
                    +94
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Learning Material — Chemistry Topics */}
      <section
        id="learning-material"
        className="relative px-4 py-20 lg:px-8 lg:py-28"
      >
        <Image
          src="/icons/dot-purple.svg"
          alt=""
          width={36}
          height={36}
          className="pointer-events-none absolute right-[6%] top-[8%] hidden lg:block"
          aria-hidden
        />
        <Image
          src="/icons/dot-cyan.svg"
          alt=""
          width={32}
          height={32}
          className="pointer-events-none absolute left-[5%] top-[28%] hidden lg:block"
          aria-hidden
        />
        <Image
          src="/icons/dot-orange.svg"
          alt=""
          width={24}
          height={24}
          className="pointer-events-none absolute right-[12%] top-[40%] hidden xl:block"
          aria-hidden
        />
        <Image
          src="/icons/dot-yellow.svg"
          alt=""
          width={22}
          height={22}
          className="pointer-events-none absolute left-[13%] top-[12%] hidden xl:block"
          aria-hidden
        />

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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Image
                    src={topic.icon}
                    alt={topic.name}
                    width={36}
                    height={36}
                  />
                </div>
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
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Image
                    src={topic.icon}
                    alt={topic.name}
                    width={36}
                    height={36}
                  />
                </div>
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

      {/* Learning Resources — What you get */}
      <section
        id="learning-resources"
        className="border-y border-[#E8E1F5] bg-[#F7F4FC] px-4 py-20 lg:px-8 lg:py-28"
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
              <span className="text-[#6320EE]">AKURAT?</span>
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

      {/* Assessment Section — Adaptive demo */}
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
            <h2 className="mb-4 font-display text-3xl font-extrabold leading-[1.15] text-gray-900 lg:text-5xl">
              <span className="text-primary-orange">Guided</span>{' '}
              <span className="text-gray-900">Courses With Every</span>{' '}
              <span className="text-primary">Journey</span>
            </h2>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-500">
              Experience how AKURAT maps misconceptions in real-time. Select an
              answer to see the adaptive routing.
            </p>

            {/* Target Users */}
            <ul className="space-y-3">
              {targetUsers.map((u, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                  className="flex items-center justify-between rounded-xl bg-white px-5 py-3.5 shadow-sm ring-1 ring-gray-100/80 transition-all hover:shadow-md hover:ring-primary/30"
                >
                  <span className="text-sm font-medium text-gray-800">{u}</span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-orange text-xs font-bold text-white shadow-sm">
                    {i + 1}
                  </span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
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
