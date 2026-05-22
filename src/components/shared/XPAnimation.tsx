'use client';

import { FC, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Star } from 'lucide-react';

interface XPAnimationProps {
  amount: number;
  show: boolean;
  onComplete?: () => void;
}

export const XPAnimation: FC<XPAnimationProps> = ({
  amount,
  show,
  onComplete,
}) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => onComplete?.(), 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{ opacity: 1, y: -20, scale: 1 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.6 }}
          className="pointer-events-none fixed bottom-32 right-8 z-[100] flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 font-bold text-white shadow-lg"
        >
          <Zap size={16} className="fill-white" />+{amount} XP
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface LevelUpModalProps {
  show: boolean;
  level: number;
  onClose: () => void;
}

export const LevelUpModal: FC<LevelUpModalProps> = ({
  show,
  level,
  onClose,
}) => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    if (show) {
      setParticles(Array.from({ length: 20 }, (_, i) => i));
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Particles */}
          {particles.map((i) => (
            <motion.div
              key={i}
              initial={{
                x: 0,
                y: 0,
                scale: 0,
                opacity: 1,
              }}
              animate={{
                x: (Math.random() - 0.5) * 400,
                y: (Math.random() - 0.5) * 400,
                scale: Math.random() * 1.5,
                opacity: 0,
              }}
              transition={{ duration: 1.5, delay: Math.random() * 0.3 }}
              className="absolute text-2xl"
            >
              {['✨', '⭐', '🎉', '🌟'][i % 4]}
            </motion.div>
          ))}

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            className="relative rounded-3xl bg-white p-10 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
            >
              <Star size={36} className="fill-white text-white" />
            </motion.div>
            <h2 className="mb-2 font-display text-2xl font-extrabold text-gray-900">
              Level Up!
            </h2>
            <p className="text-4xl font-black text-primary">{level}</p>
            <p className="mt-2 text-sm text-gray-500">
              Keep going! You&apos;re doing great.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
