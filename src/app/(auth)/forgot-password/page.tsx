'use client';

import { FC, FormEvent, useState } from 'react';
import Link from 'next/link';
import { resetPassword } from '@/services/auth';

const ForgotPasswordPage: FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengirim email reset. Coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl bg-white p-8 shadow-md">
        <div className="mb-4 text-center text-4xl">📧</div>
        <h1 className="mb-2 text-center font-display text-2xl font-bold text-gray-900">
          Email Terkirim
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Cek inbox <strong>{email}</strong> untuk link reset password.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-md bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Kembali ke Login
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-8 shadow-md">
      <h1 className="mb-2 text-center font-display text-2xl font-bold text-gray-900">
        Lupa Password
      </h1>
      <p className="mb-6 text-center text-sm text-gray-500">
        Masukkan email untuk menerima link reset password
      </p>

      {error && (
        <div className="mb-4 rounded-md bg-error-light p-3 text-sm text-error-dark">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="nama@email.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Mengirim...' : 'Kirim Link Reset'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Ingat password?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
