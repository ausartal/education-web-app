'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Shield, Clock, Brain, AlertTriangle, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const rules = [
  {
    icon: Brain,
    text: '21 soal adaptif — kesulitan menyesuaikan jawabanmu',
    color: 'text-violet-500 bg-violet-50',
  },
  {
    icon: Clock,
    text: 'Setiap soal memiliki batas waktu',
    color: 'text-blue-500 bg-blue-50',
  },
  {
    icon: Shield,
    text: 'Tidak bisa kembali ke soal sebelumnya',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    icon: AlertTriangle,
    text: 'Jangan tinggalkan tab selama ujian berlangsung',
    color: 'text-rose-500 bg-rose-50',
  },
];

const UjianPage: FC = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleStart = () => {
    router.push('/ujian/msat-stoikiometri/session');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
          MSAT Exam
        </h1>
        <p className="text-sm text-gray-500">
          Multistage Adaptive Testing — ujian yang menyesuaikan tingkat
          kesulitan berdasarkan kemampuanmu
        </p>
      </motion.div>

      {/* 2-column layout - separate cards */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Left Card - Hero + Rules */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="overflow-hidden rounded-3xl bg-white shadow-sm"
        >
          {/* Hero Banner */}
          <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-8 py-10 text-white">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 right-20 h-24 w-24 rounded-full bg-white/5" />
            <div className="relative flex items-center gap-6">
              <div className="hidden lg:block">
                <Image
                  src="/icons/topic-calculus.svg"
                  alt=""
                  width={70}
                  height={70}
                  className="opacity-90"
                />
              </div>
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                  <Zap size={12} /> Adaptive
                </div>
                <h2 className="text-xl font-extrabold lg:text-2xl">
                  Stoikiometri Assessment
                </h2>
                <p className="mt-1 text-sm text-white/70">
                  Ujian adaptif untuk mengukur pemahamanmu
                </p>
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="p-8">
            <h3 className="mb-4 text-sm font-bold text-gray-900">
              Peraturan Ujian
            </h3>
            <div className="space-y-3">
              {rules.map((rule, i) => {
                const Icon = rule.icon;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="flex items-center gap-4 rounded-xl bg-gray-50 px-5 py-3.5"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${rule.color}`}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="text-sm text-gray-700">{rule.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Right Card - Stats + Start */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
              Detail Ujian
            </h3>
            <div className="space-y-3">
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">21</p>
                <p className="text-xs text-gray-500">Soal</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">3</p>
                <p className="text-xs text-gray-500">Stage</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-4 text-center">
                <p className="text-2xl font-black text-gray-900">~30</p>
                <p className="text-xs text-gray-500">Menit</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-amber-50 p-5">
            <p className="text-xs leading-relaxed text-amber-700">
              Soal menyesuaikan kemampuanmu secara real-time. Waktu menjawab
              juga diukur untuk analisis.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Mulai Ujian
          </button>
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Konfirmasi Mulai Ujian"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Belum Siap
            </Button>
            <Button onClick={handleStart}>Ya, Mulai Sekarang</Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            Setelah dimulai, ujian <strong>tidak bisa di-pause</strong> atau
            diulang. Pastikan:
          </p>
          <ul className="list-inside list-disc space-y-1 text-gray-500">
            <li>Koneksi internet stabil</li>
            <li>Kamu dalam kondisi fokus</li>
            <li>Tidak akan meninggalkan tab browser</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default UjianPage;
