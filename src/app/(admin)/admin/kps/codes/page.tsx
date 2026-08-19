'use client';

import { FC, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/useToast';
import { KPSAccessCode } from '@/types/kps';
import {
  Plus,
  Copy,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
  Key,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react';

const AdminKPSCodesPage: FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [codes, setCodes] = useState<KPSAccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaxUses, setFormMaxUses] = useState(0);
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const fetchCodes = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/kps/admin/codes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCodes(data.codes || []);
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleCreate = async () => {
    if (!formTitle.trim()) {
      addToast('error', 'Judul diperlukan');
      return;
    }

    setCreating(true);
    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/kps/admin/codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          maxUses: formMaxUses,
          expiresAt: formExpiresAt || undefined,
        }),
      });

      if (res.ok) {
        addToast('success', 'Kode akses berhasil dibuat');
        setShowCreate(false);
        setFormTitle('');
        setFormDescription('');
        setFormMaxUses(0);
        setFormExpiresAt('');
        fetchCodes();
      } else {
        const data = await res.json();
        addToast('error', data.error || 'Gagal membuat kode');
      }
    } catch {
      addToast('error', 'Terjadi kesalahan');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    addToast('success', 'Kode disalin ke clipboard');
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    try {
      const token = await user!.getIdToken();
      await fetch(`/api/kps/admin/codes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchCodes();
      addToast('success', `Kode ${newStatus === 'active' ? 'diaktifkan' : 'dinonaktifkan'}`);
    } catch {
      addToast('error', 'Gagal mengubah status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus kode ini?')) return;
    try {
      const token = await user!.getIdToken();
      await fetch(`/api/kps/admin/codes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCodes();
      addToast('success', 'Kode berhasil dihapus');
    } catch {
      addToast('error', 'Gagal menghapus kode');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kode Akses KPS</h1>
          <p className="text-sm text-gray-500">Buat dan kelola kode akses ujian KPS</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-[#5841EA] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5841EA]/25 transition-all hover:-translate-y-0.5"
        >
          <Plus size={16} />
          Buat Kode Baru
        </button>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Buat Kode Akses</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Judul *</label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Ujian KPS Kelas XII - Agustus 2026"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#5841EA] focus:outline-none focus:ring-2 focus:ring-[#5841EA]/20"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-700">Deskripsi</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Deskripsi opsional..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#5841EA] focus:outline-none focus:ring-2 focus:ring-[#5841EA]/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Batas Penggunaan</label>
                    <input
                      type="number"
                      value={formMaxUses}
                      onChange={(e) => setFormMaxUses(parseInt(e.target.value) || 0)}
                      placeholder="0 = unlimited"
                      min={0}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#5841EA] focus:outline-none focus:ring-2 focus:ring-[#5841EA]/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold text-gray-700">Tanggal Expired</label>
                    <input
                      type="date"
                      value={formExpiresAt}
                      onChange={(e) => setFormExpiresAt(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-[#5841EA] focus:outline-none focus:ring-2 focus:ring-[#5841EA]/20"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#5841EA] px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#4a36d4] disabled:opacity-50"
                >
                  {creating ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Key size={16} />
                  )}
                  Buat Kode
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Codes List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[#5841EA]" />
        </div>
      ) : codes.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-white py-12 text-center">
          <Key size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Belum ada kode akses</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map((code, idx) => (
            <motion.div
              key={code.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopy(code.code)}
                      className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 font-mono text-lg font-bold text-[#5841EA] transition-colors hover:bg-[#5841EA]/10"
                    >
                      {code.code}
                      <Copy size={14} />
                    </button>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        code.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : code.status === 'expired'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {code.status === 'active' ? 'Aktif' : code.status === 'expired' ? 'Kedaluwarsa' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700">{code.title}</p>
                  {code.description && (
                    <p className="text-xs text-gray-500">{code.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {code.currentUses}/{code.maxUses || '∞'} digunakan
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      Exp: {code.expiresAt ? new Date(String(code.expiresAt)).toLocaleDateString('id-ID') : 'Tidak ada'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleStatus(code.id, code.status)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                    title={code.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                  >
                    {code.status === 'active' ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} />}
                  </button>
                  <button
                    onClick={() => handleDelete(code.id)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Hapus"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminKPSCodesPage;
