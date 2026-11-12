'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  FC,
  ReactNode,
} from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/services/auth';
import { UserProfile } from '@/types/firestore';

/**
 * loading: profile not fetched yet
 * ready:   profile loaded
 * missing: signed in, but no school profile exists
 * error:   the fetch failed (network/server); the profile may exist
 */
export type ProfileStatus = 'loading' | 'ready' | 'missing' | 'error';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileStatus: ProfileStatus;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  profileStatus: 'loading',
  refreshProfile: async () => {},
});

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Initialise synchronously from the cached auth state — avoids the
  // full-screen spinner on every navigation when the user is already signed in.
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!auth.currentUser);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading');

  const loadProfile = useCallback(async (firebaseUser: User) => {
    try {
      const userProfile = await getUserProfile(firebaseUser.uid);
      setProfile(userProfile);
      setProfileStatus(userProfile ? 'ready' : 'missing');
    } catch {
      // Keep any profile we already have; only flag the failure.
      setProfileStatus('error');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setProfileStatus('loading');
        await loadProfile(firebaseUser);
      } else {
        setProfile(null);
        setProfileStatus('missing');
      }
      setLoading(false);
    }, (err) => {
      // Suppress IndexedDB "Database is closing/hidden" errors during navigation/HMR
      if (err?.message?.includes('Database is closing')) return;
      console.error('Auth state error:', err);
    });
    return unsubscribe;
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    setProfileStatus('loading');
    await loadProfile(auth.currentUser);
  }, [loadProfile]);

  // Memoize value supaya komponen yang pakai useAuth() tidak re-render
  // saat state lain di parent berubah — hanya re-render kalau user/profile/loading berubah.
  const value = useMemo(
    () => ({ user, profile, loading, profileStatus, refreshProfile }),
    [user, profile, loading, profileStatus, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
