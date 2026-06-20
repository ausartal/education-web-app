import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

// UID akun ahmadnabalfalah@gmail.com
const TARGET_UID = 'hbLZkEqE8yUYUHtTLoUH4lez4wF3';

async function main() {
  const ref = db.collection('users').doc(TARGET_UID);
  const snap = await ref.get();

  if (!snap.exists) {
    console.error('❌ User tidak ditemukan di Firestore');
    process.exit(1);
  }

  const before = snap.data()!;
  console.log(`📋 Sebelum: role=${before.role}, email=${before.email}`);

  await ref.update({ role: 'admin', isActive: true });
  console.log('✅ Role berhasil diubah ke admin');
}

main().catch(e => { console.error(e); process.exit(1); });
