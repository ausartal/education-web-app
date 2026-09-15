import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export type ExamToken = DecodedIdToken & { role: string; displayName: string };

/**
 * Verify a Bearer token and confirm the user exists in `exam_users`
 * with isActive == true. Returns the decoded token + profile data, or null.
 */
export async function verifyExamUser(req: NextRequest): Promise<ExamToken | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice(7));
    const userDoc = await adminDb.collection('exam_users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.isActive !== true) return null;
    const data = userDoc.data()!;
    return { ...decoded, role: 'exam_user', displayName: (data.displayName as string) ?? '' };
  } catch {
    return null;
  }
}

// Re-export pure functions for convenience
export { validateRegistration, sanitizeInput, generateCertificateNo } from '@/lib/exam-validation';
export type { ValidationError } from '@/lib/exam-validation';