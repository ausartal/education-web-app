import { NextRequest } from 'next/server';
import { adminAppCheck } from '@/lib/firebase-admin';

/**
 * Verify Firebase App Check token from request headers
 * Returns true if valid, false otherwise
 * 
 * Usage in API routes:
 *   const appCheckValid = await verifyAppCheck(req);
 *   if (!appCheckValid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 */
export async function verifyAppCheck(req: NextRequest): Promise<boolean> {
  const appCheckToken = req.headers.get('X-Firebase-AppCheck');
  if (!appCheckToken) return false;

  try {
    await adminAppCheck.verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
}
