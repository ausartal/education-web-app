import { adminDb, runTransaction } from '@/lib/firebase-admin';
import { FieldValue } from '@/lib/pg-firestore';

export const PAYWALL_COLLECTION = 'app_config';
export const PAYWALL_DOC = 'token_paywall';
export const PAYWALL_AUDIT_ACTION = 'token_paywall_toggle';
export const JOIN_TOKEN_COST = 1;

export interface PaywallState {
  enabled: boolean;
  updatedAtMs: number | null;
  updatedById: string | null;
  updatedByName: string | null;
}

export type ToggleCheck =
  | { ok: true; enabled: boolean; reason: string }
  | { ok: false; error: string };

export function validateToggle(enabled: unknown, reason: unknown, current: boolean): ToggleCheck {
  if (typeof enabled !== 'boolean') return { ok: false, error: 'Status harus berupa nyala atau mati' };
  if (enabled === current) {
    return { ok: false, error: enabled ? 'Token berbayar sudah menyala' : 'Token berbayar sudah mati' };
  }
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 5 || text.length > 200) return { ok: false, error: 'Alasan wajib diisi (5-200 karakter)' };
  return { ok: true, enabled, reason: text };
}

export function canJoinWithBalance(balance: number, cost = JOIN_TOKEN_COST): boolean {
  return balance >= cost;
}

function toMs(value: unknown): number | null {
  const v = value as { toDate?: () => Date; _seconds?: number; seconds?: number } | Date | null | undefined;
  if (!v) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v.toDate === 'function') return v.toDate().getTime();
  const sec = v._seconds ?? v.seconds;
  return typeof sec === 'number' ? sec * 1000 : null;
}

export async function getPaywallState(): Promise<PaywallState> {
  const snap = await adminDb.collection(PAYWALL_COLLECTION).doc(PAYWALL_DOC).get();
  const data = snap.exists() ? snap.data() ?? {} : {};
  return {
    enabled: data.enabled === true,
    updatedAtMs: toMs(data.updatedAt),
    updatedById: (data.updatedById as string) ?? null,
    updatedByName: (data.updatedByName as string) ?? null,
  };
}

/** Returns the token spent on a session that an admin cancelled. Safe to call more than once. */
export async function refundJoinToken(sessionId: string, actorId: string): Promise<boolean> {
  const spent = await adminDb.collection('exam_token_ledger')
    .where('sessionId', '==', sessionId)
    .where('type', '==', 'exam_join')
    .limit(1)
    .get();
  if (spent.empty) return false;
  const entry = spent.docs[0].data();
  const userId = entry.userId as string;

  return runTransaction(async (tx) => {
    await tx.lock(`exam_token_balance:${userId}`);
    const done = await adminDb.collection('exam_token_ledger')
      .where('sessionId', '==', sessionId)
      .where('type', '==', 'exam_refund')
      .limit(1)
      .get();
    if (!done.empty) return false;

    const walletRef = adminDb.collection('exam_users').doc(userId);
    const wallet = await tx.get(walletRef);
    if (!wallet.exists()) return false;
    const raw = wallet.data()?.tokenBalance;
    const balance = (typeof raw === 'number' ? raw : 0) + JOIN_TOKEN_COST;
    await tx.update(walletRef, { tokenBalance: balance, updatedAt: FieldValue.serverTimestamp() });
    await tx.set(adminDb.collection('exam_token_ledger').doc(), {
      userId,
      userName: (entry.userName as string) ?? '',
      userEmail: (entry.userEmail as string) ?? '',
      delta: JOIN_TOKEN_COST,
      balanceAfter: balance,
      type: 'exam_refund',
      reason: 'Pengembalian token: sesi ujian dibatalkan admin',
      actorId,
      sessionId,
      examId: (entry.examId as string) ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}
