import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MSATConfig } from '@/types/firestore';

export async function getMSATConfig(): Promise<MSATConfig | null> {
  const snap = await getDoc(doc(db, 'app_config', 'msat'));
  return snap.exists() ? (snap.data() as MSATConfig) : null;
}
