'use client';

import { FC, FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { examSignIn, examSignInWithGoogle } from '@/services/exam-auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';

const fieldClass =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-3 pl-10 pr-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const ExamLoginPage: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<'password' | 'google' | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading('password');
    try {
      await examSignIn(email, password, remember);
      router.push('/exam');
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message || 'Email atau kata sandi salah.');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading('google');
    try {
      const { needsProfileCompletion } = await examSignInWithGoogle(remember);
      router.push(needsProfileCompletion ? '/exam/profile?setup=1' : '/exam');
    } catch (err) {
      const message = getAuthErrorMessage(err);
      if (message) setError(message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left — branding (desktop) */}
      <div className="hidden w-[440px] shrink-0 flex-col justify-between bg-[#F0EDFF] p-10 lg:flex">
        <div>
          <Link href="/exam" className="flex items-center gap-2.5">
            <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={28} height={28} />
            <span className="font-display text-[15px] font-extrabold tracking-tight text-[#0E1E47]">
              AKURAT Exam
            </span>
          </Link>
        </div>

        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-[1.1] text-[#0E1E47]">
            Masuk ke akun<br />AKURAT Exam kamu.
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#5B6475]">
            Ikuti ujian adaptif, lihat hasil, dan cetak sertifikat dari satu tempat.
          </p>

          <div className="mt-8 space-y-3">
            {[
              'Ujian adaptif 3 stage',
              'Diagnosis kompetensi kimia',
              'Sertifikat resmi',
            ].map((item) => (
              <div key={item} className="flex items-center gap-2.5 text-sm text-[#343150]">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6320EE]/10">
                  <div className="h-1.5 w-1.5 rounded-full bg-[#6320EE]" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[#9CA3AF]">&copy; {new Date().getFullYear()} AKURAT</p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          {/* Mobile header */}
          <div className="mb-8 lg:hidden">
            <Link href="/exam" className="flex items-center gap-2">
              <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={24} height={24} />
              <span className="font-display text-sm font-extrabold text-[#0E1E47]">
                AKURAT Exam
              </span>
            </Link>
          </div>

          <h2 className="font-display text-xl font-extrabold text-[#0E1E47]">Masuk</h2>
          <p className="mt-1.5 text-sm text-[#5B6475]">
            Belum punya akun?{' '}
            <Link href="/exam/register" className="font-semibold text-[#6320EE] hover:underline">
              Daftar sekarang
            </Link>
          </p>

          {error && (
            <div className="mt-5 flex items-center gap-2.5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading !== null}
            className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-[#DCE5F2] bg-white py-3 text-sm font-semibold text-[#172033] shadow-sm transition hover:border-[#C8D4E5] hover:bg-[#F8FAFC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6320EE]/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === 'google' ? (
              <Loader2 size={17} className="animate-spin text-[#6320EE]" />
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]">
                <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.87h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.35Z" />
                <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.42l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.59A10 10 0 0 0 12 22Z" />
                <path fill="#FBBC05" d="M6.39 13.9A6.02 6.02 0 0 1 6.08 12c0-.66.11-1.3.31-1.9V7.51H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.49l3.35-2.59Z" />
                <path fill="#EA4335" d="M12 5.97c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.51l3.35 2.59C7.18 7.73 9.39 5.97 12 5.97Z" />
              </svg>
            )}
            {loading === 'google' ? 'Menghubungkan...' : 'Lanjutkan dengan Google'}
          </button>

          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#E5EAF1]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              atau dengan email
            </span>
            <span className="h-px flex-1 bg-[#E5EAF1]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                Email
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="nama@email.com"
                  required
                  className={fieldClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                Kata Sandi
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Minimal 8 karakter"
                  required
                  minLength={8}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#5B6475]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[#DCE5F2] text-[#6320EE] focus:ring-[#6320EE]"
                />
                Ingat saya
              </label>
              <Link href="/forgot-password" className="text-xs font-medium text-[#6320EE] hover:underline">
                Lupa kata sandi?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading !== null || !email || password.length < 8}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6320EE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40 disabled:hover:bg-[#6320EE]"
            >
              {loading === 'password' ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading === 'password' ? 'Masuk...' : 'Masuk'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-[#9CA3AF]">
            Dengan masuk, kamu menyetujui{' '}
            <Link href="/terms" className="text-[#6320EE] hover:underline">Syarat Layanan</Link>
            {' '}dan{' '}
            <Link href="/privacy" className="text-[#6320EE] hover:underline">Kebijakan Privasi</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExamLoginPage;
