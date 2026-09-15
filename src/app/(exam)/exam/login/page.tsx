'use client';

import { FC, FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { examSignIn } from '@/services/exam-auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';

const fieldClass =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-3 pl-10 pr-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const ExamLoginPage: FC = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await examSignIn(email, password, remember);
      router.push('/exam');
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message || 'Email atau kata sandi salah.');
    } finally {
      setLoading(false);
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

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              disabled={loading || !email || password.length < 8}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6320EE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40 disabled:hover:bg-[#6320EE]"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? 'Masuk...' : 'Masuk'}
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