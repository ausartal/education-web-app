'use client';

import { FC, FormEvent, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Mail, Lock, User, Phone, MapPin, Building2, Calendar,
  AlertCircle, Loader2, ChevronRight, ChevronLeft,
} from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { validateRegistration, sanitizeInput } from '@/lib/exam-validation';
import { getAuthErrorMessage } from '@/lib/auth-errors';
import { getExamUserProfile } from '@/services/exam-auth';
import type { ExamRegistrationData, ExamUserGender, ExamUserIdentityType } from '@/types/exam-user';

const fieldClass =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-3 pl-10 pr-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const fieldClassNoIcon =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-3 px-3.5 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const selectClass =
  'w-full appearance-none rounded-lg border border-[#DCE5F2] bg-white py-3 pl-3.5 pr-8 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const STEPS = [
  { label: 'Akun', desc: 'Email dan kata sandi' },
  { label: 'Identitas', desc: 'Data pribadi' },
  { label: 'Institusi', desc: 'Asal dan nomor induk' },
  { label: 'Selesai', desc: 'Konfirmasi' },
];

const ExamRegisterPage: FC = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form data
  const [form, setForm] = useState<ExamRegistrationData>({
    displayName: '',
    email: '',
    password: '',
    phoneNumber: '',
    gender: '' as ExamUserGender,
    birthPlace: '',
    birthDate: '',
    identityType: '' as ExamUserIdentityType,
    identityNumber: '',
    institution: '',
    address: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const set = (key: keyof ExamRegistrationData, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setError('');
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 0) {
      if (!form.displayName || form.displayName.trim().length < 2) errs.displayName = 'Nama minimal 2 karakter.';
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Email tidak valid.';
      if (!form.password || form.password.length < 8) errs.password = 'Minimal 8 karakter.';
      if (form.password !== confirmPassword) errs.confirmPassword = 'Kata sandi tidak cocok.';
    }
    if (s === 1) {
      if (!form.phoneNumber || !/^[+]?[\d\s-]{8,20}$/.test(form.phoneNumber)) errs.phoneNumber = 'Nomor HP tidak valid.';
      if (!form.gender) errs.gender = 'Pilih jenis kelamin.';
      if (!form.birthPlace || form.birthPlace.trim().length < 2) errs.birthPlace = 'Isi tempat lahir.';
      if (!form.birthDate) errs.birthDate = 'Isi tanggal lahir.';
    }
    if (s === 2) {
      if (!form.identityType) errs.identityType = 'Pilih tipe identitas.';
      if (!form.identityNumber || form.identityNumber.trim().length < 4) errs.identityNumber = 'Minimal 4 karakter.';
      if (!form.institution || form.institution.trim().length < 2) errs.institution = 'Isi institusi.';
      if (!form.address || form.address.trim().length < 5) errs.address = 'Minimal 5 karakter.';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Final validation with server-side quality checks
    const validationErrors = validateRegistration(form);
    if (validationErrors.length > 0) {
      setError(validationErrors.map((v) => v.message).join(' '));
      return;
    }

    setLoading(true);
    try {
      let user;

      // 1. Create or sign in Firebase Auth user
      try {
        const result = await createUserWithEmailAndPassword(auth, form.email, form.password);
        user = result.user;
        await updateProfile(user, { displayName: sanitizeInput(form.displayName) });
      } catch (createErr: unknown) {
        const code = (createErr as { code?: string }).code ?? '';
        if (code === 'auth/email-already-in-use') {
          // Email already exists in Firebase Auth (e.g. school account).
          // Try signing in — password must match the existing Auth account.
          try {
            const { user: existingUser } = await signInWithEmailAndPassword(auth, form.email, form.password);
            user = existingUser;
          } catch {
            // Wrong password — can't sign in
            setError('Email ini sudah terdaftar di AKURAT. Gunakan kata sandi yang sama, atau masuk terlebih dahulu.');
            setLoading(false);
            return;
          }

          // Check if exam profile already exists
          const existingProfile = await getExamUserProfile(user!.uid);
          if (existingProfile) {
            setError('Akun AKURAT Exam sudah terdaftar untuk email ini. Silakan masuk.');
            setLoading(false);
            return;
          }
          // Update display name if different
          if (user!.displayName !== sanitizeInput(form.displayName)) {
            await updateProfile(user!, { displayName: sanitizeInput(form.displayName) });
          }
        } else {
          throw createErr;
        }
      }

      // 2. Register exam profile via API
      const idToken = await user!.getIdToken();
      const res = await fetch('/api/exam/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal mendaftar');
      }

      router.push('/exam');
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message || 'Terjadi kesalahan. Coba lagi.');
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
            Daftar akun<br />AKURAT Exam.
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#5B6475]">
            Satu akun untuk semua kebutuhan ujian adaptif kimia kamu.
          </p>
        </div>

        {/* Step indicator — desktop */}
        <div className="space-y-4">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step ? 'bg-[#6320EE] text-white' :
                i === step ? 'bg-[#6320EE] text-white' :
                'bg-[#DCE5F2] text-[#9CA3AF]'
              }`}>
                {i < step ? '\u2713' : i + 1}
              </div>
              <div>
                <p className={`text-sm font-semibold ${i <= step ? 'text-[#0E1E47]' : 'text-[#9CA3AF]'}`}>{s.label}</p>
                <p className="text-xs text-[#9CA3AF]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-[#9CA3AF]">&copy; {new Date().getFullYear()} AKURAT</p>
      </div>

      {/* Right — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[440px]">
          {/* Mobile header */}
          <div className="mb-6 lg:hidden">
            <Link href="/exam" className="flex items-center gap-2">
              <Image src="/icons/Akurat_Logo.svg" alt="AKURAT" width={24} height={24} />
              <span className="font-display text-sm font-extrabold text-[#0E1E47]">AKURAT Exam</span>
            </Link>
          </div>

          {/* Mobile step indicator */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[#6320EE]' : 'bg-[#DCE5F2]'}`} />
            ))}
          </div>

          <h2 className="font-display text-xl font-extrabold text-[#0E1E47]">
            {STEPS[step].label}
          </h2>
          <p className="mt-1.5 text-sm text-[#5B6475]">
            {step === 0 && 'Sudah punya akun? '}
            {step === 0 && (
              <Link href="/exam/login" className="font-semibold text-[#6320EE] hover:underline">Masuk</Link>
            )}
            {step > 0 && step < 3 && STEPS[step].desc}
            {step === 3 && 'Periksa data kamu sebelum mendaftar.'}
          </p>

          {error && (
            <div className="mt-5 flex items-start gap-2.5 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6">
            {/* Step 0: Akun */}
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Nama Lengkap <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)}
                      placeholder="Tanpa gelar" className={fieldClass} />
                  </div>
                  {fieldErrors.displayName && <p className="mt-1 text-xs text-red-500">{fieldErrors.displayName}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Email Aktif <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
                      placeholder="nama@email.com" className={fieldClass} />
                  </div>
                  {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Kata Sandi <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input type="password" value={form.password} onChange={(e) => set('password', e.target.value)}
                      placeholder="Minimal 8 karakter" minLength={8} className={fieldClass} />
                  </div>
                  {fieldErrors.password && <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Konfirmasi Kata Sandi <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                      placeholder="Ulangi kata sandi" className={fieldClass} />
                  </div>
                  {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
            )}

            {/* Step 1: Identitas */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Nomor HP / WhatsApp <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)}
                      placeholder="08xxxxxxxxxx" className={fieldClass} />
                  </div>
                  {fieldErrors.phoneNumber && <p className="mt-1 text-xs text-red-500">{fieldErrors.phoneNumber}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Jenis Kelamin <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-3">
                    {(['L', 'P'] as const).map((g) => (
                      <button key={g} type="button" onClick={() => set('gender', g)}
                        className={`flex-1 rounded-lg border py-3 text-sm font-semibold transition ${
                          form.gender === g
                            ? 'border-[#6320EE] bg-[#6320EE]/5 text-[#6320EE]'
                            : 'border-[#DCE5F2] text-[#5B6475] hover:border-[#6320EE]/40'
                        }`}>
                        {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.gender && <p className="mt-1 text-xs text-red-500">{fieldErrors.gender}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                      Tempat Lahir <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                      <input type="text" value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)}
                        placeholder="Kota" className={fieldClass} />
                    </div>
                    {fieldErrors.birthPlace && <p className="mt-1 text-xs text-red-500">{fieldErrors.birthPlace}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                      Tanggal Lahir <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                      <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)}
                        className={fieldClass} />
                    </div>
                    {fieldErrors.birthDate && <p className="mt-1 text-xs text-red-500">{fieldErrors.birthDate}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Institusi */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                      Tipe Identitas <span className="text-red-400">*</span>
                    </label>
                    <select value={form.identityType} onChange={(e) => set('identityType', e.target.value)}
                      className={selectClass}>
                      <option value="">Pilih tipe</option>
                      <option value="NIM">NIM</option>
                      <option value="NIK">NIK</option>
                      <option value="NISN">NISN</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    {fieldErrors.identityType && <p className="mt-1 text-xs text-red-500">{fieldErrors.identityType}</p>}
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                      Nomor Identitas <span className="text-red-400">*</span>
                    </label>
                    <input type="text" value={form.identityNumber} onChange={(e) => set('identityNumber', e.target.value)}
                      placeholder="Nomor induk" className={fieldClassNoIcon} />
                    {fieldErrors.identityNumber && <p className="mt-1 text-xs text-red-500">{fieldErrors.identityNumber}</p>}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Institusi / Sekolah <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                    <input type="text" value={form.institution} onChange={(e) => set('institution', e.target.value)}
                      placeholder="Nama sekolah atau universitas" className={fieldClass} />
                  </div>
                  {fieldErrors.institution && <p className="mt-1 text-xs text-red-500">{fieldErrors.institution}</p>}
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]">
                    Alamat Lengkap <span className="text-red-400">*</span>
                  </label>
                  <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
                    placeholder="Jl. ..., Kota, Provinsi" rows={3}
                    className="w-full resize-none rounded-lg border border-[#DCE5F2] bg-white px-3.5 py-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10" />
                  {fieldErrors.address && <p className="mt-1 text-xs text-red-500">{fieldErrors.address}</p>}
                </div>
              </div>
            )}

            {/* Step 3: Konfirmasi */}
            {step === 3 && (
              <div className="space-y-3">
                <div className="rounded-lg bg-[#F8F7FF] p-4 ring-1 ring-[#E5E7EB]">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Akun</h4>
                  <p className="mt-1 text-sm font-semibold text-[#0E1E47]">{form.displayName}</p>
                  <p className="text-sm text-[#5B6475]">{form.email}</p>
                </div>
                <div className="rounded-lg bg-[#F8F7FF] p-4 ring-1 ring-[#E5E7EB]">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Identitas</h4>
                  <p className="mt-1 text-sm text-[#5B6475]">
                    {form.gender === 'L' ? 'Laki-laki' : 'Perempuan'} &middot; {form.birthPlace}, {form.birthDate}
                  </p>
                  <p className="text-sm text-[#5B6475]">{form.phoneNumber}</p>
                </div>
                <div className="rounded-lg bg-[#F8F7FF] p-4 ring-1 ring-[#E5E7EB]">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">Institusi</h4>
                  <p className="mt-1 text-sm font-semibold text-[#0E1E47]">{form.institution}</p>
                  <p className="text-sm text-[#5B6475]">{form.identityType}: {form.identityNumber}</p>
                  <p className="text-sm text-[#5B6475]">{form.address}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={handleBack}
                  className="flex items-center gap-1.5 rounded-lg border border-[#DCE5F2] px-4 py-3 text-sm font-semibold text-[#5B6475] transition-colors hover:bg-gray-50">
                  <ChevronLeft size={15} /> Kembali
                </button>
              )}

              {step < 3 ? (
                <button type="button" onClick={handleNext}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#6320EE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#5218C7]">
                  Lanjut <ChevronRight size={15} />
                </button>
              ) : (
                <button type="submit" disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#6320EE] py-3 text-sm font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                </button>
              )}
            </div>
          </form>

          <p className="mt-8 text-center text-xs text-[#9CA3AF]">
            Dengan mendaftar, kamu menyetujui{' '}
            <Link href="/terms" className="text-[#6320EE] hover:underline">Syarat Layanan</Link>
            {' '}dan{' '}
            <Link href="/privacy" className="text-[#6320EE] hover:underline">Kebijakan Privasi</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExamRegisterPage;