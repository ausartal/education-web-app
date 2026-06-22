'use client';

import { FC, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, BookOpen, Copy, Check, Pencil, Trash2, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useAuthSWR } from '@/hooks/useAuthSWR';

interface ClassItem {
  id: string;
  name: string;
  subject: string;
  joinCode: string;
  studentCount: number;
  examCount: number;
  status: string;
}

const TeacherKelasPage: FC = () => {
  const { user } = useAuth();
  const { data, isLoading, mutate } = useAuthSWR<{ classes: ClassItem[] }>('/api/teacher/classes');
  const classes = data?.classes ?? [];
  const loading = isLoading;

  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ClassItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const getToken = useCallback(async () => user ? await user.getIdToken() : '', [user]);

  const handleCreate = async () => {
    if (!form.name || !form.subject) return;
    setSaving(true);
    const t = await getToken();
    await fetch('/api/teacher/classes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(form),
    });
    setForm({ name: '', subject: '' });
    setShowCreate(false);
    setSaving(false);
    mutate();
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const t = await getToken();
    await fetch(`/api/teacher/classes/${editItem.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name: form.name, subject: form.subject }),
    });
    setEditItem(null);
    setForm({ name: '', subject: '' });
    setSaving(false);
    mutate();
  };

  const handleDelete = async (id: string) => {
    const t = await getToken();
    await fetch(`/api/teacher/classes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    });
    setDeleteConfirm(null);
    mutate();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
    </div>
  );

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">Kelas Saya</h1>
            <p className="mt-1 text-sm text-gray-500">Kelola kelas dan kode bergabung siswa</p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setForm({ name: '', subject: '' }); }}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700"
          >
            <Plus size={16} /> Buat Kelas
          </button>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="rounded-3xl bg-white p-16 text-center shadow-sm">
            <Users size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="font-semibold text-gray-500">Belum ada kelas</p>
            <p className="mt-1 text-sm text-gray-400">Buat kelas pertama untuk mulai mengundang siswa</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{cls.name}</h3>
                    <p className="text-sm text-gray-500">{cls.subject}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { setEditItem(cls); setForm({ name: cls.name, subject: cls.subject }); }}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(cls.id)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Join Code */}
                <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Kode Bergabung</p>
                    <p className="font-mono text-xl font-black tracking-widest text-emerald-700">{cls.joinCode}</p>
                  </div>
                  <button
                    onClick={() => copyCode(cls.joinCode)}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    {copiedCode === cls.joinCode ? <Check size={12} /> : <Copy size={12} />}
                    {copiedCode === cls.joinCode ? 'Disalin!' : 'Salin'}
                  </button>
                </div>

                {/* Stats */}
                <div className="mb-4 flex gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Users size={14} />
                    <span>{cls.studentCount} siswa</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <BookOpen size={14} />
                    <span>{cls.examCount} ujian</span>
                  </div>
                </div>

                <Link
                  href={`/teacher/kelas/${cls.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 py-2.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  Detail Kelas <ArrowRight size={13} />
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {(showCreate || editItem) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 16 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 16 }}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold">{editItem ? 'Edit Kelas' : 'Buat Kelas Baru'}</h2>
                  <button onClick={() => { setShowCreate(false); setEditItem(null); }} className="rounded-lg p-1.5 hover:bg-gray-100">
                    <X size={18} />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Nama Kelas</label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="contoh: XII IPA 1"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-700">Mata Pelajaran</label>
                    <input
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                      placeholder="contoh: Kimia"
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => { setShowCreate(false); setEditItem(null); }}
                    className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    onClick={editItem ? handleEdit : handleCreate}
                    disabled={saving || !form.name || !form.subject}
                    className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : editItem ? 'Simpan' : 'Buat'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
              >
                <h3 className="mb-2 font-bold text-gray-900">Hapus Kelas?</h3>
                <p className="mb-6 text-sm text-gray-500">Kelas akan dihapus permanen. Data ujian dan siswa tidak ikut terhapus.</p>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl bg-gray-100 py-2.5 text-sm font-semibold">Batal</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white">Hapus</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </RoleGuard>
  );
};

export default TeacherKelasPage;
