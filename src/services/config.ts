import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AppConfig, MSATConfig } from '@/types/firestore';

export async function getMSATConfig(): Promise<MSATConfig | null> {
  const snap = await getDoc(doc(db, 'app_config', 'msat'));
  return snap.exists() ? (snap.data() as MSATConfig) : null;
}

export async function getAppConfig(): Promise<AppConfig | null> {
  const [msatSnap, gamSnap] = await Promise.all([
    getDoc(doc(db, 'app_config', 'msat')),
    getDoc(doc(db, 'app_config', 'gamification')),
  ]);

  if (!msatSnap.exists()) return null;

  return {
    msat: msatSnap.data() as MSATConfig,
    gamification: gamSnap.exists()
      ? (gamSnap.data() as AppConfig['gamification'])
      : {
          xpPerLesson: 50,
          xpPerCorrectAnswer: 10,
          xpPerExam: 100,
          xpDailyLogin: 5,
          xpStreakBonus: 10,
          levelFormula: '100 * (level ^ 1.5)',
        },
  };
}
