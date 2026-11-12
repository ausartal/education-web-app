'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { useLivePoll } from '@/hooks/useLivePoll';
import {
  Users, Loader2, CheckCircle2, XCircle,
  Search, Eye, X, Camera, Phone, MapPin, Building2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminPageHeader, AdminLoadBanner, AdminEmptyState } from '@/components/admin/AdminUI';
import { useToast } from '@/hooks/useToast';
import { NETWORK_ERROR_MESSAGE, readHttpError } from '@/lib/http-error';

interface ExamUser {
  id: string;
  displayName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  identityType: string;
  identityNumber: string;
  institution: string;
  birthPlace: string;
  birthDate: string;
  address: string;
  photoURL: string | null;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationNotes: string;
  tokenBalance: number;
  isActive: boolean;
  createdAt: { _seconds: number } | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  unverified: { label: 'Belum Verifikasi', color: 'text-amber-700', bg: 'bg-amber-50' },
  pending: { label: 'Menunggu', color: 'text-blue-700', bg: 'bg-blue-50' },
  verified: { label: 'Terverifikasi', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  rejected: { label: 'Ditolak', color: 'text-red-700', bg: 'bg-red-50' },
};

function formatDate(ts: unknown): string {
  if (!ts) return '-';
  const o = ts as Record<string, unknown>;
  const secs = (o._seconds ?? o.seconds) as number | undefined;
  if (typeof secs === 'number') return new Date(secs * 1000).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const d = new Date(ts as string);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const AdminExamUsersPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loadError, setLoadError] = useState('');
  const [users, setUsers] = useState<ExamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailUser, setDetailUser] = useState<ExamUser | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/admin/exam-users?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users ?? []);
        setLoadError('');
      } else {
        setLoadError(await readHttpError(res));
      }
    } catch { setLoadError(NETWORK_ERROR_MESSAGE); }
    setLoading(false);
  }, [user, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useLivePoll(fetchUsers);

  const handleAction = async (uid: string, action: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(uid);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/admin/exam-users/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(action),
      });
      if (res.ok) {
        await fetchUsers();
        if (detailUser?.id === uid) setDetailUser(null);
        addToast('success', 'Data peserta diperbarui');
      } else {
        addToast('error', await readHttpError(res));
      }
    } catch { addToast('error', NETWORK_ERROR_MESSAGE); }
    setActionLoading(null);
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.institution.toLowerCase().includes(q) ||
      u.identityNumber.includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <AdminPageHeader
        icon={<Users size={22} />}
        eyebrow="Data civitas"
        title="Peserta Ujian"
        description="Kelola akun AKURAT Exam dan verifikasi identitas"
        actions={
          <>
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
              {users.length} peserta
            </span>
          </>
        }
      />

      {loadError && <AdminLoadBanner message={loadError} onRetry={fetchUsers} />}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, institusi..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
          />
        </div>
        <div className="flex gap-1.5">
          {['', 'unverified', 'pending', 'verified', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === s ? 'bg-violet-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
              {s === '' ? 'Semua' : STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <AdminEmptyState
          icon={<Users size={24} />}
          title={search || filter ? 'Tidak ada peserta yang sesuai' : 'Belum ada peserta ujian'}
          description={search || filter ? 'Coba ubah filter atau kata kunci pencarian.' : 'Peserta muncul di sini setelah mendaftar di portal AKURAT Exam.'}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-100">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Peserta</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Institusi</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Identitas</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Verifikasi</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400 text-center">Token</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Daftar</th>
                <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((u) => {
                const status = STATUS_CONFIG[u.verificationStatus] ?? STATUS_CONFIG.unverified;
                const isLoading = actionLoading === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-200">
                            <Camera size={12} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-800">{u.displayName}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{u.institution || '-'}</td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-600">{u.identityType}: {u.identityNumber}</p>
                      <p className="text-xs text-slate-400">{u.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.color} ${status.bg}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-sm font-bold text-slate-700">
                      {u.tokenBalance}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setDetailUser(u); setRejectNote(''); }}
                          title="Lihat detail"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Eye size={14} />
                        </button>
                        {u.verificationStatus !== 'verified' && (
                          <button
                            onClick={() => handleAction(u.id, { verificationStatus: 'verified' })}
                            disabled={isLoading}
                            title="Verifikasi"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          </button>
                        )}
                        {u.verificationStatus !== 'rejected' && (
                          <button
                            onClick={() => handleAction(u.id, { verificationStatus: 'rejected', verificationNotes: 'Ditolak oleh admin' })}
                            disabled={isLoading}
                            title="Tolak"
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 disabled:opacity-40"
                          >
                            <XCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDetailUser(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="font-display text-lg font-extrabold text-slate-800">Detail Peserta</h3>
              <button aria-label="Tutup" title="Tutup" onClick={() => setDetailUser(null)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex items-start gap-4">
                {detailUser.photoURL ? (
                  <img src={detailUser.photoURL} alt="" className="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 ring-1 ring-slate-200">
                    <Camera size={24} className="text-slate-400" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-base font-bold text-slate-800">{detailUser.displayName}</p>
                  <p className="text-sm text-slate-500">{detailUser.email}</p>
                  <div className="mt-2">
                    {(() => {
                      const s = STATUS_CONFIG[detailUser.verificationStatus] ?? STATUS_CONFIG.unverified;
                      return (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${s.color} ${s.bg}`}>
                          {s.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={13} className="shrink-0 text-slate-400" />
                  <span>{detailUser.phoneNumber || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users size={13} className="shrink-0 text-slate-400" />
                  <span>{detailUser.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={13} className="shrink-0 text-slate-400" />
                  <span>{detailUser.birthPlace || '-'}, {detailUser.birthDate || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 size={13} className="shrink-0 text-slate-400" />
                  <span>{detailUser.institution || '-'}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm border border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Identitas</p>
                <p className="mt-1 font-semibold text-slate-700">{detailUser.identityType}: {detailUser.identityNumber}</p>
              </div>

              {detailUser.address && (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Alamat</p>
                  <p className="mt-1 text-slate-600">{detailUser.address}</p>
                </div>
              )}

              {detailUser.verificationStatus !== 'rejected' && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-500">Catatan Penolakan (opsional)</label>
                  <input
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="Alasan penolakan..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                {detailUser.verificationStatus !== 'verified' && (
                  <button
                    onClick={() => handleAction(detailUser.id, { verificationStatus: 'verified' })}
                    disabled={actionLoading === detailUser.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                  >
                    <CheckCircle2 size={15} /> Verifikasi
                  </button>
                )}
                {detailUser.verificationStatus !== 'rejected' && (
                  <button
                    onClick={() => handleAction(detailUser.id, {
                      verificationStatus: 'rejected',
                      verificationNotes: rejectNote || 'Ditolak oleh admin',
                    })}
                    disabled={actionLoading === detailUser.id}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white transition hover:bg-red-600 disabled:opacity-40"
                  >
                    <XCircle size={15} /> Tolak
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExamUsersPage;
