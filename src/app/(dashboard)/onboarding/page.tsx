'use client';

import { FC, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, updateDoc } from '@/lib/client-firestore';
import { getMaterials } from '@/services/materials';
import { slugTopic, topicLabel } from '@/lib/learning';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { ChevronRight, Loader2 } from 'lucide-react';

const knownTopics = [
  {
    id: 'stoikiometri',
    name: 'Stoikiometri',
    icon: '/icons/topic-calculus.svg',
  },
  { id: 'atom-model', name: 'Model Atom', icon: '/icons/topic-atom-model.svg' },
  { id: 'larutan', name: 'Larutan', icon: '/icons/topic-chemistry-flask.svg' },
  {
    id: 'ikatan-kimia',
    name: 'Ikatan Kimia',
    icon: '/icons/topic-coordinate-geometry.svg',
  },
  {
    id: 'kesetimbangan',
    name: 'Kesetimbangan',
    icon: '/icons/topic-exponential-functions.svg',
  },
  {
    id: 'geometri-molekul',
    name: 'Geometri Molekul',
    icon: '/icons/topic-geometric-thinking.svg',
  },
];

const goals = [
  { value: 5, label: '5 min/day', desc: 'Santai' },
  { value: 10, label: '10 min/day', desc: 'Regular' },
  { value: 20, label: '20 min/day', desc: 'Serius' },
  { value: 30, label: '30 min/day', desc: 'Intensif' },
];

const DEFAULT_TOPIC_ICON = '/icons/topic-atom-model.svg';

type TopicOption = { id: string; name: string; icon: string };

const OnboardingPage: FC = () => {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState(10);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [topics, setTopics] = useState<TopicOption[]>(knownTopics);

  // Offer the topics students can really study or practise; keep the default list if none load.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const [materials, practiceRes] = await Promise.all([
          getMaterials(),
          fetch('/api/practice-questions/topics', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const practice: { topics?: Array<{ topic: string }> } = practiceRes.ok ? await practiceRes.json() : {};
        const raws = [...materials.map((m) => m.topic), ...(practice.topics ?? []).map((p) => p.topic)];

        const found = new Map<string, TopicOption>();
        for (const raw of raws) {
          const id = slugTopic(raw || '');
          if (!id || found.has(id)) continue;
          const known = knownTopics.find((k) => k.id === id);
          found.set(id, { id, name: known?.name ?? topicLabel(raw), icon: known?.icon ?? DEFAULT_TOPIC_ICON });
        }
        if (!cancelled && found.size > 0) setTopics([...found.values()]);
      } catch { /* keep the default list */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    const uid = user?.uid ?? profile?.uid;
    if (!uid || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await updateDoc(doc(db, 'users', uid), {
        'settings.dailyGoal': selectedGoal,
        'settings.selectedTopics': selectedTopics,
        'settings.onboardingComplete': true,
      });
      router.push('/dashboard');
    } catch {
      setSaveError('Gagal menyimpan. Coba lagi.');
      setSaving(false);
    }
  };

  // Skipping still marks the setup as done so it is not shown again.
  const handleSkip = async () => {
    const uid = user?.uid ?? profile?.uid;
    if (!uid || saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), { 'settings.onboardingComplete': true });
      router.push('/dashboard');
    } catch {
      setSaveError('Gagal melewati. Coba lagi.');
      setSaving(false);
    }
  };

  const steps = [
    // Step 0: Welcome
    <motion.div
      key="welcome"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center"
    >
      <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-cyan shadow-lg shadow-primary/25">
        <span className="text-4xl">🧪</span>
      </div>
      <h1 className="mb-3 font-display text-3xl font-extrabold text-gray-900">
        Welcome to AKURAT!
      </h1>
      <p className="mx-auto mb-8 max-w-md text-gray-500">
        Platform asesmen kimia adaptif yang menyesuaikan dengan kemampuanmu.
        Mari setup akunmu dalam beberapa langkah.
      </p>
      <button
        onClick={() => setStep(1)}
        className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan px-8 py-4 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
      >
        Get Started <ChevronRight size={18} />
      </button>
    </motion.div>,

    // Step 1: Goal Setting
    <motion.div
      key="goal"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
        Set your daily goal
      </h2>
      <p className="mb-8 text-sm text-gray-500">
        Berapa menit per hari kamu mau belajar?
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3">
        {goals.map((goal) => (
          <button
            key={goal.value}
            onClick={() => setSelectedGoal(goal.value)}
            className={`rounded-2xl p-5 text-center transition-all ${
              selectedGoal === goal.value
                ? 'bg-primary/10 ring-2 ring-primary shadow-md'
                : 'bg-white shadow-sm hover:shadow-md'
            }`}
          >
            <p className="text-2xl font-black text-gray-900">{goal.value}</p>
            <p className="text-xs text-gray-500">min/day</p>
            <p className="mt-1 text-xs font-semibold text-primary">
              {goal.desc}
            </p>
          </button>
        ))}
      </div>

      <button
        onClick={() => setStep(2)}
        className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 font-bold text-white shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
      >
        Continue
      </button>
    </motion.div>,

    // Step 2: Topic Selection
    <motion.div
      key="topics"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
        Pick your interests
      </h2>
      <p className="mb-8 text-sm text-gray-500">
        Pilih topik yang ingin kamu pelajari duluan
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {topics.map((topic) => {
          const isSelected = selectedTopics.includes(topic.id);
          return (
            <button
              key={topic.id}
              onClick={() => toggleTopic(topic.id)}
              className={`flex flex-col items-center gap-2 rounded-2xl p-5 transition-all ${
                isSelected
                  ? 'bg-primary/10 ring-2 ring-primary shadow-md'
                  : 'bg-white shadow-sm hover:shadow-md'
              }`}
            >
              <Image src={topic.icon} alt={topic.name} width={40} height={40} />
              <span className="text-xs font-semibold text-gray-700">
                {topic.name}
              </span>
            </button>
          );
        })}
      </div>

      {saveError && (
        <p className="mb-3 text-center text-sm text-red-500">{saveError}</p>
      )}
      <button
        onClick={handleFinish}
        disabled={selectedTopics.length === 0 || saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan py-4 font-bold text-white shadow-lg shadow-primary/25 transition-all disabled:opacity-40 hover:enabled:-translate-y-0.5"
      >
        {saving ? <><Loader2 size={18} className="animate-spin" /> Menyimpan...</> : 'Start Learning'}
      </button>
    </motion.div>,
  ];

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="mb-2 flex justify-between text-xs font-semibold">
            <span className={step >= 0 ? 'text-primary' : 'text-gray-300'}>
              Welcome
            </span>
            <span className={step >= 1 ? 'text-primary' : 'text-gray-300'}>
              Goal
            </span>
            <span className={step >= 2 ? 'text-primary' : 'text-gray-300'}>
              Topics
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-cyan"
              animate={{ width: `${((step + 1) / 3) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1.5 text-center text-xs text-gray-400">
            Step {step + 1} of 3
          </p>
        </div>

        <AnimatePresence mode="wait">{steps[step]}</AnimatePresence>

        <div className="mt-6 text-center">
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-xs font-medium text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline disabled:opacity-50"
          >
            Lewati untuk sekarang
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
