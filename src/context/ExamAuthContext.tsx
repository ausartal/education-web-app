'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  FC,
  ReactNode,
} from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getExamUserProfile } from '@/services/exam-auth';
import type { ExamUser } from '@/types/exam-user';

interface ExamAuthContextValue {
  user: User | null;
  examUser: ExamUser | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const ExamAuthContext = createContext<ExamAuthContextValue>({
  user: null,
  examUser: null,
  loading: true,
  refreshProfile: async () => {},
});

export const ExamAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [examUser, setExamUser] = useState<ExamUser | null>(null);
  const [loading, setLoading] = useState(!auth.currentUser);

  const fetchProfile = useCallback(async (firebaseUser: User) => {
    try {
      const profile = await getExamUserProfile(firebaseUser.uid);
      if (profile) {
        setExamUser(profile);
      }
      // If profile is null (document doesn't exist yet), keep previous state
    } catch {
      // On error, keep previous state — don't wipe existing data
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchProfile(firebaseUser);
      } else {
        setExamUser(null);
      }
      setLoading(false);
    }, (err) => {
      if (err?.message?.includes('Database is closing')) return;
      console.error('Exam auth state error:', err);
    });
    return unsubscribe;
  }, [fetchProfile]);

  const value = useMemo(
    () => ({ user, examUser, loading, refreshProfile }),
    [user, examUser, loading, refreshProfile],
  );

  return <ExamAuthContext.Provider value={value}>{children}</ExamAuthContext.Provider>;
};

export const useExamAuth = () => useContext(ExamAuthContext);