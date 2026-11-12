'use client';

import { FC, useState } from 'react';
import { MailWarning } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { hasPasswordProvider, resendVerificationEmail } from '@/services/auth';

export const EmailVerificationBanner: FC = () => {
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  if (!user || verified || user.emailVerified || !hasPasswordProvider(user)) return null;

  const resend = async () => {
    setBusy(true);
    setMessage('');
    try {
      await resendVerificationEmail();
      setMessage('Email verifikasi dikirim. Periksa kotak masuk dan folder spam.');
    } catch {
      setMessage('Belum bisa mengirim email. Coba lagi sebentar lagi.');
    }
    setBusy(false);
  };

  const check = async () => {
    setBusy(true);
    setMessage('');
    try {
      await user.reload();
      if (user.emailVerified) setVerified(true);
      else setMessage('Email belum terverifikasi. Buka tautan di email kamu terlebih dahulu.');
    } catch {
      setMessage('Gagal memeriksa status. Coba lagi.');
    }
    setBusy(false);
  };

  return (
    <div role="status" className="border-b border-amber-100 bg-amber-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 text-xs text-amber-800">
        <span className="flex items-center gap-2 font-semibold">
          <MailWarning size={14} aria-hidden="true" />
          Email {user.email} belum diverifikasi.
        </span>
        {message && <span>{message}</span>}
        <span className="ml-auto flex gap-2">
          <button onClick={resend} disabled={busy} className="rounded-lg bg-amber-600 px-3 py-1 font-semibold text-white disabled:opacity-50">
            Kirim ulang
          </button>
          <button onClick={check} disabled={busy} className="rounded-lg bg-white px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200 disabled:opacity-50">
            Saya sudah verifikasi
          </button>
        </span>
      </div>
    </div>
  );
};
