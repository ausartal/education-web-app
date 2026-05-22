'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/useToast';
import { Save } from 'lucide-react';

const AdminConfig: FC = () => {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [msat, setMsat] = useState({
    stagesCount: 3,
    questionsPerStage: 7,
    thetaMin: -3,
    thetaMax: 3,
    tooFastMs: 3000,
    allFastCorrectCount: 5,
    suddenDropThreshold: 3,
  });

  const [gamification, setGamification] = useState({
    xpPerLesson: 50,
    xpPerCorrectAnswer: 10,
    xpPerExam: 100,
    xpDailyLogin: 5,
    xpStreakBonus: 10,
  });

  useEffect(() => {
    const fetch = async () => {
      const [msatSnap, gamSnap] = await Promise.all([
        getDoc(doc(db, 'app_config', 'msat')),
        getDoc(doc(db, 'app_config', 'gamification')),
      ]);
      if (msatSnap.exists()) {
        const d = msatSnap.data();
        setMsat({
          stagesCount: d.stagesCount || 3,
          questionsPerStage: d.questionsPerStage || 7,
          thetaMin: d.thetaMin || -3,
          thetaMax: d.thetaMax || 3,
          tooFastMs: d.anomalyThresholds?.tooFastMs || 3000,
          allFastCorrectCount: d.anomalyThresholds?.allFastCorrectCount || 5,
          suddenDropThreshold: d.anomalyThresholds?.suddenDropThreshold || 3,
        });
      }
      if (gamSnap.exists()) {
        const d = gamSnap.data();
        setGamification({
          xpPerLesson: d.xpPerLesson || 50,
          xpPerCorrectAnswer: d.xpPerCorrectAnswer || 10,
          xpPerExam: d.xpPerExam || 100,
          xpDailyLogin: d.xpDailyLogin || 5,
          xpStreakBonus: d.xpStreakBonus || 10,
        });
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      setDoc(
        doc(db, 'app_config', 'msat'),
        {
          stagesCount: msat.stagesCount,
          questionsPerStage: msat.questionsPerStage,
          startDifficulty: 'moderate',
          thetaInitial: 0,
          thetaMin: msat.thetaMin,
          thetaMax: msat.thetaMax,
          promotionRule: 'correct',
          demotionRule: 'incorrect',
          anomalyThresholds: {
            tooFastMs: msat.tooFastMs,
            allFastCorrectCount: msat.allFastCorrectCount,
            suddenDropThreshold: msat.suddenDropThreshold,
          },
        },
        { merge: true }
      ),
      setDoc(doc(db, 'app_config', 'gamification'), gamification, {
        merge: true,
      }),
    ]);
    setSaving(false);
    addToast('success', 'Configuration saved');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const Field: FC<{
    label: string;
    value: number;
    onChange: (v: number) => void;
  }> = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-lg bg-white px-3 py-1.5 text-right text-sm font-semibold outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-6 font-display text-2xl font-extrabold text-gray-900">
          Platform Configuration
        </h1>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* MSAT Config */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900">
            MSAT Algorithm
          </h2>
          <div className="space-y-2">
            <Field
              label="Stages"
              value={msat.stagesCount}
              onChange={(v) => setMsat({ ...msat, stagesCount: v })}
            />
            <Field
              label="Questions/Stage"
              value={msat.questionsPerStage}
              onChange={(v) => setMsat({ ...msat, questionsPerStage: v })}
            />
            <Field
              label="Theta Min"
              value={msat.thetaMin}
              onChange={(v) => setMsat({ ...msat, thetaMin: v })}
            />
            <Field
              label="Theta Max"
              value={msat.thetaMax}
              onChange={(v) => setMsat({ ...msat, thetaMax: v })}
            />
            <Field
              label="Too Fast (ms)"
              value={msat.tooFastMs}
              onChange={(v) => setMsat({ ...msat, tooFastMs: v })}
            />
            <Field
              label="Fast Correct Count"
              value={msat.allFastCorrectCount}
              onChange={(v) => setMsat({ ...msat, allFastCorrectCount: v })}
            />
            <Field
              label="Sudden Drop Threshold"
              value={msat.suddenDropThreshold}
              onChange={(v) => setMsat({ ...msat, suddenDropThreshold: v })}
            />
          </div>
        </div>

        {/* Gamification Config */}
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-gray-900">Gamification</h2>
          <div className="space-y-2">
            <Field
              label="XP per Lesson"
              value={gamification.xpPerLesson}
              onChange={(v) =>
                setGamification({ ...gamification, xpPerLesson: v })
              }
            />
            <Field
              label="XP per Correct Answer"
              value={gamification.xpPerCorrectAnswer}
              onChange={(v) =>
                setGamification({ ...gamification, xpPerCorrectAnswer: v })
              }
            />
            <Field
              label="XP per Exam"
              value={gamification.xpPerExam}
              onChange={(v) =>
                setGamification({ ...gamification, xpPerExam: v })
              }
            />
            <Field
              label="XP Daily Login"
              value={gamification.xpDailyLogin}
              onChange={(v) =>
                setGamification({ ...gamification, xpDailyLogin: v })
              }
            />
            <Field
              label="XP Streak Bonus"
              value={gamification.xpStreakBonus}
              onChange={(v) =>
                setGamification({ ...gamification, xpStreakBonus: v })
              }
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-cyan px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all disabled:opacity-50 hover:enabled:-translate-y-0.5"
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default AdminConfig;
