'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ensureStudentProfile, signOut } from '@/services/auth';
import { getExamUserProfile } from '@/services/exam-auth';

interface AuthGuardProps {
  children: ReactNode;
}

const Spinner: FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const Notice: FC<{ title: string; text: string; children: ReactNode }> = ({ title, text, children }) => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
      <h1 className="font-display text-lg font-extrabold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">{text}</p>
      <div className="mt-5 flex flex-col gap-2">{children}</div>
    </div>
  </div>
);

export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const { user, loading, profileStatus, refreshProfile } = useAuth();
  const router = useRouter();
  const [checkingExam, setCheckingExam] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // A signed-in account without a school profile may be an Exam-only account.
  useEffect(() => {
    if (!user || profileStatus !== 'missing') return;
    let cancelled = false;
    setCheckingExam(true);
    getExamUserProfile(user.uid)
      .then((examProfile) => {
        if (!cancelled && examProfile) router.replace('/exam');
      })
      .catch(() => { /* fall through to the recovery notice */ })
      .finally(() => { if (!cancelled) setCheckingExam(false); });
    return () => { cancelled = true; };
  }, [user, profileStatus, router]);

  if (loading || (user && (profileStatus === 'loading' || checkingExam))) return <Spinner />;
  if (!user) return null;

  if (profileStatus === 'error') {
    return (
      <Notice title="Profil belum bisa dimuat" text="Server data sedang tidak bisa dihubungi. Periksa koneksimu atau coba lagi sebentar lagi.">
        <button onClick={() => refreshProfile()} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white">
          Coba lagi
        </button>
      </Notice>
    );
  }

  if (profileStatus === 'missing') {
    const createProfile = async () => {
      setBusy(true);
      setError('');
      try {
        await ensureStudentProfile();
        await refreshProfile();
      } catch {
        setError('Gagal membuat profil. Coba lagi.');
      }
      setBusy(false);
    };
    return (
      <Notice title="Profil belum ditemukan" text="Akun ini belum punya profil AKURAT. Kamu bisa melanjutkan sebagai siswa atau keluar.">
        {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
        <button onClick={createProfile} disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Membuat profil...' : 'Lanjutkan sebagai siswa'}
        </button>
        <button onClick={async () => { await signOut(); router.replace('/login'); }} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700">
          Keluar
        </button>
      </Notice>
    );
  }

  return <>{children}</>;
};
