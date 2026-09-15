import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { ExamUser, ExamRegistrationData } from '@/types/exam-user';

/**
 * Register a new exam user. Creates a Firebase Auth account
 * and a corresponding exam_users document.
 */
export async function examSignUp(data: ExamRegistrationData): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, data.email, data.password);
  await updateProfile(user, { displayName: data.displayName });

  const profile: Omit<ExamUser, 'createdAt' | 'lastLoginAt' | 'verifiedAt'> & {
    createdAt: ReturnType<typeof serverTimestamp>;
    lastLoginAt: ReturnType<typeof serverTimestamp>;
    verifiedAt: null;
  } = {
    uid: user.uid,
    email: data.email,
    displayName: data.displayName.trim(),
    phoneNumber: data.phoneNumber.trim(),
    gender: data.gender,
    photoURL: null,
    identityNumber: data.identityNumber.trim(),
    identityType: data.identityType,
    institution: data.institution.trim(),
    birthDate: data.birthDate,
    birthPlace: data.birthPlace.trim(),
    address: data.address.trim(),
    verificationStatus: 'unverified',
    verificationNotes: '',
    verifiedAt: null,
    tokenBalance: 0,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    isActive: true,
  };

  await setDoc(doc(db, 'exam_users', user.uid), profile);

  // Sync custom claim
  try {
    const token = await user.getIdToken();
    await fetch('/api/exam/auth/sync-claim', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // Non-fatal: claim will be synced on next login
  }
}

/**
 * Login an exam user.
 */
export async function examSignIn(
  email: string,
  password: string,
  rememberMe = true,
): Promise<void> {
  await setPersistence(
    auth,
    rememberMe ? browserLocalPersistence : browserSessionPersistence,
  );
  await signInWithEmailAndPassword(auth, email, password);
  await updateExamLastLogin();
}

/**
 * Sign out from exam.
 */
export async function examSignOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Get exam user profile from Firestore.
 */
export async function getExamUserProfile(uid: string): Promise<ExamUser | null> {
  const snap = await getDoc(doc(db, 'exam_users', uid));
  return snap.exists() ? (snap.data() as ExamUser) : null;
}

/**
 * Check if current user is an exam_user (exists in exam_users collection).
 */
export async function isExamUser(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'exam_users', uid));
  return snap.exists() && snap.data()?.isActive === true;
}

async function updateExamLastLogin(): Promise<void> {
  const user = auth.currentUser;
  if (user) {
    await setDoc(
      doc(db, 'exam_users', user.uid),
      { lastLoginAt: serverTimestamp() },
      { merge: true },
    );
  }
}