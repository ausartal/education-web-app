'use client';

import { FC, FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import {
  getGoogleRedirectResult,
  getUserProfile,
  signIn,
  signInWithGoogle,
} from '@/services/auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { auth } from '@/lib/firebase';

const LoginPage: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function redirectByRole(role?: string) {
    if (role === 'admin') router.push('/admin');
    else if (role === 'teacher') router.push('/teacher');
    else router.push('/dashboard');
  }

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const profile = await getGoogleRedirectResult();
        if (profile) redirectByRole(profile.role);
      } catch (err) {
        const message = getAuthErrorMessage(err);
        if (message) setError(message);
      }
    };
    checkRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      const profile = await getUserProfile(auth.currentUser!.uid);
      redirectByRole(profile?.role);
    } catch (err) {
      const message = getAuthErrorMessage(err);
      if (message) setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      const mode = await signInWithGoogle();
      if (mode === 'popup') {
        const profile = await getUserProfile(auth.currentUser!.uid);
        redirectByRole(profile?.role);
      }
    } catch (err) {
      const message = getAuthErrorMessage(err);
      if (message) setError(message);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-[#E6E1EF] bg-white p-6 shadow-[0_24px_70px_rgba(39,37,79,0.10)] sm:p-9">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-[#6320EE]">
        Welcome to AKURAT
      </span>
      <h1 className="mt-3 font-display text-3xl font-extrabold text-[#27254F] sm:text-4xl">
        Welcome back
      </h1>
      <p className="mb-7 mt-2 text-sm leading-6 text-slate-500">
        Continue your chemistry learning journey where you left off.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

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
          Or continue with email
        </span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="login-email"
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
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FCFCFE] py-3.5 pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#6320EE] focus:bg-white focus:ring-4 focus:ring-[#6320EE]/10"
              placeholder="name@example.com"
            />
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-sm font-semibold text-[#27254F]"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-semibold text-[#6320EE] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-[#FCFCFE] py-3.5 pl-11 pr-3 text-sm text-slate-900 outline-none transition focus:border-[#6320EE] focus:bg-white focus:ring-4 focus:ring-[#6320EE]/10"
              placeholder="Enter your password"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-[#6320EE] px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#6320EE]/20 transition-all hover:-translate-y-0.5 hover:bg-[#5516D8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-bold text-[#6320EE] hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
