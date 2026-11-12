'use client';

import { FC, ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamAuth } from '@/context/ExamAuthContext';
import { activateExamAccount, examSignOut } from '@/services/exam-auth';

interface ExamAuthGuardProps {
  children: ReactNode;
}

const Spinner: FC = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#6320EE] border-t-transparent" />
  </div>
);

const Notice: FC<{ title: string; text: string; children: ReactNode }> = ({ title, text, children }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#F8F7FF] px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center ring-1 ring-[#E5E0F5]">
      <h1 className="font-display text-lg font-extrabold text-[#0E1E47]">{title}</h1>
      <p className="mt-2 text-sm text-[#5B6475]">{text}</p>
      <div className="mt-5 flex flex-col gap-2">{children}</div>
    </div>
  </div>
);

/**
 * Guard component for exam pages.
 * Requires a login and an Exam profile. Verification itself is not a hard
 * block — the dashboard shows an info banner if the account is not verified.
 */
export const ExamAuthGuard: FC<ExamAuthGuardProps> = ({ children }) => {
  const { user, loading, profileStatus, refreshProfile } = useExamAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) router.replace('/exam/login');
  }, [loading, user, router]);

  if (loading || (user && profileStatus === 'loading')) return <Spinner />;
  if (!user) return null;

  if (profileStatus === 'error') {
    return (
      <Notice title="Profil belum bisa dimuat" text="Server data sedang tidak bisa dihubungi. Periksa koneksimu atau coba lagi sebentar lagi.">
        <button onClick={() => refreshProfile()} className="rounded-xl bg-[#5841EA] px-4 py-2.5 text-sm font-semibold text-white">
          Coba lagi
        </button>
      </Notice>
    );
  }

  if (profileStatus === 'missing') {
    const activate = async () => {
      setBusy(true);
      setError('');
      try {
        const { needsProfileCompletion } = await activateExamAccount();
        await refreshProfile();
        if (needsProfileCompletion) router.replace('/exam/profile?setup=1');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal mengaktifkan akun Exam.');
      }
      setBusy(false);
    };
    return (
      <Notice
        title="Akun belum terdaftar di Exam"
        text="Akun ini belum punya profil peserta AKURAT Exam. Aktifkan untuk mengikuti ujian, lalu lengkapi data identitasmu."
      >
        {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
        <button onClick={activate} disabled={busy} className="rounded-xl bg-[#5841EA] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Mengaktifkan...' : 'Aktifkan akun Exam'}
        </button>
        <button
          onClick={async () => { await examSignOut(); router.replace('/exam/login'); }}
          className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700"
        >
          Keluar
        </button>
      </Notice>
    );
  }

  return <>{children}</>;
};
