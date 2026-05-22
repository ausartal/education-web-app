'use client';

import { FC, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Shield, Clock, Brain, AlertTriangle, Zap } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const UjianPage: FC = () => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-[32px] bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 p-10 text-white lg:p-14">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-white/5" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-5">
              <Image
                src="/icons/topic-calculus.svg"
                alt=""
                width={64}
                height={64}
                className="hidden opacity-80 lg:block"
              />
              <div>
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  <Zap size={12} /> Adaptive Testing
                </div>
                <h1 className="font-display text-2xl font-extrabold lg:text-3xl">
                  Stoikiometri Assessment
                </h1>
                <p className="mt-1 text-sm text-white/60">
                  Ujian adaptif yang mengukur pemahamanmu secara mendalam
                </p>
              </div>
            </div>

            <div className="flex gap-6 text-center">
              <div>
                <p className="text-3xl font-black">21</p>
                <p className="text-xs text-white/60">Soal</p>
              </div>
              <div>
                <p className="text-3xl font-black">3</p>
                <p className="text-xs text-white/60">Stage</p>
              </div>
              <div>
                <p className="text-3xl font-black">~30</p>
                <p className="text-xs text-white/60">Menit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Rules + Action */}
        <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            {[
              {
                icon: Brain,
                text: 'Kesulitan menyesuaikan jawabanmu secara real-time',
                color: 'text-violet-500 bg-violet-50',
              },
              {
                icon: Clock,
                text: 'Setiap soal memiliki batas waktu tersendiri',
                color: 'text-blue-500 bg-blue-50',
              },
              {
                icon: Shield,
                text: 'Tidak bisa kembali ke soal sebelumnya',
                color: 'text-amber-500 bg-amber-50',
              },
              {
                icon: AlertTriangle,
                text: 'Jangan tinggalkan tab selama ujian',
                color: 'text-rose-500 bg-rose-50',
              },
            ].map((rule, i) => {
              const Icon = rule.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${rule.color}`}
                  >
                    <Icon size={18} />
                  </div>
                  <span className="text-sm text-gray-700">{rule.text}</span>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            <div className="rounded-2xl bg-amber-50 p-5">
              <p className="text-xs leading-relaxed text-amber-700">
                Sistem mengukur <strong>kecepatan</strong> dan{' '}
                <strong>ketepatan</strong> jawabanmu untuk menghasilkan profil
                pemahaman yang akurat.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="mt-auto w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200/50 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Mulai Ujian
            </button>
          </motion.div>
        </div>
      </motion.div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Konfirmasi"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Belum Siap
            </Button>
            <Button
              onClick={() => router.push('/ujian/msat-stoikiometri/session')}
            >
              Ya, Mulai
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Setelah dimulai, ujian tidak bisa di-pause. Pastikan koneksi stabil
          dan kamu dalam kondisi fokus.
        </p>
      </Modal>
    </div>
  );
};

export default UjianPage;
