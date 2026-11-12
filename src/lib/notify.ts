import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';
import { content, type NotificationDraft } from '@/lib/notification-content';

const BATCH_SIZE = 400;

function record(userId: string, draft: NotificationDraft): Record<string, unknown> {
  return {
    userId,
    type: draft.type,
    title: draft.title,
    body: draft.body,
    link: draft.link ?? null,
    dedupeKey: draft.dedupeKey ?? null,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  };
}

async function createOne(userId: string, draft: NotificationDraft): Promise<void> {
  if (draft.dedupeKey) {
    const existing = await adminDb.collection('notifications')
      .where('userId', '==', userId)
      .where('dedupeKey', '==', draft.dedupeKey)
      .where('read', '==', false)
      .limit(1)
      .get();
    if (!existing.empty) {
      await existing.docs[0].ref.update({
        title: draft.title,
        body: draft.body,
        link: draft.link ?? null,
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }
  }
  await adminDb.collection('notifications').add(record(userId, draft));
}

/**
 * Notifies the given users. Never throws: a failed notification must not fail
 * the request that caused it.
 */
export async function notifyUsers(userIds: Array<string | null | undefined>, draft: NotificationDraft | null): Promise<void> {
  if (!draft) return;
  try {
    const ids = [...new Set(userIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
    if (ids.length === 0) return;

    if (draft.dedupeKey) {
      await Promise.all(ids.map((id) => createOne(id, draft)));
      return;
    }

    for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
      const batch = adminDb.batch();
      for (const id of ids.slice(offset, offset + BATCH_SIZE)) {
        batch.set(adminDb.collection('notifications').doc(), record(id, draft));
      }
      await batch.commit();
    }
  } catch (err) {
    console.error('[notify] failed:', err);
  }
}

export async function notifyAdmins(draft: NotificationDraft | null): Promise<void> {
  if (!draft) return;
  try {
    const admins = await adminDb.collection('users').where('role', '==', 'admin').get();
    await notifyUsers(admins.docs.map((d) => d.id), draft);
  } catch (err) {
    console.error('[notify] admins failed:', err);
  }
}

/**
 * Sends a notification once per key. The key becomes the document id, so the
 * same reminder is never created twice, even after the user has read it.
 */
export async function notifyOnce(userId: string, key: string, draft: NotificationDraft): Promise<boolean> {
  try {
    const ref = adminDb.collection('notifications').doc(key);
    if ((await ref.get()).exists()) return false;
    await ref.set(record(userId, draft));
    return true;
  } catch (err) {
    console.error('[notify] once failed:', err);
    return false;
  }
}

/** Called after a direct message is stored. */
export async function notifyDirectMessage(message: Record<string, unknown>): Promise<void> {
  try {
    const senderId = message.senderId as string | undefined;
    const receiverId = message.receiverId as string | undefined;
    if (!senderId || !receiverId || senderId === receiverId) return;

    const [sender, receiver] = await Promise.all([
      adminDb.collection('users').doc(senderId).get(),
      adminDb.collection('users').doc(receiverId).get(),
    ]);
    const receiverRole = receiver.exists() ? receiver.data()?.role : undefined;

    await notifyUsers([receiverId], content.directMessage({
      senderId,
      senderName: (sender.exists() ? sender.data()?.displayName : undefined) ?? 'Pengguna',
      text: typeof message.content === 'string' ? message.content : '',
      toStaff: receiverRole === 'teacher' || receiverRole === 'admin',
    }));
  } catch (err) {
    console.error('[notify] direct message failed:', err);
  }
}
