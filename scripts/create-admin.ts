import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const adminAuth = getAuth();
const adminDb = getFirestore();

const ADMIN_EMAIL = 'admin@akurat.app';
const ADMIN_PASSWORD = 'Admin@AKURAT2024!';
const ADMIN_NAME = 'Super Admin';

async function createAdmin() {
  console.log('Creating admin account...');

  // Check if already exists
  try {
    const existing = await adminAuth.getUserByEmail(ADMIN_EMAIL);
    console.log('Admin account already exists:', existing.uid);
    // Ensure Firestore profile is correct
    await adminDb.collection('users').doc(existing.uid).set({
      uid: existing.uid,
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      photoURL: null,
      role: 'admin',
      isActive: true,
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      profile: {},
      stats: { xp: 9999, level: 99, streak: 0, longestStreak: 0, totalLessons: 0, totalQuizzes: 0 },
      settings: { notifications: true, language: 'id' },
    }, { merge: true });
    console.log('Admin profile updated.');
    return;
  } catch (err: unknown) {
    if ((err as { code?: string }).code !== 'auth/user-not-found') throw err;
  }

  // Create new
  const user = await adminAuth.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: ADMIN_NAME,
    emailVerified: true,
  });

  await adminDb.collection('users').doc(user.uid).set({
    uid: user.uid,
    email: ADMIN_EMAIL,
    displayName: ADMIN_NAME,
    photoURL: null,
    role: 'admin',
    isActive: true,
    createdAt: Timestamp.now(),
    lastLoginAt: Timestamp.now(),
    profile: {},
    stats: { xp: 9999, level: 99, streak: 0, longestStreak: 0, totalLessons: 0, totalQuizzes: 0 },
    settings: { notifications: true, language: 'id' },
  });

  console.log('Admin account created!');
  console.log('   Email:', ADMIN_EMAIL);
  console.log('   Password:', ADMIN_PASSWORD);
  console.log('   UID:', user.uid);
}

createAdmin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
