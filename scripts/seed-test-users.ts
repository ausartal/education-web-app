/**
 * Create test accounts for AKURAT.
 * Run: npx ts-node --project tsconfig.seed.json scripts/seed-test-users.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'akurat-76834',
});

const auth = getAuth();
const db = getFirestore();

const testUsers = [
  {
    email: 'student@akurat.test',
    password: 'akurat123',
    displayName: 'Siswa Test',
    role: 'student' as const,
  },
];

async function seedUsers() {
  console.log('👤 Creating test accounts...\n');

  for (const user of testUsers) {
    try {
      // Check if user already exists
      let uid: string;
      try {
        const existing = await auth.getUserByEmail(user.email);
        uid = existing.uid;
        console.log(`⏭️  ${user.email} already exists (${uid})`);
      } catch {
        // Create new user
        const created = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        });
        uid = created.uid;
        console.log(`✅ Created ${user.email} (${uid})`);
      }

      // Create/update Firestore profile
      await db.doc(`users/${uid}`).set(
        {
          uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: null,
          role: user.role,
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          lastLoginAt: FieldValue.serverTimestamp(),
          profile: { school: 'SMA Test', grade: '11', city: 'Jakarta' },
          stats: {
            xp: 0,
            level: 1,
            streak: 0,
            longestStreak: 0,
            totalLessons: 0,
            totalQuizzes: 0,
          },
          settings: { notifications: true, language: 'id' },
        },
        { merge: true }
      );
    } catch (err) {
      console.error(`❌ Failed for ${user.email}:`, err);
    }
  }

  console.log('\n🎉 Test accounts ready!');
  console.log('\n📋 Login credentials:');
  console.log('   Email: student@akurat.test');
  console.log('   Password: akurat123');
}

seedUsers().catch(console.error);
