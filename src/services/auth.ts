import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserRole, UserProfile } from '@/types/user';

const googleProvider = new GoogleAuthProvider();

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = 'student'
): Promise<void> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createUserProfile(user.uid, {
    email,
    displayName,
    photoURL: null,
    role,
  });
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

export async function signInWithGoogle(): Promise<void> {
  const { user } = await signInWithPopup(auth, googleProvider);
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
    await updateLastLogin();
  }
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
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      totalLessons: 0,
      totalQuizzes: 0,
    },
    settings: {
      notifications: true,
      language: 'id',
    },
  };

  await setDoc(doc(db, 'users', uid), profile);
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
