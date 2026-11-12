'use client';

import { FC, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, PlusCircle, X, ExternalLink, Clock } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/useToast';
import { MaterialItem, ClassDetail, EmptyState } from './shared';

interface MaterialsTabProps {
  classId: string;
  cls: ClassDetail;
  setCls: React.Dispatch<React.SetStateAction<ClassDetail | null>>;
  authToken: () => Promise<string>;
}

export const MaterialsTab: FC<MaterialsTabProps> = ({ classId, cls, setCls, authToken }) => {
  const id = classId;
  const { addToast } = useToast();

  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [allMaterials, setAllMaterials] = useState<MaterialItem[]>([]);
  const [loadingMat, setLoadingMat] = useState(false);
  const [showAddMat, setShowAddMat] = useState(false);
  const unpinnedMaterials = allMaterials.filter(
    m => !materials.find(pm => pm.id === m.id) && m.status === 'published',
  );

  const fetchClassMaterials = useCallback(async () => {
    if (!cls) return;
    setLoadingMat(true);
    try {
      const t = await authToken();
      // Fetch all materials, filter by those pinned in this class
      const res = await fetch('/api/teacher/materials', { headers: { Authorization: `Bearer ${t}` } });
      if (!res.ok) return;
      const data = await res.json();
      const all: MaterialItem[] = data.materials ?? [];
      setAllMaterials(all);
      // Class stores materialIds array
      const pinned = ((cls as unknown as Record<string, unknown>).materialIds as string[]) ?? [];
      setMaterials(all.filter(m => pinned.includes(m.id)));
    } finally {
      setLoadingMat(false);
    }
  }, [cls, authToken]);

  useEffect(() => { fetchClassMaterials(); }, [fetchClassMaterials]);

  const handlePinMaterial = async (materialId: string) => {
    try {
      const t = await authToken();
      const current = ((cls as unknown as Record<string, unknown>).materialIds as string[]) ?? [];
      if (current.includes(materialId)) return;
      const newIds = [...current, materialId];
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ materialIds: newIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCls(c => c ? { ...c, materialIds: newIds } as unknown as ClassDetail : c);
      const mat = allMaterials.find(m => m.id === materialId);
      if (mat) setMaterials(prev => [...prev, mat]);
      setShowAddMat(false);
      addToast('success', 'Materi ditambahkan ke kelas');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal menambahkan materi');
    }
  };

  const handleUnpinMaterial = async (materialId: string) => {
    try {
      const t = await authToken();
      const current = ((cls as unknown as Record<string, unknown>).materialIds as string[]) ?? [];
      const newIds = current.filter(mid => mid !== materialId);
      const res = await fetch(`/api/teacher/classes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ materialIds: newIds }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setCls(c => c ? { ...c, materialIds: newIds } as unknown as ClassDetail : c);
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      addToast('success', 'Materi dilepas dari kelas');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Gagal melepas materi');
    }
  };

  return (
      <motion.div key="materi" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">{materials.length} materi ditetapkan ke kelas ini</p>
          <div className="flex gap-2">
            <Link
              href="/teacher/materials"
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <ExternalLink size={14} /> Kelola Materi
            </Link>
            <button
              onClick={() => { fetchClassMaterials(); setShowAddMat(true); }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              <PlusCircle size={14} /> Tambah
            </button>
          </div>
        </div>

        {loadingMat ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" /></div>
        ) : materials.length === 0 ? (
          <EmptyState icon={<BookOpen size={32} />} title="Belum ada materi" description="Tetapkan materi yang relevan ke kelas ini" />
        ) : (
          <div className="space-y-3">
            {materials.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <BookOpen size={18} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{m.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                    <Clock size={10} /> {m.estimatedTime} menit · {m.topic}
                    · oleh {m.createdByName}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  m.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {m.status === 'published' ? 'Publik' : 'Draf'}
                </span>
                <button
                  onClick={() => handleUnpinMaterial(m.id)}
                  className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Lepas dari kelas"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Add material picker */}
        <AnimatePresence>
          {showAddMat && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
              onClick={e => { if (e.target === e.currentTarget) setShowAddMat(false); }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                  <h3 className="font-semibold text-gray-900">Tambah Materi ke Kelas</h3>
                  <button onClick={() => setShowAddMat(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <div className="max-h-80 overflow-y-auto p-4">
                  {unpinnedMaterials.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">Semua materi sudah ditambahkan</p>
                  ) : (
                    <div className="space-y-2">
                      {unpinnedMaterials.map(m => (
                        <button
                          key={m.id}
                          onClick={() => handlePinMaterial(m.id)}
                          className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left hover:border-emerald-200 hover:bg-emerald-50 transition-colors"
                        >
                          <BookOpen size={16} className="shrink-0 text-emerald-500" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900">{m.title}</p>
                            <p className="text-xs text-gray-400">{m.topic} · {m.estimatedTime} menit</p>
                          </div>
                          <PlusCircle size={16} className="shrink-0 text-emerald-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
  );
};
