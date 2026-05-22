'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Material } from '@/types/firestore';
import { RoleGuard } from '@/components/guards/RoleGuard';
import { useToast } from '@/hooks/useToast';
import { PlusCircle, Eye, EyeOff, Edit, BookOpen, Clock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const TeacherMaterials: FC = () => {
  const { addToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    topic: 'stoikiometri',
    subtopic: '',
    order: 1,
    content: '',
    estimatedTime: 15,
  });

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, 'materials'));
      setMaterials(
        snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Material)
      );
      setLoading(false);
    };
    fetch();
  }, []);

  const togglePublish = async (id: string, current: string) => {
    const newStatus = current === 'published' ? 'draft' : 'published';
    await updateDoc(doc(db, 'materials', id), { status: newStatus });
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: newStatus as Material['status'] } : m
      )
    );
    addToast(
      'success',
      `Materi ${newStatus === 'published' ? 'dipublikasi' : 'disembunyikan'}`
    );
  };

  const handleCreate = async () => {
    await addDoc(collection(db, 'materials'), {
      ...form,
      prerequisites: [],
      learningObjectives: [],
      createdBy: 'teacher',
      status: 'draft',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setShowCreate(false);
    setForm({
      title: '',
      description: '',
      topic: 'stoikiometri',
      subtopic: '',
      order: 1,
      content: '',
      estimatedTime: 15,
    });
    addToast('success', 'Materi berhasil dibuat');
    const snap = await getDocs(collection(db, 'materials'));
    setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Material));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  const published = materials.filter((m) => m.status === 'published').length;

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <h1 className="font-display text-2xl font-extrabold text-gray-900">
              Kelola Materi
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {published} dipublikasi dari {materials.length} materi
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg"
          >
            <PlusCircle size={16} /> Tambah Materi
          </button>
        </motion.div>

        {/* Material Cards */}
        <div className="space-y-4">
          {materials.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="group rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-50">
                  <BookOpen size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900 truncate">
                    {m.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                    {m.description}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] text-gray-400">
                      <Clock size={11} /> {m.estimatedTime} menit
                    </span>
                    <span className="text-[11px] text-gray-400">{m.topic}</span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    m.status === 'published'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {m.status === 'published' ? 'Publik' : 'Draf'}
                </span>
                <button
                  onClick={() => togglePublish(m.id, m.status)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                  title={
                    m.status === 'published' ? 'Sembunyikan' : 'Publikasikan'
                  }
                >
                  {m.status === 'published' ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
                <button className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
                  <Edit size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="Tambah Materi Baru"
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Judul
              </label>
              <input
                placeholder="Masukkan judul materi"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Deskripsi
              </label>
              <input
                placeholder="Deskripsi singkat"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                Konten (Markdown)
              </label>
              <textarea
                placeholder="Tulis konten materi..."
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={6}
                className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Batal
              </Button>
              <Button onClick={handleCreate} disabled={!form.title}>
                Buat Materi
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
};

export default TeacherMaterials;
