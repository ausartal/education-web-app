'use client';

import { FC, FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { changePassword, deleteOwnAccount, hasPasswordProvider } from '@/services/auth';
import { getAuthErrorMessage } from '@/lib/auth-errors';

const inputClass =
  'w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none transition-all focus:bg-white focus:ring-2 focus:ring-primary/20';

const ChangePasswordCard: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!hasPasswordProvider(user)) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 6) return setError('Kata sandi baru minimal 6 karakter.');
    if (next !== confirm) return setError('Konfirmasi kata sandi tidak sama.');
    if (next === current) return setError('Kata sandi baru harus berbeda dari yang lama.');

    setSaving(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      addToast('success', 'Kata sandi diperbarui');
    } catch (err) {
      setError(getAuthErrorMessage(err) || (err instanceof Error ? err.message : 'Gagal mengganti kata sandi.'));
    }
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-7 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
          <KeyRound size={18} className="text-amber-500" />
        </div>
        <h2 className="text-sm font-bold text-gray-900">Ganti Kata Sandi</h2>
      </div>
      <div className="space-y-3">
        <input type="password" autoComplete="current-password" placeholder="Kata sandi saat ini" value={current} onChange={(e) => setCurrent(e.target.value)} className={inputClass} required />
        <input type="password" autoComplete="new-password" placeholder="Kata sandi baru" value={next} onChange={(e) => setNext(e.target.value)} className={inputClass} required />
        <input type="password" autoComplete="new-password" placeholder="Ulangi kata sandi baru" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} required />
        {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Menyimpan...' : 'Perbarui kata sandi'}
        </button>
      </div>
    </form>
  );
};

const DeleteAccountCard: FC = () => {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const role = profile?.role ?? 'student';
  if (role !== 'student') return null;

  const needsPassword = hasPasswordProvider(user);

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await deleteOwnAccount(needsPassword ? password : undefined);
      router.replace('/');
    } catch (err) {
      setError(getAuthErrorMessage(err) || (err instanceof Error ? err.message : 'Gagal menghapus akun.'));
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm ring-1 ring-rose-100">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
          <Trash2 size={18} className="text-rose-500" />
        </div>
        <h2 className="text-sm font-bold text-gray-900">Hapus Akun</h2>
      </div>
      <p className="text-xs leading-relaxed text-gray-500">
        Akunmu dan keanggotaan kelas akan dihapus permanen dan tidak bisa dipulihkan.
      </p>

      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-100">
          Hapus akun saya
        </button>
      ) : (
        <form onSubmit={remove} className="mt-4 space-y-3">
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder='Ketik "HAPUS" untuk melanjutkan' className={inputClass} />
          {needsPassword && (
            <input type="password" autoComplete="current-password" placeholder="Kata sandi saat ini" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
          )}
          {error && <p role="alert" className="text-xs text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOpen(false); setTyped(''); setPassword(''); setError(''); }} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700">
              Batal
            </button>
            <button type="submit" disabled={busy || typed !== 'HAPUS'} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? 'Menghapus...' : 'Hapus permanen'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export const AccountSecurity: FC = () => (
  <>
    <ChangePasswordCard />
    <DeleteAccountCard />
  </>
);
