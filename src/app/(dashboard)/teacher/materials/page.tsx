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
import { PlusCircle, Eye, EyeOff, Edit } from 'lucide-react';
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
    addToast('success', `Material ${newStatus}`);
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
    addToast('success', 'Material created');
    // Refresh
    const snap = await getDocs(collection(db, 'materials'));
    setMaterials(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Material));
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={['teacher', 'admin']}>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold text-gray-900">
            Materials
          </h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          >
            <PlusCircle size={16} /> New Material
          </button>
        </div>

        {/* Material List */}
        <div className="space-y-3">
          {materials.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900">{m.title}</h3>
                <p className="text-xs text-gray-500">{m.description}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  m.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {m.status}
              </span>
              <button
                onClick={() => togglePublish(m.id, m.status)}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                title={m.status === 'published' ? 'Unpublish' : 'Publish'}
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
            </motion.div>
          ))}
        </div>

        {/* Create Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => setShowCreate(false)}
          title="New Material"
        >
          <div className="space-y-4">
            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <textarea
              placeholder="Content (Markdown)"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!form.title}>
                Create
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </RoleGuard>
  );
};

export default TeacherMaterials;
