require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const TARGET_UID = 'hbLZkEqE8yUYUHtTLoUH4lez4wF3';

db.collection('users').doc(TARGET_UID).update({ role: 'admin', isActive: true })
  .then(() => { console.log('✅ Role berhasil diubah ke admin'); process.exit(0); })
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
