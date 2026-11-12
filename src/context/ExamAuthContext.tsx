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

export type ExamProfileStatus = 'loading' | 'ready' | 'missing' | 'error';

interface ExamAuthContextValue {
  user: User | null;
  examUser: ExamUser | null;
  loading: boolean;
  profileStatus: ExamProfileStatus;
  refreshProfile: () => Promise<void>;
}

const ExamAuthContext = createContext<ExamAuthContextValue>({
  user: null,
  examUser: null,
  loading: true,
  profileStatus: 'loading',
  refreshProfile: async () => {},
});

export const ExamAuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [examUser, setExamUser] = useState<ExamUser | null>(null);
  const [loading, setLoading] = useState(!auth.currentUser);
  const [profileStatus, setProfileStatus] = useState<ExamProfileStatus>('loading');

  const fetchProfile = useCallback(async (firebaseUser: User) => {
    try {
      const profile = await getExamUserProfile(firebaseUser.uid);
      if (profile) {
        setExamUser(profile);
        setProfileStatus('ready');
      } else {
        setExamUser(null);
        setProfileStatus('missing');
      }
    } catch {
      // On error, keep previous data — only flag the failure
      setProfileStatus((s) => (s === 'ready' ? s : 'error'));
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
        setProfileStatus('loading');
        await fetchProfile(firebaseUser);
      } else {
        setExamUser(null);
        setProfileStatus('missing');
      }
      setLoading(false);
    }, (err) => {
      if (err?.message?.includes('Database is closing')) return;
      console.error('Exam auth state error:', err);
    });
    return unsubscribe;
  }, [fetchProfile]);

  // Poll profile every 30s for verification status updates
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchProfile(user);
    }, 30_000);
    return () => clearInterval(interval);
  }, [user, fetchProfile]);

  const value = useMemo(
    () => ({ user, examUser, loading, profileStatus, refreshProfile }),
    [user, examUser, loading, profileStatus, refreshProfile],
  );

  return <ExamAuthContext.Provider value={value}>{children}</ExamAuthContext.Provider>;
};

export const useExamAuth = () => useContext(ExamAuthContext);