'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, Clock, Brain, AlertTriangle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const rules = [
  { icon: Clock, text: '21 soal, ~30-45 menit' },
  { icon: Brain, text: 'Kesulitan menyesuaikan jawabanmu' },
  { icon: Shield, text: 'Tidak bisa kembali ke soal sebelumnya' },
  { icon: AlertTriangle, text: 'Jangan tinggalkan tab selama ujian' },
];

const UjianPage: FC = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  const handleStart = () => {
    router.push('/ujian/msat-stoikiometri/session');
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
          MSAT Exam
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          Multistage Adaptive Testing — ujian yang menyesuaikan tingkat
          kesulitan berdasarkan kemampuanmu
        </p>
      </motion.div>

      {/* Exam Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-3xl bg-white shadow-sm"
      >
        <div className="bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 p-8 text-white">
          <h2 className="mb-2 text-xl font-extrabold">
            Stoikiometri Assessment
          </h2>
          <p className="text-sm text-white/80">
            Ujian adaptif untuk mengukur pemahaman stoikiometri secara mendalam
          </p>
        </div>

        <div className="p-8">
          {/* Rules */}
          <h3 className="mb-4 text-sm font-bold text-gray-900">
            Peraturan Ujian
          </h3>
          <div className="mb-8 space-y-3">
            {rules.map((rule, i) => {
              const Icon = rule.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3"
                >
                  <Icon size={18} className="shrink-0 text-gray-500" />
                  <span className="text-sm text-gray-700">{rule.text}</span>
                </div>
              );
            })}
          </div>

          {/* Info */}
          <div className="mb-8 rounded-2xl bg-amber-50 p-5">
            <p className="text-sm text-amber-800">
              <strong>Penting:</strong> Ujian ini menggunakan sistem adaptif.
              Jika kamu menjawab benar, soal berikutnya akan lebih sulit. Jika
              salah, soal akan lebih mudah. Sistem juga mengukur waktu
              menjawabmu untuk menentukan tingkat kepercayaan diri.
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-500 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
          >
            Mulai Ujian
          </button>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Konfirmasi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button onClick={handleStart}>Ya, Mulai</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Setelah dimulai, ujian tidak bisa di-pause atau diulang. Pastikan kamu
          siap dan memiliki koneksi internet yang stabil.
        </p>
      </Modal>
    </div>
  );
};

export default UjianPage;
