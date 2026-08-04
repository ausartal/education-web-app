# Firebase App Check Setup Guide

Firebase App Check melindungi API dari abuse dengan memverifikasi bahwa request berasal dari aplikasi yang sah.

## Langkah-langkah Setup

### 1. Aktifkan App Check di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project `akurat-76834`
3. Menu: **Build** → **App Check**
4. Klik **Get started**

### 2. Daftarkan Web App

1. Di tab **Apps**, klik web app Anda
2. Pilih provider **reCAPTCHA v3** (recommended) atau **reCAPTCHA Enterprise**
3. Untuk reCAPTCHA v3:
   - Buka [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
   - Buat site baru dengan reCAPTCHA v3
   - Copy **Site Key** dan **Secret Key**
   - Masukkan di Firebase Console
4. Klik **Register**

### 3. Dapatkan App Check Token

Setelah register, Firebase akan memberikan:
- `appCheckToken` - untuk client-side
- `debugToken` - untuk development (opsional)

### 4. Install Firebase App Check di Client

```bash
npm install firebase
```

Update `src/lib/firebase.ts`:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize App Check (only in browser)
if (typeof window !== 'undefined') {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true,
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
```

### 5. Tambah Environment Variable

Update `.env.local`:
```
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_recaptcha_v3_site_key
```

### 6. Protect API Routes dengan App Check

Untuk memverifikasi App Check token di server, update `src/lib/auth-helpers.ts`:

```typescript
import { getAppCheck } from 'firebase-admin/app-check';

export async function verifyAppCheck(req: NextRequest): Promise<boolean> {
  const appCheckToken = req.headers.get('X-Firebase-AppCheck');
  if (!appCheckToken) return false;
  
  try {
    await getAppCheck().verifyToken(appCheckToken);
    return true;
  } catch {
    return false;
  }
}
```

### 7. Enforce App Check di Firebase Console

1. Di Firebase Console → App Check
2. Tab **APIs**
3. Untuk setiap API (Firestore, Storage, Auth):
   - Klik **Enforce**
   - Ini akan memblokir request tanpa App Check token

### 8. Debug Token untuk Development

Untuk development, tambahkan debug token:

1. Di Firebase Console → App Check → Apps
2. Klik web app → **Debug tokens**
3. Generate debug token
4. Set di browser console:
   ```javascript
   self.FIREBASE_APPCHECK_DEBUG_TOKEN = 'your_debug_token';
   ```

## Monitoring

Setelah App Check diaktifkan:
- Monitor **App Check** tab di Firebase Console
- Lihat metrics: valid vs invalid requests
- Adjust enforcement jika perlu

## Catatan

- App Check tidak memblokir request dari Firebase Admin SDK (server-side)
- Hanya memblokir client-side API calls
- Debug token hanya untuk development, jangan gunakan di production
- reCAPTCHA v3 gratis untuk hingga 10,000 verifications/bulan
