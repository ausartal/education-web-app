/**
 * Seed questions and materials to Firestore.
 * Run: npx ts-node --project tsconfig.seed.json scripts/seed-content.ts
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
);

initializeApp({
  credential: cert(serviceAccount),
  projectId: 'akurat-76834',
});

const db = getFirestore();

async function seedQuestions() {
  const files = ['question-easy', 'question-moderate', 'question-hard'];
  let total = 0;

  for (const file of files) {
    const filePath = path.join(__dirname, 'data', `${file}.json`);
    const questions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const difficulty = file.replace('question-', '');

    const batch = db.batch();
    for (const q of questions) {
      const ref = db.collection('question_bank').doc();
      batch.set(ref, {
        ...q,
        difficulty,
        usageCount: 0,
        avgCorrectRate: 0,
        avgTimeSpent: 0,
        createdBy: 'admin',
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    total += questions.length;
    console.log(`✅ ${questions.length} ${difficulty} questions seeded`);
  }

  console.log(`   Total: ${total} questions\n`);
}

async function seedMaterials() {
  const filePath = path.join(__dirname, 'data', 'material.json');
  const materials = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const batch = db.batch();
  for (const m of materials) {
    const ref = db.collection('materials').doc();
    batch.set(ref, {
      ...m,
      createdBy: 'admin',
      status: 'published',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  console.log(`✅ ${materials.length} materials seeded\n`);
}

async function main() {
  console.log('🌱 Seeding content to Firestore...\n');
  await seedQuestions();
  await seedMaterials();
  console.log('🎉 Content seed complete!');
}

main().catch(console.error);
