import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  User,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  EmailAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
  updateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from '@/lib/client-firestore';
import { auth, db } from '@/lib/firebase';
import { UserRole, UserProfile } from '@/types/firestore';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = 'student'
): Promise<void> {
  let user;
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    user = result.user;
    await updateProfile(user, { displayName });
  } catch (createErr: unknown) {
    const code = (createErr as { code?: string }).code ?? '';
    if (code === 'auth/email-already-in-use') {
      // Email already exists (e.g. exam account). Try signing in with same password.
      try {
        const { user: existingUser } = await signInWithEmailAndPassword(auth, email, password);
        user = existingUser;
      } catch {
        // Password doesn't match the existing account
        const err = new Error('Email ini sudah terdaftar di AKURAT. Gunakan kata sandi yang sama, atau masuk terlebih dahulu.');
        (err as { code?: string }).code = 'auth/email-already-in-use';
        throw err;
      }
      // Check if school profile already exists
      const existingProfile = await getUserProfile(user!.uid);
      if (existingProfile) {
        const err = new Error('Email sudah terdaftar. Silakan login.');
        (err as { code?: string }).code = 'auth/email-already-in-use';
        throw err;
      }
      if (user!.displayName !== displayName) {
        await updateProfile(user!, { displayName });
      }
    } else {
      throw createErr;
    }
  }
  await createUserProfile(user!.uid, {
    email,
    displayName,
    photoURL: null,
    role,
  });

  if (!user!.emailVerified) {
    try {
      await sendEmailVerification(user!);
    } catch {
      // Non-fatal: the dashboard banner lets the user request it again
    }
  }
}

export async function signIn(
  email: string,
  password: string,
  rememberMe: boolean = true
): Promise<void> {
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence
  );
  await signInWithEmailAndPassword(auth, email, password);
  await updateLastLogin();
}

export async function signInWithGoogle(): Promise<'popup' | 'redirect'> {
  try {
    const { user } = await signInWithPopup(auth, googleProvider);
    await _syncGoogleUser(user);
    return 'popup';
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? '';
    // Fallback to redirect when popup is blocked or unavailable
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, googleProvider);
      return 'redirect';
    }
    throw err;
  }
}

/** Call on page mount to pick up a pending Google redirect result */
export async function getGoogleRedirectResult(): Promise<UserProfile | null> {
  const result = await getRedirectResult(auth);
  if (!result) return null;
  await _syncGoogleUser(result.user);
  return getUserProfile(result.user.uid);
}

async function _syncGoogleUser(user: User): Promise<void> {
  const profileRef = doc(db, 'users', user.uid);
  const profileSnap = await getDoc(profileRef);
  if (!profileSnap.exists()) {
    await createUserProfile(user.uid, {
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL,
      role: 'student',
    });
  } else {
    // Sync Google photo so students/teachers signing in with Gmail get their avatar
    const updates: Record<string, unknown> = { lastLoginAt: serverTimestamp() };
    const existingPhoto = (profileSnap.data() as { photoURL?: string | null })?.photoURL;
    if (user.photoURL && !existingPhoto) {
      updates.photoURL = user.photoURL;
    }
    await setDoc(profileRef, updates, { merge: true });
  }
}

/**
 * Creates the missing school profile (student) for the signed-in account.
 * Used to recover accounts whose profile was never written.
 */
export async function ensureStudentProfile(): Promise<UserProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;
  await createUserProfile(user.uid, {
    email: user.email || '',
    displayName: user.displayName || (user.email || '').split('@')[0],
    photoURL: user.photoURL,
    role: 'student',
  });
  return getUserProfile(user.uid);
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Belum masuk');
  await sendEmailVerification(user);
}

export function hasPasswordProvider(user: User | null): boolean {
  return !!user?.providerData.some((p) => p.providerId === 'password');
}

async function reauthenticate(user: User, password?: string): Promise<void> {
  if (hasPasswordProvider(user)) {
    if (!password || !user.email) throw new Error('Masukkan kata sandi saat ini.');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
    return;
  }
  await reauthenticateWithPopup(user, googleProvider);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Belum masuk');
  await reauthenticate(user, currentPassword);
  await updatePassword(user, newPassword);
}

/** Deletes the signed-in student account (server side) after re-authenticating. */
export async function deleteOwnAccount(password?: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Belum masuk');
  await reauthenticate(user, password);

  const token = await user.getIdToken(true);
  const res = await fetch('/api/user/account', {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal menghapus akun.');
  }
  await firebaseSignOut(auth);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

async function createUserProfile(
  uid: string,
  data: {
    email: string;
    displayName: string;
    photoURL: string | null;
    role: UserRole;
  }
): Promise<void> {
  const profile = {
    uid,
    email: data.email,
    displayName: data.displayName,
    photoURL: data.photoURL,
    role: data.role,
    isActive: true,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    profile: {},
    stats: {
      totalLessons: 0,
      totalQuizzes: 0,
    },
    settings: {
      notifications: true,
      language: 'id',
    },
  };

  await setDoc(doc(db, 'users', uid), profile);

  // Sync role to Firebase Auth custom claim (eliminates Firestore read in rules)
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      const token = await currentUser.getIdToken();
      await fetch('/api/auth/sync-claim', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    // Non-fatal: custom claim will be synced on next login or admin action
  }
}

async function updateLastLogin(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await setDoc(
      doc(db, 'users', user.uid),
      { lastLoginAt: serverTimestamp() },
      { merge: true }
    );
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
