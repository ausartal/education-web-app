'use client';

import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingFooter } from '@/components/landing/LandingFooter';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sparkles, BookOpen, FlaskConical } from 'lucide-react';

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

// Periodic table elements for hero composition
const elements = [
  {
    number: 1,
    symbol: 'H',
    name: 'Hydrogen',
    gradient: 'from-cyan-400 to-sky-500',
    text: 'text-cyan-50',
    position: 'left-[8%] top-[8%]',
    delay: 0.55,
  },
  {
    number: 8,
    symbol: 'O',
    name: 'Oxygen',
    gradient: 'from-rose-400 to-red-500',
    text: 'text-rose-50',
    position: 'right-[6%] top-[14%]',
    delay: 0.7,
  },
  {
    number: 11,
    symbol: 'Na',
    name: 'Sodium',
    gradient: 'from-violet-500 to-purple-600',
    text: 'text-violet-50',
    position: 'left-[2%] bottom-[28%]',
    delay: 0.85,
  },
  {
    number: 6,
    symbol: 'C',
    name: 'Carbon',
    gradient: 'from-slate-700 to-gray-900',
    text: 'text-slate-100',
    position: 'right-[12%] bottom-[20%]',
    delay: 1.0,
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

      {/* HERO — MEASURE PRECISELY, LEARN ACCURATELY */}
      <section className="px-4 pt-4 lg:px-8 lg:pt-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-br from-[#F4F6F8] via-[#EEF1F8] to-[#E9EEFA] px-8 pb-14 pt-14 lg:min-h-[600px] lg:px-16 lg:pt-20"
        >
          {/* Subtle chemistry formulas as bg decoration */}
          <span className="pointer-events-none absolute left-[8%] top-[42%] hidden font-display text-3xl font-bold text-[#5841EA]/[0.04] lg:block">
            H₂O
          </span>
          <span className="pointer-events-none absolute left-[3%] bottom-[18%] hidden font-display text-2xl font-bold text-[#1A73E8]/[0.05] lg:block">
            CO₂
          </span>
          <span className="pointer-events-none absolute right-[40%] top-[20%] hidden font-display text-xl font-bold text-[#FF9500]/[0.05] lg:block">
            NaCl
          </span>
          <span className="pointer-events-none absolute right-[36%] bottom-[12%] hidden font-display text-lg font-bold text-[#5841EA]/[0.04] lg:block">
            C₆H₁₂O₆
          </span>

          {/* LEFT — Title + Copy + CTAs */}
          <div className="relative z-20 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_4px_16px_rgba(15,30,71,0.06)]"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#FF9500] to-[#EE1908] text-white">
                <Sparkles size={11} />
              </span>
              <span className="text-xs font-semibold text-[#0E1E47]">
                Adaptive Chemistry Diagnosis
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-display text-[42px] font-extrabold uppercase leading-[1.08] tracking-tight text-[#0E1E47] sm:text-5xl lg:text-[58px]"
            >
              Measure <span className="text-[#1A73E8]">Precisely</span>
              <br />
              <span className="text-[#1A73E8]">Learn</span> Accurately
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-6 max-w-[440px] text-[15px] leading-[1.7] text-gray-500"
            >
              Go Beyond Scores. Diagnose chemistry understanding and
              misconceptions with precision through an integrated adaptive
              platform
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/register"
                className="rounded-xl bg-[#5841EA] px-8 py-4 text-sm font-semibold text-white shadow-lg shadow-[#5841EA]/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Start Learning
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-[#FBD300] px-8 py-4 text-sm font-semibold text-[#0E1E47] shadow-lg shadow-amber-200/40 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                Start Teaching
              </Link>
            </motion.div>

            <div className="mt-12 flex items-center gap-2">
              <span className="h-[3px] w-10 rounded-full bg-[#5841EA]" />
              <span className="h-[3px] w-3 rounded-full bg-gray-300" />
              <span className="h-[3px] w-3 rounded-full bg-gray-300" />
              <span className="h-[3px] w-3 rounded-full bg-gray-300" />
            </div>
          </div>

          {/* RIGHT — Chemistry composition (desktop only) */}
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 hidden w-[52%] lg:block">
            {/* Centerpiece atom container */}
            <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2">
              {/* Soft glow background */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#5841EA]/10 via-[#1A73E8]/10 to-[#00C2FF]/10 blur-2xl" />
              <div className="absolute inset-8 rounded-full bg-gradient-to-br from-white to-[#F4F6F8] shadow-[0_8px_40px_rgba(88,65,234,0.08)]" />

              {/* Orbital ring 1 — horizontal */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0"
              >
                <div className="absolute left-1/2 top-1/2 h-[140px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#1A73E8]/25" />
                <span className="absolute left-[calc(50%+170px)] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1A73E8] shadow-md shadow-[#1A73E8]/40" />
              </motion.div>

              {/* Orbital ring 2 — tilted 60deg */}
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rotate-[60deg]"
              >
                <div className="absolute left-1/2 top-1/2 h-[140px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#FF9500]/25" />
                <span className="absolute left-[calc(50%+170px)] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF9500] shadow-md shadow-[#FF9500]/40" />
              </motion.div>

              {/* Orbital ring 3 — tilted -60deg */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 17, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 -rotate-[60deg]"
              >
                <div className="absolute left-1/2 top-1/2 h-[140px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#5841EA]/25" />
                <span className="absolute left-[calc(50%+170px)] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#5841EA] shadow-md shadow-[#5841EA]/40" />
              </motion.div>

              {/* Nucleus — flask icon inside gradient circle */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="absolute left-1/2 top-1/2 flex h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-[#5841EA] via-[#1A73E8] to-[#00C2FF] text-white shadow-xl shadow-[#5841EA]/30"
              >
                <FlaskConical size={42} strokeWidth={1.8} />
              </motion.div>
            </div>

            {/* Floating periodic element tiles */}
            {elements.map((el) => (
              <motion.div
                key={el.symbol}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.5,
                  delay: el.delay,
                  type: 'spring',
                }}
                className={`absolute ${el.position} z-30`}
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 3 + Math.random(),
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className={`flex h-[88px] w-[78px] flex-col justify-between rounded-2xl bg-gradient-to-br ${el.gradient} p-2.5 shadow-[0_8px_24px_rgba(15,30,71,0.12)]`}
                >
                  <span
                    className={`text-[10px] font-semibold ${el.text} opacity-80`}
                  >
                    {el.number}
                  </span>
                  <div className="flex flex-col items-center">
                    <span
                      className={`font-display text-2xl font-extrabold ${el.text}`}
                    >
                      {el.symbol}
                    </span>
                    <span
                      className={`text-[9px] font-medium ${el.text} opacity-80`}
                    >
                      {el.name}
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            ))}

            {/* Stat badge — 203+ Resources (top-right area) */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="absolute right-[8%] top-[44%] z-30 flex items-center gap-3 rounded-2xl bg-white py-3 pl-3 pr-5 shadow-[0_4px_16px_rgba(15,30,71,0.06)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A73E8] to-[#00C2FF] text-white">
                <BookOpen size={16} />
              </span>
              <div>
                <p className="text-base font-extrabold leading-tight text-[#0E1E47]">
                  203+
                </p>
                <p className="text-[11px] text-gray-500">Learning Resources</p>
              </div>
            </motion.div>

            {/* Stat badge — 96 Topics covered (bottom-left) */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.95 }}
              className="absolute bottom-[8%] left-[28%] z-30 flex items-center gap-3 rounded-2xl bg-white py-3 pl-3 pr-5 shadow-[0_4px_16px_rgba(15,30,71,0.06)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF9500] to-[#EE1908] text-white">
                <FlaskConical size={16} />
              </span>
              <div>
                <p className="text-base font-extrabold leading-tight text-[#0E1E47]">
                  96
                </p>
                <p className="text-[11px] text-gray-500">Adaptive Questions</p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Learning Material — Chemistry Topics */}
      <section
        id="learning-material"
        className="relative px-4 py-20 lg:px-8 lg:py-28"
      >
        {/* Decorative shapes */}
        <Image
          src="/icons/dot-purple.svg"
          alt=""
          width={36}
          height={36}
          className="absolute right-[6%] top-[8%] hidden lg:block"
          aria-hidden
        />
        <Image
          src="/icons/dot-blue.svg"
          alt=""
          width={32}
          height={32}
          className="absolute left-[5%] top-[40%] hidden lg:block"
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
