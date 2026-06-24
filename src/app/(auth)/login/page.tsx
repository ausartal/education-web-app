'use client';

import { FC, FormEvent, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock } from 'lucide-react';
import { signIn, signInWithGoogle, getGoogleRedirectResult, getUserProfile } from '@/services/auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { useToast } from '@/hooks/useToast';
import { auth } from '@/lib/firebase';

const LoginPage: FC = () => {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function redirectByRole(role?: string) {
    if (role === 'admin') router.push('/admin');
    else if (role === 'teacher') router.push('/teacher');
    else router.push('/dashboard');
  }

  // Handle Google redirect result (fallback from popup-blocked)
  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const profile = await getGoogleRedirectResult();
        if (profile) redirectByRole(profile.role);
      } catch (err) {
        const msg = getAuthErrorMessage(err);
        if (msg) setError(msg);
      }
    };
    checkRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      const profile = await getUserProfile(auth.currentUser!.uid);
      redirectByRole(profile?.role);
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      if (msg) setError(msg);
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
      // 'redirect' mode: page will reload, useEffect picks up the result
    } catch (err) {
      const msg = getAuthErrorMessage(err);
      if (msg) setError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="mb-1 font-display text-3xl font-extrabold text-[#0E1E47]">
        Welcome back
      </h1>
      <p className="mb-7 text-sm text-gray-500">
        Enter your credentials to access your account
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-error-light p-3 text-sm text-error-dark">
          {error}
        </div>
      )}

      {/* Social Buttons */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <Image src="/icons/google.svg" alt="" width={18} height={18} />
          Google
        </button>
        <button
          disabled={loading}
          onClick={() => addToast('info', 'Facebook login coming soon!')}
          className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Facebook
        </button>
      </div>

      {/* Divider */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#0E1E47]">
            Email
          </label>
          <div className="relative">
            <Mail
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-[#5841EA] focus:ring-1 focus:ring-[#5841EA]"
              placeholder="name @example.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-[#0E1E47]">
            Password
          </label>
          <div className="relative">
            <Lock
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition-colors focus:border-[#5841EA] focus:ring-1 focus:ring-[#5841EA]"
              placeholder="••••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-[#8B5CF6] px-4 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#7C3FF0] disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-semibold text-[#8B5CF6] hover:underline"
        >
          Sign Up
        </Link>
      </p>
    </>
  );
};

export default LoginPage;
