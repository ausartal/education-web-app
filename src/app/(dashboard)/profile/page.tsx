'use client';

import { FC, useEffect, useState } from 'react';
import {
  User, Mail, School, GraduationCap, MapPin,
  AlertCircle, CheckCircle2, Loader2, Camera, Save,
  type LucideIcon,
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from '@/lib/client-firestore';
import { db } from '@/lib/firebase';
import PhotoAdjustModal from '@/components/exam/PhotoAdjustModal';

const fieldClass =
  'w-full rounded-lg border border-[#DCE5F2] bg-white py-2.5 pl-10 pr-3 text-sm text-[#172033] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#6320EE] focus:ring-2 focus:ring-[#6320EE]/10';

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#5B6475]';

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; ring: string; icon: LucideIcon }> = {
  student: { label: 'Siswa', color: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200', icon: GraduationCap },
  teacher: { label: 'Guru', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200', icon: User },
  admin:   { label: 'Admin', color: 'text-violet-700', bg: 'bg-violet-50', ring: 'ring-violet-200', icon: User },
};

const ProfilePage: FC = () => {
  const { profile, user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showSavedToast, setShowSavedToast] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [city, setCity] = useState('');

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoSuccess, setPhotoSuccess] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? '');
    setSchool(profile.profile?.school ?? '');
    setGrade(profile.profile?.grade ?? '');
    setCity(profile.profile?.city ?? '');
    setPhotoPreview(profile.photoURL ?? null);
  }, [profile]);

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={20} className="animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  const roleCfg = ROLE_CONFIG[profile.role] ?? ROLE_CONFIG.student;
  const RoleIcon = roleCfg.icon;

  const handleSave = async () => {
    setSaveError('');
    if (!displayName.trim()) {
      setSaveError('Nama lengkap wajib diisi.');
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName: displayName.trim(),
        'profile.school': school.trim(),
        'profile.grade': grade.trim(),
        'profile.city': city.trim(),
      });
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 1800);
    } catch {
      setSaveError('Gagal menyimpan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  // Photo: select file → show adjust modal
  const handleFileSelect = (file: File) => {
    setPhotoError('');
    setPhotoSuccess('');
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError('Ukuran foto maksimal 2MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPendingPhoto(url);
  };

  // Photo: confirmed from modal → upload
  const handlePhotoConfirm = async (blob: Blob) => {
    setPendingPhoto(null);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setPhotoError('Sesi habis. Silakan masuk kembali.');
      return;
    }

    setPhotoUploading(true);
    try {
      const localUrl = URL.createObjectURL(blob);
      setPhotoPreview(localUrl);

      const formData = new FormData();
      formData.append('photo', blob, 'photo.jpg');
      const token = await currentUser.getIdToken();
      const uploadRes = await fetch('/api/user/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || 'Gagal mengunggah foto');
      }

      const { photoURL } = await uploadRes.json();
      setPhotoPreview(photoURL);

      // Save photoURL to user profile
      await updateDoc(doc(db, 'users', profile.uid), { photoURL });

      setPhotoSuccess('Foto berhasil diunggah.');
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal mengunggah foto. Coba lagi.');
      setPhotoPreview(profile.photoURL ?? null);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePhotoCancel = () => {
    if (pendingPhoto) URL.revokeObjectURL(pendingPhoto);
    setPendingPhoto(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-xl font-extrabold text-[#0E1E47]">Profil Saya</h1>
      <p className="mt-1 text-sm text-[#5B6475]">
        Kelola informasi profil dan foto diri kamu.
      </p>

      {/* Role badge */}
      <div className={`mt-6 flex items-center gap-3 rounded-lg p-4 ring-1 ${roleCfg.bg} ${roleCfg.ring}`}>
        <RoleIcon size={18} className={roleCfg.color} />
        <div>
          <p className={`text-sm font-semibold ${roleCfg.color}`}>{roleCfg.label}</p>
          <p className="text-xs text-[#5B6475]">
            {profile.role === 'student' && 'Kamu terdaftar sebagai siswa.'}
            {profile.role === 'teacher' && 'Kamu terdaftar sebagai guru.'}
            {profile.role === 'admin' && 'Kamu memiliki akses administrator.'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-6">
        {/* Section: Identitas */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
            Identitas Dasar
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nama Lengkap</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Nama lengkap" className={fieldClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="email" value={profile.email ?? ''} disabled
                  className={`${fieldClass} disabled:opacity-50 disabled:bg-gray-50`} />
              </div>
            </div>
          </div>
        </section>

        {/* Section: Akademik */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
            Informasi Akademik
          </h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Sekolah / Institusi</label>
              <div className="relative">
                <School size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                <input type="text" value={school} onChange={(e) => setSchool(e.target.value)}
                  placeholder="Nama sekolah" className={fieldClass} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Kelas</label>
                <div className="relative">
                  <GraduationCap size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)}
                    placeholder="Contoh: 12" className={fieldClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Kota</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                    placeholder="Kota domisili" className={fieldClass} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Foto */}
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[#9CA3AF]">
            Foto Profil
          </h2>
          <div className="flex items-start gap-4">
            <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-[#F0EDFF] ring-1 ring-[#DCE5F2] transition hover:ring-[#6320EE]/40">
              {photoPreview ? (
                <img src={photoPreview} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <Camera size={24} className="text-[#9CA3AF]" />
              )}
              {photoUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 size={18} className="animate-spin text-white" />
                </div>
              )}
              {!photoUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <Camera size={18} className="text-white" />
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = '';
                }}
              />
            </label>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#0E1E47]">Upload foto</p>
              <p className="text-xs text-[#9CA3AF]">Klik foto untuk memilih. Format JPG/PNG, maks 2MB.</p>

              {photoError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle size={12} /> {photoError}
                </div>
              )}
              {photoSuccess && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                  <CheckCircle2 size={12} /> {photoSuccess}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Save button + messages */}
        <div className="border-t border-[#DCE5F2] pt-6">
          {saveError && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
              <AlertCircle size={14} /> {saveError}
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9CA3AF]">
              Pastikan data sudah benar sebelum menyimpan.
            </p>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-[#6320EE] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#5218C7] disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>

      {/* Success toast */}
      {showSavedToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={24} className="text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[#0E1E47]">Profil Berhasil Disimpan</p>
              <p className="mt-1 text-xs text-[#5B6475]">Perubahan sudah tersimpan.</p>
            </div>
          </div>
        </div>
      )}

      {/* Photo adjust modal */}
      {pendingPhoto && (
        <PhotoAdjustModal
          imageUrl={pendingPhoto}
          onConfirm={handlePhotoConfirm}
          onCancel={handlePhotoCancel}
          uploading={photoUploading}
        />
      )}
    </div>
  );
};

export default ProfilePage;
