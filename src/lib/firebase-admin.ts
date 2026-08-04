import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAppCheck } from 'firebase-admin/app-check';

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not set');
    }
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON');
  }
}

const serviceAccount = getServiceAccount();

const app =
  getApps().length === 0
    ? initializeApp({
        credential: serviceAccount ? cert(serviceAccount) : undefined,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);
export const adminAppCheck = getAppCheck(app);
export default app;
