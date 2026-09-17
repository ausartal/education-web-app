'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Award, Loader2, CheckCircle2, Send, Eye, X,
  Clock, FileText, Search,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Certificate {
  id: string;
  userId: string;
  sessionId: string;
  examTitle: string;
  score: number;
  predikat: string;
  issuedAt: { _seconds: number } | null;
  certificateNo: string;
  status: 'pending_approval' | 'approved' | 'sent';
  approvedAt: { _seconds: number } | null;
  sentAt: { _seconds: number } | null;
  userName: string;
  userEmail: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pending_approval: { label: 'Menunggu', color: 'text-amber-700', bg: 'bg-amber-50', icon: Clock },
  approved: { label: 'Disetujui', color: 'text-blue-700', bg: 'bg-blue-50', icon: CheckCircle2 },
  sent: { label: 'Terkirim', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: Send },
};

function formatDate(ts: { _seconds: number } | null): string {
  if (!ts) return '-';
  return new Date(ts._seconds * 1000).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const PREDIKAT_STYLES: Record<string, string> = {
  Istimewa: 'text-violet-700 bg-violet-50',
  Unggul: 'text-blue-700 bg-blue-50',
  Madya: 'text-amber-700 bg-amber-50',
  Semenjana: 'text-orange-700 bg-orange-50',
  Terbatas: 'text-rose-700 bg-rose-50',
};

const AdminCertificatesPage: FC = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detailCert, setDetailCert] = useState<Certificate | null>(null);

  const fetchCertificates = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/admin/certificates?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCertificates(data.certificates ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user, filter]);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);

  const handleAction = async (certId: string, action: string) => {
    if (!user) return;
    setActionLoading(certId);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/certificates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ certificateId: certId, action }),
      });
      if (res.ok) {
        await fetchCertificates();
        if (detailCert?.id === certId) setDetailCert(null);
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const filtered = certificates.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.userName.toLowerCase().includes(q) ||
      c.userEmail.toLowerCase().includes(q) ||
      c.examTitle.toLowerCase().includes(q) ||
      c.certificateNo.toLowerCase().includes(q)
    );
  });

  const pendingCount = certificates.filter(c => c.status === 'pending_approval').length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-stone-800">Sertifikat</h1>
          <p className="mt-0.5 text-xs text-stone-400">Kelola penerbitan dan pengiriman sertifikat peserta ujian</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
              {pendingCount} menunggu
            </span>
          )}
          <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-bold text-stone-600">
            {certificates.length} sertifikat
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, ujian..."
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-700 outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="appearance-none rounded-lg border border-stone-200 bg-white py-2 pl-3 pr-8 text-sm text-stone-700 outline-none focus:border-violet-300"
        >
          <option value="">Semua Status</option>
          <option value="pending_approval">Menunggu Persetujuan</option>
          <option value="approved">Disetujui</option>
          <option value="sent">Terkirim</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-stone-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg bg-white py-16 text-center ring-1 ring-stone-200">
          <Award size={28} className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-500">
            {search || filter ? 'Tidak ada sertifikat yang sesuai filter' : 'Belum ada sertifikat'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white ring-1 ring-stone-200">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Peserta</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Ujian</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500 text-center">Nilai</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">No. Sertifikat</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Tanggal</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert) => {
                const status = STATUS_CONFIG[cert.status] ?? STATUS_CONFIG.pending_approval;
                const StatusIcon = status.icon;
                const isLoading = actionLoading === cert.id;
                const predStyle = PREDIKAT_STYLES[cert.predikat] ?? 'text-gray-600 bg-gray-50';
                return (
                  <tr key={cert.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-stone-800">{cert.userName}</p>
                      <p className="text-xs text-stone-400">{cert.userEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-700 font-medium">{cert.examTitle}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-display text-base font-extrabold text-stone-800">{cert.score}</span>
                      <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${predStyle}`}>
                        {cert.predikat}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-stone-600">{cert.certificateNo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold ${status.color} ${status.bg}`}>
                        <StatusIcon size={10} /> {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-400">{formatDate(cert.issuedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setDetailCert(cert)}
                          title="Detail"
                          className="flex h-7 w-7 items-center justify-center rounded text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
                        >
                          <Eye size={14} />
                        </button>
                        {cert.status === 'pending_approval' && (
                          <button
                            onClick={() => handleAction(cert.id, 'approve')}
                            disabled={isLoading}
                            title="Setujui"
                            className="flex h-7 w-7 items-center justify-center rounded text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                          </button>
                        )}
                        {cert.status === 'approved' && (
                          <button
                            onClick={() => handleAction(cert.id, 'send')}
                            disabled={isLoading}
                            title="Kirim"
                            className="flex h-7 w-7 items-center justify-center rounded text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-40"
                          >
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={14} />}
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
      {detailCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailCert(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
              <h3 className="font-display text-lg font-extrabold text-stone-800">Detail Sertifikat</h3>
              <button onClick={() => setDetailCert(null)} className="rounded-lg p-1 text-stone-400 hover:bg-stone-100">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* User info */}
              <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Peserta</p>
                <p className="mt-1 text-sm font-bold text-stone-800">{detailCert.userName}</p>
                <p className="text-xs text-stone-500">{detailCert.userEmail}</p>
              </div>

              {/* Exam info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Ujian</p>
                  <p className="mt-1 text-sm font-bold text-stone-800">{detailCert.examTitle}</p>
                </div>
                <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                  <p className="text-xs font-bold uppercase tracking-wide text-stone-400">No. Sertifikat</p>
                  <p className="mt-1 font-mono text-sm font-bold text-stone-800">{detailCert.certificateNo}</p>
                </div>
              </div>

              {/* Score */}
              <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Nilai & Predikat</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-display text-xl font-extrabold text-stone-800">{detailCert.score}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${PREDIKAT_STYLES[detailCert.predikat] ?? 'text-gray-600 bg-gray-50'}`}>
                    {detailCert.predikat}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="rounded-lg bg-stone-50 px-4 py-3 ring-1 ring-stone-200">
                <p className="text-xs font-bold uppercase tracking-wide text-stone-400">Timeline</p>
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={12} className="text-stone-400" />
                    <span className="text-stone-600">Dibuat: {formatDate(detailCert.issuedAt)}</span>
                  </div>
                  {detailCert.approvedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-blue-500" />
                      <span className="text-stone-600">Disetujui: {formatDate(detailCert.approvedAt)}</span>
                    </div>
                  )}
                  {detailCert.sentAt && (
                    <div className="flex items-center gap-2">
                      <Send size={12} className="text-emerald-500" />
                      <span className="text-stone-600">Dikirim: {formatDate(detailCert.sentAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 border-t border-stone-100 pt-4">
                {detailCert.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => handleAction(detailCert.id, 'approve')}
                      disabled={actionLoading === detailCert.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-40"
                    >
                      <CheckCircle2 size={15} /> Setujui
                    </button>
                    <Link href={`/exam/certificates/${detailCert.id}`}
                      className="flex items-center justify-center gap-2 rounded-lg bg-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-300">
                      <Eye size={15} /> Preview
                    </Link>
                  </>
                )}
                {detailCert.status === 'approved' && (
                  <>
                    <button
                      onClick={() => handleAction(detailCert.id, 'send')}
                      disabled={actionLoading === detailCert.id}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40"
                    >
                      <Send size={15} /> Kirim Sertifikat
                    </button>
                    <Link href={`/exam/certificates/${detailCert.id}`}
                      className="flex items-center justify-center gap-2 rounded-lg bg-stone-200 px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-300">
                      <Eye size={15} /> Preview
                    </Link>
                  </>
                )}
                {detailCert.status === 'sent' && (
                  <Link href={`/exam/certificates/${detailCert.id}`}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-stone-200 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-300">
                    <Eye size={15} /> Lihat Sertifikat
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCertificatesPage;
