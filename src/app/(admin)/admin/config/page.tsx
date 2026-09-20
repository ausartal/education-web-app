'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { useAuthSWR } from '@/hooks/useAuthSWR';
import { motion } from 'framer-motion';
import { Settings, Save, Loader2, Globe, Shield, Brain, Bell, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { useAdminConfirm } from '@/components/admin/ConfirmProvider';

interface PlatformConfig {
  platformName: string;
  platformTagline: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  maxExamAttempts: number;
  sessionTimeoutMinutes: number;
  emailNotifications: boolean;
  certificateAutoGenerate: boolean;
}

const defaultConfig: PlatformConfig = {
  platformName: 'AKURAT',
  platformTagline: 'Platform Pembelajaran & Asesmen',
  timezone: 'Asia/Jakarta',
  language: 'id',
  maintenanceMode: false,
  registrationOpen: true,
  maxExamAttempts: 3,
  sessionTimeoutMinutes: 60,
  emailNotifications: true,
  certificateAutoGenerate: true,
};

/* ── Toggle Switch ─────────────────────────────────────────────────────── */
const Toggle: FC<{ enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({
  enabled,
  onChange,
  disabled,
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!enabled)}
    className={`relative h-6 w-11 rounded-full transition-colors ${
      enabled ? 'bg-slate-700' : 'bg-slate-300'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    role="switch"
    aria-checked={enabled}
  >
    <span
      className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
        enabled ? 'left-[22px]' : 'left-[3px]'
      }`}
    />
  </button>
);

/* ── Section Card ──────────────────────────────────────────────────────── */
const SectionCard: FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}> = ({ icon: Icon, title, description, children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-lg border border-slate-200 bg-white shadow-sm"
  >
    <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white">
        <Icon size={18} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
    <div className="space-y-4 p-6">{children}</div>
  </motion.div>
);

/* ── Form Field ────────────────────────────────────────────────────────── */
const FieldLabel: FC<{ label: string; htmlFor?: string }> = ({ label, htmlFor }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-600">
    {label}
  </label>
);

/* ── Main Page ─────────────────────────────────────────────────────────── */
const AdminConfig: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const confirmAction = useAdminConfirm();
  const { data, error, isLoading, mutate } = useAuthSWR<{ config: PlatformConfig }>(
    '/api/admin/config'
  );

  const [form, setForm] = useState<PlatformConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [lastSaved, setLastSaved] = useState<PlatformConfig>(defaultConfig);

  const currentConfig = data?.config;
  useEffect(() => {
    if (!currentConfig || initialized) return;
    setForm(currentConfig);
    setLastSaved(currentConfig);
    setInitialized(true);
  }, [currentConfig, initialized]);

  const dirty = initialized && JSON.stringify(form) !== JSON.stringify(lastSaved);

  useEffect(() => {
    const protectChanges = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', protectChanges);
    return () => window.removeEventListener('beforeunload', protectChanges);
  }, [dirty]);

  const update = useCallback(
    <K extends keyof PlatformConfig>(key: K, value: PlatformConfig[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!user) return;
    if (form.maintenanceMode && !lastSaved.maintenanceMode) {
      const accepted = await confirmAction({ title: 'Aktifkan mode pemeliharaan?', description: 'Akses pengguna dapat terganggu setelah pengaturan diterapkan. Administrator tetap dapat mengelola platform.', confirmLabel: 'Aktifkan', tone: 'warning' });
      if (!accepted) return;
    }
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }
      const result = await res.json();
      await mutate(result, false);
      setForm(result.config);
      setLastSaved(result.config);
      addToast('success', 'Pengaturan berhasil disimpan');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  }, [user, form, lastSaved.maintenanceMode, mutate, addToast, confirmAction]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-slate-400" size={28} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
        Gagal memuat konfigurasi. Silakan coba lagi.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">Pengaturan Platform</h1>
            <p className="text-sm text-slate-500">Konfigurasi umum aplikasi AKURAT</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-700 to-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? 'Menyimpan…' : 'Simpan Pengaturan'}
        </button>
      </div>

      {/* ── General ─────────────────────────────────────────────────── */}
      <SectionCard icon={Globe} title="Umum" description="Pengaturan dasar platform" delay={0.05}>
        <div>
          <FieldLabel label="Nama Platform" htmlFor="platformName" />
          <input
            id="platformName"
            type="text"
            value={form.platformName}
            onChange={(e) => update('platformName', e.target.value)}
            placeholder="Nama platform"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10"
          />
        </div>
        <div>
          <FieldLabel label="Tagline" htmlFor="platformTagline" />
          <input
            id="platformTagline"
            type="text"
            value={form.platformTagline}
            onChange={(e) => update('platformTagline', e.target.value)}
            placeholder="Tagline platform"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel label="Zona Waktu" htmlFor="timezone" />
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => update('timezone', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10"
            >
              <option value="Asia/Jakarta">WIB (Jakarta)</option>
              <option value="Asia/Makassar">WITA (Makassar)</option>
              <option value="Asia/Jayapura">WIT (Jayapura)</option>
            </select>
          </div>
          <div>
            <FieldLabel label="Bahasa Default" htmlFor="language" />
            <select
              id="language"
              value={form.language}
              onChange={(e) => update('language', e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </SectionCard>

      {/* ── Security ────────────────────────────────────────────────── */}
      <SectionCard icon={Shield} title="Keamanan" description="Pengaturan keamanan dan akses" delay={0.1}>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Mode Pemeliharaan</p>
            <p className="text-xs text-slate-500">Nonaktifkan akses sementara untuk pemeliharaan</p>
          </div>
          <Toggle enabled={form.maintenanceMode} onChange={(v) => update('maintenanceMode', v)} />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Pendaftaran Terbuka</p>
            <p className="text-xs text-slate-500">Izinkan pengguna baru untuk mendaftar</p>
          </div>
          <Toggle enabled={form.registrationOpen} onChange={(v) => update('registrationOpen', v)} />
        </div>
        <div>
          <FieldLabel label="Batas Waktu Sesi (menit)" htmlFor="sessionTimeout" />
          <input
            id="sessionTimeout"
            type="number"
            value={form.sessionTimeoutMinutes}
            onChange={(e) => update('sessionTimeoutMinutes', Math.max(5, Number(e.target.value)))}
            min={5}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10"
          />
        </div>
      </SectionCard>

      {/* ── Exam ────────────────────────────────────────────────────── */}
      <SectionCard icon={Brain} title="Ujian" description="Pengaturan ujian dan sertifikat" delay={0.15}>
        <div>
          <FieldLabel label="Maksimum Percobaan Ujian" htmlFor="maxExamAttempts" />
          <input
            id="maxExamAttempts"
            type="number"
            value={form.maxExamAttempts}
            onChange={(e) => update('maxExamAttempts', Math.max(1, Number(e.target.value)))}
            min={1}
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-slate-400 focus:ring-2 focus:ring-slate-500/10"
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Sertifikat Otomatis</p>
            <p className="text-xs text-slate-500">Buat sertifikat otomatis setelah ujian selesai</p>
          </div>
          <Toggle
            enabled={form.certificateAutoGenerate}
            onChange={(v) => update('certificateAutoGenerate', v)}
          />
        </div>
      </SectionCard>

      {/* ── Notifications ───────────────────────────────────────────── */}
      <SectionCard icon={Bell} title="Notifikasi" description="Pengaturan notifikasi platform" delay={0.2}>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Notifikasi Email</p>
            <p className="text-xs text-slate-500">Kirim notifikasi melalui email untuk aktivitas penting</p>
          </div>
          <Toggle enabled={form.emailNotifications} onChange={(v) => update('emailNotifications', v)} />
        </div>
      </SectionCard>
      {dirty && (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-indigo-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">Ada perubahan yang belum disimpan</p>
            <p className="text-xs text-slate-500">Periksa kembali dampak pengaturan sebelum menerapkannya ke seluruh platform.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setForm(lastSaved)} className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batalkan perubahan</button>
            <button type="button" onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Simpan</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
