'use client';

import { FC, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User } from 'lucide-react';
import {
  getGoogleRedirectResult,
  getUserProfile,
  signInWithGoogle,
  signUp,
} from '@/services/auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';
import { UserRole } from '@/types/firestore';

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-[#FCFCFE] py-3.5 pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#6320EE] focus:bg-white focus:ring-4 focus:ring-[#6320EE]/10';

const RegisterPage: FC = () => {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, fullName, role);
      router.push(role === 'teacher' ? '/teacher' : '/onboarding');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('sudah terdaftar di AKURAT')) {
        setError(msg);
      } else {
        const message = getAuthErrorMessage(err);
        if (message) setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const profile = await getGoogleRedirectResult();
        if (profile)
          router.push(profile.role === 'teacher' ? '/teacher' : '/dashboard');
      } catch (err) {
        const message = getAuthErrorMessage(err);
        if (message) setError(message);
      }
    };
    checkRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const mode = await signInWithGoogle();
      if (mode === 'popup') {
        const profile = await getUserProfile(auth.currentUser!.uid);
        router.push(profile?.role === 'teacher' ? '/teacher' : '/dashboard');
      }
    } catch (err) {
      const message = getAuthErrorMessage(err);
      if (message) setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-[#E6E1EF] bg-white p-6 shadow-[0_24px_70px_rgba(39,37,79,0.10)] sm:p-8">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#6320EE]">
        Start with AKURAT
      </span>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-[#27254F] sm:text-4xl">
        Create your account
      </h1>
      <p className="mb-6 mt-2 text-sm leading-6 text-slate-500">
        Choose how you will use AKURAT and begin learning with clarity.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3">
        {[
          {
            value: 'student' as UserRole,
            label: 'Student',
            description: 'Learn and track progress',
            icon: '/icons/icon-student.svg',
          },
          {
            value: 'teacher' as UserRole,
            label: 'Teacher',
            description: 'Guide and manage classes',
            icon: '/icons/icon-teacher.svg',
          },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            aria-pressed={role === option.value}
            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${role === option.value ? 'border-[#6320EE] bg-[#F4EFFF] shadow-sm' : 'border-slate-200 bg-white hover:border-[#CDBDF8]'}`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <Image src={option.icon} alt="" width={25} height={25} />
            </span>
            <span>
              <span className="block text-sm font-bold text-[#27254F]">
                {option.label}
              </span>
              <span className="block text-[11px] leading-4 text-slate-500">
                {option.description}
              </span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-[#CDBDF8] hover:bg-[#FAF8FF] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Image src="/icons/google.svg" alt="" width={18} height={18} />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">
          Or register with email
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="register-name"
            className="mb-2 block text-sm font-semibold text-[#27254F]"
          >
            Full name
          </label>
          <div className="relative">
            <User
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="register-name"
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className={fieldClass}
              placeholder="Your full name"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="register-email"
              className="mb-2 block text-sm font-semibold text-[#27254F]"
            >
              Email address
            </label>
            <div className="relative">
              <Mail
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="register-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={fieldClass}
                placeholder="name@example.com"
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="register-password"
              className="mb-2 block text-sm font-semibold text-[#27254F]"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="register-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
                placeholder="At least 6 characters"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-[#6320EE] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6320EE]/20 transition-all hover:-translate-y-0.5 hover:bg-[#5516D8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-bold text-[#6320EE] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
