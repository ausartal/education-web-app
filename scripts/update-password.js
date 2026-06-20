require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const EMAIL = 'admin@akurat.app';
const NEW_PASSWORD = 'admin123';

admin.auth().getUserByEmail(EMAIL)
  .then(user => admin.auth().updateUser(user.uid, { password: NEW_PASSWORD }))
  .then(() => { console.log(`✅ Password untuk ${EMAIL} berhasil diubah ke: ${NEW_PASSWORD}`); process.exit(0); })
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
