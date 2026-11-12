import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  doc,
  writeBatch,
  Timestamp,
} from '@/lib/client-firestore';
import { db } from '@/lib/firebase';

export type { NotificationType } from '@/lib/notification-content';
import type { NotificationType } from '@/lib/notification-content';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: Timestamp;
}

export async function getNotifications(
  userId: string
): Promise<Notification[]> {
  if (!userId) return [];
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
}

export async function markAsRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
}

export async function markAllAsRead(userId: string): Promise<void> {
  if (!userId) return;
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}
