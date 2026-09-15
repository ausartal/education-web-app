'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Phone, MapPin, Building2, Calendar,
  AlertCircle, CheckCircle2, Loader2, Camera, Save,
} from 'lucide-react';
import { useExamAuth } from '@/context/ExamAuthContext';
import type { ExamUser, ExamUserGender, ExamUserIdentityType } from '@/types/exam-user';

const fieldClass =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-2.5 pl-10 pr-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const fieldClassNoIcon =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-2.5 px-3.5 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const selectClass =
  'w-full appearance-none rounded-lg border border-[#DCE5F2] bg-white py-2.5 pl-3.5 pr-8 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]';

interface ProfileForm {
  displayName: string;
  phoneNumber: string;
  gender: ExamUserGender | '';
  birthPlace: string;
  birthDate: string;
  identityType: ExamUserIdentityType | '';
  identityNumber: string;
  institution: string;
  address: string;
}

const ExamProfilePage: FC = () => {
  const { examUser, refreshProfile } = useExamAuth();
  const [form, setForm] = useState<ProfileForm>({
    displayName: '',
    phoneNumber: '',
    gender: '',
    birthPlace: '',
    birthDate: '',
    identityType: '',
    identityNumber: '',
    institution: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (examUser) {
      setForm({
        displayName: examUser.displayName ?? '',
        phoneNumber: examUser.phoneNumber ?? '',
        gender: examUser.gender ?? '',
        birthPlace: examUser.birthPlace ?? '',
        birthDate: examUser.birthDate ?? '',
        identityType: examUser.identityType ?? '',
        identityNumber: examUser.identityNumber ?? '',
        institution: examUser.institution ?? '',
        address: examUser.address ?? '',
      });
      setLoading(false);
    }
  }, [examUser]);

  const set = (key: keyof ProfileForm, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const user = (await import('@/lib/firebase')).auth.currentUser;
      if (!user) { setError('Sesi habis. Silakan masuk kembali.'); return; }
      const token = await user.getIdToken();
      const res = await fetch('/api/exam/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menyimpan');
      }
      await refreshProfile();
      setSuccess('Profil berhasil disimpan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  const status = examUser?.verificationStatus ?? 'unverified';

  const statusConfig = {
    unverified: { label: 'Belum Diverifikasi', color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200', icon: AlertCircle },
    pending: { label: 'Menunggu Verifikasi', color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200', icon: Loader2 },
    verified: { label: 'Terverifikasi', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: CheckCircle2 },
    rejected: { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200', icon: AlertCircle },
  };

  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Profil Ujian</h1>
      <p className="mt-1 text-sm text-[#5B6475]">
        Lengkapi identitas untuk mengikuti ujian dan menerbitkan sertifikat.
      </p>

      {/* Status verifikasi */}
      <div className={`mt-6 flex items-center gap-3 rounded-lg p-4 ring-1 ${cfg.bg} ${cfg.ring}`}>
        <StatusIcon size={18} className={cfg.color} />
        <div>
          <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
          {status === 'unverified' && (
            <p className="text-xs text-amber-600">Lengkapi semua data lalu simpan. Admin akan memverifikasi identitas kamu.</p>
          )}
          {status === 'pending' && (
            <p className="text-xs text-blue-600">Identitas sedang ditinjau oleh admin.</p>
          )}
          {status === 'verified' && (
            <p className="text-xs text-emerald-600">Identitas terverifikasi. Kamu bisa mengikuti semua ujian.</p>
          )}
          {status === 'rejected' && (
            <p className="text-xs text-red-600">
              {examUser?.verificationNotes || 'Identitas ditolak. Periksa data dan ajukan ulang.'}
            </p>
          )}
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {success && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-100">
          <CheckCircle2 size={14} /> {success}
        </div>
      )}

      {/* Form */}
      <div className="mt-6 space-y-6">
        {/* Section: Identitas Dasar */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
            Identitas Dasar
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nama Lengkap</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="text" value={form.displayName} onChange={(e) => set('displayName', e.target.value)}
                  placeholder="Tanpa gelar" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email Aktif</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="email" value={examUser?.email ?? ''} disabled
                  className={`${fieldClass} disabled:opacity-50 disabled:bg-gray-50`} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Nomor HP / WhatsApp</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="tel" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value)}
                  placeholder="08xxxxxxxxxx" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Jenis Kelamin</label>
              <div className="flex gap-3">
                {(['L', 'P'] as const).map((g) => (
                  <button key={g} type="button" onClick={() => set('gender', g)}
                    className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${
                      form.gender === g
                        ? 'border-[#6320EE] bg-[#6320EE]/5 text-[#6320EE]'
                        : 'border-[#DCE5F2] text-[#5B6475] hover:border-[#6320EE]/40'
                    }`}>
                    {g === 'L' ? 'Laki-laki' : 'Perempuan'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section: Identitas Resmi */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
            Identitas Resmi
          </h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Tempat Lahir</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="text" value={form.birthPlace} onChange={(e) => set('birthPlace', e.target.value)}
                    placeholder="Kota" className={fieldClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tanggal Lahir</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)}
                    className={fieldClass} />
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Tipe Identitas</label>
                <select value={form.identityType} onChange={(e) => set('identityType', e.target.value)}
                  className={selectClass}>
                  <option value="">Pilih tipe</option>
                  <option value="NIM">NIM</option>
                  <option value="NIK">NIK</option>
                  <option value="NISN">NISN</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Nomor Identitas</label>
                <input type="text" value={form.identityNumber} onChange={(e) => set('identityNumber', e.target.value)}
                  placeholder="Nomor induk" className={fieldClassNoIcon} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Institusi / Sekolah</label>
              <div className="relative">
                <Building2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="text" value={form.institution} onChange={(e) => set('institution', e.target.value)}
                  placeholder="Nama sekolah atau universitas" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Alamat Lengkap</label>
              <textarea value={form.address} onChange={(e) => set('address', e.target.value)}
                placeholder="Jl. ..., Kota, Provinsi" rows={3}
                className="w-full resize-none rounded-lg border border-[#DCE5F2] bg-white px-3.5 py-2.5 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10" />
            </div>
          </div>
        </section>

        {/* Section: Foto */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
            Foto Diri (untuk sertifikat)
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[#F0EDFF] ring-1 ring-[#DCE5F2]">
              {examUser?.photoURL ? (
                <img src={examUser.photoURL} alt="Foto" className="h-full w-full rounded-lg object-cover" />
              ) : (
                <Camera size={24} className="text-[#9CA3AF]" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0E1E47]">Upload foto</p>
              <p className="text-xs text-[#9CA3AF]">Format JPG/PNG, minimal 300x400px</p>
            </div>
          </div>
        </section>

        {/* Save button */}
        <div className="flex items-center justify-between border-t border-[#DCE5F2] pt-6">
          <p className="text-xs text-[#9CA3AF]">
            Semua field wajib diisi untuk verifikasi.
          </p>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#6320EE] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamProfilePage;