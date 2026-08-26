'use client';

import { FC } from 'react';
import { motion } from 'framer-motion';

const AdminConfig: FC = () => {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="mb-6 font-display text-2xl font-extrabold text-gray-900">
          Platform Configuration
        </h1>
        <p className="text-sm text-gray-500">No configuration options available.</p>
      </motion.div>
    </div>
  );
};

export default AdminConfig;
