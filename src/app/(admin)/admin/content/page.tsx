'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Material } from '@/types/firestore';
import { useToast } from '@/hooks/useToast';
import { CheckCircle, XCircle, Eye } from 'lucide-react';

const AdminContent: FC = () => {
  const { addToast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

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

  const drafts = materials.filter((m) => m.status === 'draft');
  const published = materials.filter((m) => m.status === 'published');

  const handleApprove = async (id: string) => {
    await updateDoc(doc(db, 'materials', id), { status: 'published' });
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, status: 'published' as const } : m
      )
    );
    addToast('success', 'Material approved and published');
  };

  const handleReject = async (id: string) => {
    await updateDoc(doc(db, 'materials', id), { status: 'draft' });
    addToast('info', 'Material kept as draft');
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-extrabold text-gray-900">
        Content Moderation
      </h1>

      {/* Pending Approval */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-bold text-gray-900">
          Pending Approval ({drafts.length})
        </h2>
        {drafts.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-400 shadow-sm">
            No pending materials
          </p>
        ) : (
          <div className="space-y-3">
            {drafts.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm"
              >
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    {m.topic} • by {m.createdBy}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(m.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                  >
                    <CheckCircle size={14} /> Approve
                  </button>
                  <button
                    onClick={() => handleReject(m.id)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Published Content */}
      <section>
        <h2 className="mb-4 text-sm font-bold text-gray-900">
          Published ({published.length})
        </h2>
        <div className="space-y-3">
          {published.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                <Eye size={16} className="text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">{m.title}</p>
                <p className="text-xs text-gray-500">{m.description}</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Live
              </span>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default AdminContent;
