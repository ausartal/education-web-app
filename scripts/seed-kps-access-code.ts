import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function seed() {
  console.log('🔑 Creating KPS access code...\n');

  const code = 'KPS2026';
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  // Check if code already exists
  const existing = await db.collection('kps_access_codes').where('code', '==', code).limit(1).get();
  if (!existing.empty) {
    console.log(`  ⚠️ Code "${code}" already exists (id: ${existing.docs[0].id})`);
    return;
  }

  const docRef = db.collection('kps_access_codes').doc();
  await docRef.set({
    code,
    title: 'Ujian KPS 2026',
    description: 'Kode akses ujian KPS untuk testing',
    maxUses: 0, // unlimited
    currentUses: 0,
    status: 'active',
    expiresAt,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: 'system',
  });

  console.log(`  ✅ Access code created: ${code}`);
  console.log(`  📋 Doc ID: ${docRef.id}`);
  console.log(`  📅 Expires: ${expiresAt.toLocaleDateString('id-ID')}`);
  console.log(`  ♾️  Max uses: unlimited`);
  console.log(`\n🎉 Done! Use code "${code}" to start a KPS exam.`);
}

seed().catch(console.error);
