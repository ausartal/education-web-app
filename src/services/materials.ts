import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Material } from '@/types/firestore';

const COLLECTION = 'materials';

export async function getMaterials(): Promise<Material[]> {
  const q = query(collection(db, COLLECTION), where('status', '==', 'published'));
  const snap = await getDocs(q);
  const materials = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Material
  );
  return materials.sort((a, b) => a.order - b.order);
}

export async function getMaterialsByTopic(topic: string): Promise<Material[]> {
  const q = query(
    collection(db, COLLECTION),
    where('topic', '==', topic),
    where('status', '==', 'published')
  );
  const snap = await getDocs(q);
  const materials = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Material
  );
  return materials.sort((a, b) => a.order - b.order);
}

export async function getMaterial(id: string): Promise<Material | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Material) : null;
}
