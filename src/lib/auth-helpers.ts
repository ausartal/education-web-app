import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export type TeacherToken = DecodedIdToken & { role: string; displayName: string };

export async function verifyAdmin(req: NextRequest): Promise<DecodedIdToken | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded;
  } catch { return null; }
}

export async function verifyTeacher(req: NextRequest): Promise<TeacherToken | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    const data = userDoc.data();
    const role = data?.role as string | undefined;
    if (!userDoc.exists || (role !== 'teacher' && role !== 'admin')) return null;
    return { ...decoded, role, displayName: (data?.displayName as string) ?? '' };
  } catch { return null; }
}
