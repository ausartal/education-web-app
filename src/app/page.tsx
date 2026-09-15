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
  'Students seeking precision chemistry grading',
  'Students preparing for chemistry exams',
  'Students looking to boost academic grades',
  'Students with a passion for chemistry',
  'Students testing comprehensive mastery',
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

const assessmentSpecifications = [
  {
    title: '3-Stage Adaptive Format',
    description:
      'Each stage delivers a targeted question set, with difficulty adjusted from your performance in the previous stage.',
    icon: '/icons/assessment-stages.svg',
    iconBg: 'bg-[#F1E8FF]',
  },
  {
    title: 'Stage Score Weighting',
    description:
      'Question difficulty determines score weight, so stronger performance unlocks more challenging, higher-value questions.',
    icon: '/icons/assessment-weighting.svg',
    iconBg: 'bg-[#E7EFFF]',
  },
  {
    title: 'Topics & Stage Timing',
    description:
      'Covers stoichiometry, equilibrium, chemical bonding, and thermochemistry with an independent timer for every stage.',
    icon: '/icons/assessment-timing.svg',
    iconBg: 'bg-[#FFF0D7]',
  },
  {
    title: 'Direct Results Without Retakes',
    description:
      'Receive a final score and an individualized diagnosis of conceptual misconceptions immediately after completion.',
    icon: '/icons/assessment-results.svg',
    iconBg: 'bg-[#E1F7EB]',
  },
];

const assessmentSteps = [
  {
    number: '01',
    title: 'Token Verification',
    description: 'Enter the session code provided by your instructor.',
    color: 'text-[#9B6CFF]',
  },
  {
    number: '02',
    title: 'Stage 1 (Baseline)',
    description: 'Establish your baseline conceptual mastery.',
    color: 'text-[#60A5FA]',
  },
  {
    number: '03',
    title: 'Stages 2 & 3',
    description: 'Follow an adaptive route based on each response.',
    color: 'text-[#F59E0B]',
  },
  {
    number: '04',
    title: 'Score Calculation',
    description: 'Calculate results using stage difficulty and weighting.',
    color: 'text-[#34D399]',
  },
  {
    number: '05',
    title: 'Instant Final Results',
    description: 'Review your score and misconception analysis.',
    color: 'text-[#F472B6]',
  },
];

const frequentlyAskedQuestions = [
  {
    question: 'What makes AKURAT different from a regular chemistry quiz?',
    answer:
      'AKURAT connects structured chemistry materials, practice, classroom activities, and adaptive assessment in one learning flow. Instead of showing only a final score, the assessment helps identify the concepts and misconceptions that need more attention.',
  },
  {
    question: 'How do students join a class?',
    answer:
      'After signing in as a student, open the Classes page and enter the class code provided by your teacher. Once the code is accepted, the class, assigned materials, tasks, and scheduled assessments will appear in your account.',
  },
  {
    question: 'How does the 3-stage adaptive assessment work?',
    answer:
      'Stage 1 establishes a baseline. Your performance then determines the difficulty route used in Stages 2 and 3. Each stage contains its own question set and timing, allowing AKURAT to measure your chemistry understanding more precisely than a fixed test.',
  },
  {
    question: 'What information is included in my assessment results?',
    answer:
      'After completing the assessment, you can review your final score, performance across the measured competencies, and diagnostic information about concepts that may have been misunderstood. These results help guide what to study next.',
  },
  {
    question: 'Is there a score penalty for an incorrect answer?',
    answer:
      'There is no separate negative-marking penalty for an incorrect answer. However, your responses influence the adaptive route and the difficulty of later questions, so every answer should reflect your best understanding.',
  },
  {
    question: 'What happens if my internet connection is interrupted?',
    answer:
      'Answers that have already been submitted remain saved. You can reconnect and continue from the latest available stage, but the assessment timer may continue running. We recommend using a stable connection before starting an exam.',
  },
  {
    question: 'What can teachers manage in AKURAT?',
    answer:
      'Teachers can organize classes, share learning materials, create assignments and assessments, review submissions, and monitor student or class performance. The available insight is designed to help teachers decide which concepts need reinforcement.',
  },
  {
    question: 'Can I use AKURAT on a phone or tablet?',
    answer:
      'Yes. Learning materials, practice, class updates, and progress views are responsive on phones and tablets. For timed assessments, a larger screen and a stable connection are recommended for the clearest experience.',
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

      <section
        id="assessment"
        className="border-b border-[#E8EAF1] bg-white px-4 py-20 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#27254F] lg:text-4xl">
              3-Stage Adaptive Multi-Stage Testing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[#64748B] sm:text-base">
              A tiered adaptive chemistry assessment with dynamic score
              weighting, calibrated stage difficulty, and detailed cognitive
              diagnostics without remedial retests.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {assessmentSpecifications.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-[#E4E8F0] bg-[#F8FAFC] p-6"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg}`}
                >
                  <Image
                    src={item.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5"
                  />
                </span>
                <h3 className="mt-4 font-display text-base font-bold leading-6 text-[#27254F]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-5 text-[#64748B]">
                  {item.description}
                </p>
              </motion.article>
            ))}
          </div>

          <div className="mt-12 rounded-3xl border border-[#DED3F4] bg-[#F5F1FC] px-6 py-9 sm:px-8 lg:px-10">
            <h3 className="text-center font-display text-2xl font-extrabold text-[#27254F]">
              How the assessment works
            </h3>
            <ol className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {assessmentSteps.map((step) => (
                <li key={step.number} className="relative">
                  <p
                    className={`font-display text-2xl font-extrabold ${step.color}`}
                  >
                    {step.number}
                  </p>
                  <h4 className="mt-2 text-sm font-bold text-[#27254F]">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-xs leading-5 text-[#64748B]">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#FAFDEF] px-4 py-20 lg:px-8 lg:py-24">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-12 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-[0_24px_42px_rgba(30,41,59,0.14)] sm:p-8 lg:col-span-7"
          >
            <div className="flex items-center justify-between gap-4 border-b border-[#EDF0F5] pb-4 text-xs font-semibold sm:text-sm">
              <span className="text-[#64748B]">
                Topic: Stoichiometry Basics
              </span>
              <span className="flex items-center gap-2 text-[#6320EE]">
                <Image
                  src="/icons/guided-question.svg"
                  alt=""
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
                Question 4 of 10
              </span>
            </div>
            <div className="mt-5 rounded-2xl border border-[#EEF1F5] bg-[#F8FAFC] px-5 py-6 text-center font-display text-2xl font-extrabold tracking-[0.05em] text-[#27254F] sm:text-3xl">
              2 H₂ + O₂ → ?
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['A', 'H₂O'],
                ['B', 'H₂O₂'],
                ['C', '2 H₂O'],
                ['D', 'OH'],
              ].map(([label, answer]) => {
                const selected = label === 'B';
                return (
                  <div
                    key={label}
                    className={`flex items-center justify-between rounded-xl border px-4 py-3.5 ${selected ? 'border-2 border-[#EF4444] bg-[#FEF8F8]' : 'border-[#DEE4EC] bg-white'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${selected ? 'bg-[#EF4444] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}
                      >
                        {label}
                      </span>
                      <span
                        className={`text-sm sm:text-base ${selected ? 'font-bold text-[#27254F]' : 'font-medium text-[#475569]'}`}
                      >
                        {answer}
                      </span>
                    </div>
                    {selected && (
                      <span className="text-lg font-bold text-[#EF4444]">
                        ×
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded-2xl border border-[#F5C75B] bg-[#FFF9ED] p-4 sm:p-5">
              <h3 className="text-sm font-bold text-[#7C3C12]">
                Misconception Detected: Subscript vs. Coefficient Confusion
              </h3>
              <p className="mt-2 text-xs leading-5 text-[#9A4A16]">
                You selected H₂O₂ (Hydrogen Peroxide). This changes the chemical
                identity of the product instead of balancing the equation with a
                coefficient.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold text-[#6320EE]">
                  <Image
                    src="/icons/guided-path.svg"
                    alt=""
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5"
                  />
                  Adaptive path initiated
                </span>
                <span className="rounded-lg bg-[#6320EE] px-4 py-2 text-center text-xs font-bold text-white">
                  Next: Foundation question →
                </span>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="lg:col-span-5"
          >
            <h2 className="font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-[#27254F] lg:text-5xl">
              <span className="text-[#F59E0B]">Guided</span> Courses
              <span className="block">
                With Every <span className="text-[#6320EE]">Journey</span>
              </span>
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#64748B] sm:text-base">
              Experience how AKURAT maps misconceptions in real-time. Select an
              answer to see the adaptive routing path customized for every
              student profile.
            </p>
            <ul className="mt-7 space-y-3">
              {targetUsers.map((userType, index) => (
                <li
                  key={userType}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[#E5E9F0] bg-white px-4 py-3.5 shadow-xs"
                >
                  <span className="text-sm font-medium text-[#27254F]">
                    {userType}
                  </span>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-xs font-bold text-[#27254F]">
                    {index + 1}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      <section
        id="faq"
        className="border-t border-white bg-[#F8FAFC] px-4 py-20 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#27254F] lg:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#64748B] sm:text-base">
              Clear answers about learning chemistry, joining a class, adaptive
              assessments, and using AKURAT.
            </p>
          </div>

          <div className="mt-12 space-y-4">
            {frequentlyAskedQuestions.map((item) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white open:border-[#D6C5FA] open:shadow-[0_8px_24px_rgba(99,32,238,0.07)]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-left sm:px-6 [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-bold leading-6 text-[#27254F] sm:text-base">
                    {item.question}
                  </span>
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1E8FF] text-xl font-bold leading-none text-[#6320EE] transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  >
                    +
                  </span>
                </summary>
                <div className="border-t border-[#EEF1F5] px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                  <p className="max-w-3xl text-sm leading-6 text-[#64748B]">
                    {item.answer}
                  </p>
                </div>
              </details>
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
