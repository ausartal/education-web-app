'use client';

import { FC, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  Megaphone,
  Calendar,
  Shield,
  Inbox,
  Loader2,
} from 'lucide-react';

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: 'easeOut' as const },
});

interface InfoData {
  announcements: Array<{ id: string; title: string; content: string; type: string; publishedAt: string | null }>;
  schedules: Array<{ id: string; title: string; content: string; publishedAt: string | null }>;
  policies: Array<{ id: string; title: string; content: string; publishedAt: string | null }>;
}

const KPSInfoPage: FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<InfoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchInfo = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/kps/info', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setData(await res.json());
        setLoading(false);
      } catch { setLoading(false); }
    };
    fetchInfo();
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-violet-200 border-t-violet-600" />
      </div>
    );
  }

  if (!data) return null;

  const sections = [
    { key: 'announcements', label: 'Pengumuman', icon: Megaphone, items: data.announcements, gradient: 'from-violet-500 to-indigo-500' },
    { key: 'schedules', label: 'Jadwal Ujian', icon: Calendar, items: data.schedules, gradient: 'from-blue-500 to-cyan-500' },
    { key: 'policies', label: 'Kebijakan & Regulasi', icon: Shield, items: data.policies, gradient: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="space-y-6">
      <motion.div {...fade(0)}>
        <h1 className="font-display text-2xl font-extrabold text-stone-800">Informasi Resmi</h1>
        <p className="mt-1 text-sm text-stone-400">Pengumuman, jadwal, dan kebijakan KPS</p>
      </motion.div>

      {sections.map((section, sIdx) => {
        const Icon = section.icon;
        return (
          <motion.div key={section.key} {...fade(0.05 + sIdx * 0.05)}>
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100/80">
              <div className="mb-4 flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${section.gradient} shadow-sm`}>
                  <Icon size={14} className="text-white" />
                </div>
                <h3 className="font-display text-xs font-extrabold uppercase tracking-wider text-stone-400">{section.label}</h3>
              </div>

              {section.items.length === 0 ? (
                <div className="py-8 text-center">
                  <Inbox size={28} className="mx-auto mb-2 text-stone-300" />
                  <p className="text-sm text-stone-400">Tidak ada {section.label.toLowerCase()}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <div key={item.id} className="rounded-2xl bg-stone-50 p-4">
                      <p className="text-sm font-bold text-stone-700">{item.title}</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{item.content}</p>
                      {item.publishedAt && (
                        <p className="mt-2 text-[10px] text-stone-300">
                          {new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default KPSInfoPage;
