import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function check() {
  console.log('🔍 Checking kps_access_codes collection...\n');

  const snap = await db.collection('kps_access_codes').get();
  console.log(`Total documents: ${snap.size}\n`);

  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`  ID: ${doc.id}`);
    console.log(`  code: "${data.code}" (type: ${typeof data.code}, length: ${data.code?.length})`);
    console.log(`  status: "${data.status}"`);
    console.log(`  maxUses: ${data.maxUses}`);
    console.log(`  currentUses: ${data.currentUses}`);
    console.log(`  expiresAt: ${data.expiresAt?.toDate?.() ?? data.expiresAt}`);
    console.log(`  title: "${data.title}"`);
    console.log('  ---');
  }

  // Test the exact query the API uses
  console.log('\n🧪 Testing query: where("code", "==", "KPS2026")...');
  const testSnap = await db.collection('kps_access_codes')
    .where('code', '==', 'KPS2026')
    .limit(1)
    .get();

  if (testSnap.empty) {
    console.log('  ❌ Query returned EMPTY — code not found!');
    console.log('\n  Trying case-insensitive search...');
    const allSnap = await db.collection('kps_access_codes').get();
    for (const doc of allSnap.docs) {
      const code = doc.data().code;
      console.log(`    Comparing: "${code}" === "KPS2026" → ${code === 'KPS2026'}`);
      console.log(`    Uppercase: "${code.toUpperCase()}" === "KPS2026" → ${code.toUpperCase() === 'KPS2026'}`);
    }
  } else {
    const data = testSnap.docs[0].data();
    console.log(`  ✅ Found! Doc ID: ${testSnap.docs[0].id}`);
    console.log(`  status: ${data.status}`);
    console.log(`  expiresAt: ${data.expiresAt?.toDate?.()}`);
    console.log(`  expired: ${data.expiresAt?.toDate?.() < new Date()}`);
  }

  // Also check kps_exam_sessions
  console.log('\n📋 Checking kps_exam_sessions...');
  const sessionsSnap = await db.collection('kps_exam_sessions').get();
  console.log(`  Total sessions: ${sessionsSnap.size}`);

  // Check kps_questions
  console.log('\n📝 Checking kps_questions...');
  const questionsSnap = await db.collection('kps_questions').get();
  console.log(`  Total questions: ${questionsSnap.size}`);

  // Check kps_stimuli
  console.log('\n📄 Checking kps_stimuli...');
  const stimuliSnap = await db.collection('kps_stimuli').get();
  console.log(`  Total stimuli: ${stimuliSnap.size}`);
}

check().catch(console.error);
