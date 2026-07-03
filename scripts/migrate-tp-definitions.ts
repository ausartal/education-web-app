/**
 * Migration: Seed tp_definitions + tag existing exam_questions with visibility fields.
 * Run: npx ts-node --project tsconfig.seed.json scripts/migrate-tp-definitions.ts
 *
 * Safe to run multiple times (idempotent).
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const adminAuth = getAuth();

const TEACHER_EMAIL = 'ahmadnabalfalah@gmail.com';

const LEGACY_TPS = [
  { id: 'tp1', code: 'TP1', name: 'Hubungan Mol & Pereaksi Pembatas',    subject: 'Kimia', order: 1 },
  { id: 'tp2', code: 'TP2', name: 'Stoikiometri Gas (Hukum Avogadro/STP)', subject: 'Kimia', order: 2 },
  { id: 'tp3', code: 'TP3', name: 'Konsep Mol & Jumlah Partikel',         subject: 'Kimia', order: 3 },
  { id: 'tp4', code: 'TP4', name: 'Rumus Empiris & Rumus Molekul',        subject: 'Kimia', order: 4 },
  { id: 'tp5', code: 'TP5', name: 'Konsentrasi Larutan',                  subject: 'Kimia', order: 5 },
];

async function main() {
  const teacher = await adminAuth.getUserByEmail(TEACHER_EMAIL);
  const teacherUid = teacher.uid;
  console.log('Teacher UID:', teacherUid);

  // 1. Seed tp_definitions with matching IDs so no question migration needed
  console.log('\n📌 Seeding tp_definitions...');
  for (const tp of LEGACY_TPS) {
    const ref = db.collection('tp_definitions').doc(tp.id);
    const snap = await ref.get();
    if (snap.exists) {
      console.log(`  ⏭  ${tp.id} already exists`);
      continue;
    }
    await ref.set({
      code: tp.code,
      name: tp.name,
      subject: tp.subject,
      description: '',
      scope: 'global',
      ownerId: teacherUid,
      ownerName: 'Admin',
      order: tp.order,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✅ Created ${tp.id}: ${tp.name}`);
  }

  // 2. Tag existing exam_questions with visibility fields (batch)
  console.log('\n🏷  Tagging existing exam_questions...');
  const questionsSnap = await db.collection('exam_questions').get();
  const toUpdate = questionsSnap.docs.filter(d => !d.data().visibility);

  if (toUpdate.length === 0) {
    console.log('  ⏭  All questions already tagged');
  } else {
    const BATCH_SIZE = 499;
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = db.batch();
      toUpdate.slice(i, i + BATCH_SIZE).forEach(d => {
        batch.update(d.ref, {
          visibility: 'global',
          approvalStatus: 'approved',
          ownerId: teacherUid,
        });
      });
      await batch.commit();
      console.log(`  ✅ Tagged ${Math.min(i + BATCH_SIZE, toUpdate.length)} / ${toUpdate.length}`);
    }
  }

  console.log('\n🎉 Migration complete!');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
