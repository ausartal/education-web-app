'use client';

import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Atom, X, Search, Copy } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

const elements = [
  { symbol: 'H', name: 'Hydrogen', ar: 1.008 },
  { symbol: 'He', name: 'Helium', ar: 4.003 },
  { symbol: 'Li', name: 'Lithium', ar: 6.941 },
  { symbol: 'Be', name: 'Beryllium', ar: 9.012 },
  { symbol: 'B', name: 'Boron', ar: 10.81 },
  { symbol: 'C', name: 'Carbon', ar: 12.01 },
  { symbol: 'N', name: 'Nitrogen', ar: 14.01 },
  { symbol: 'O', name: 'Oxygen', ar: 16.0 },
  { symbol: 'F', name: 'Fluorine', ar: 19.0 },
  { symbol: 'Ne', name: 'Neon', ar: 20.18 },
  { symbol: 'Na', name: 'Sodium', ar: 22.99 },
  { symbol: 'Mg', name: 'Magnesium', ar: 24.31 },
  { symbol: 'Al', name: 'Aluminium', ar: 26.98 },
  { symbol: 'Si', name: 'Silicon', ar: 28.09 },
  { symbol: 'P', name: 'Phosphorus', ar: 30.97 },
  { symbol: 'S', name: 'Sulfur', ar: 32.07 },
  { symbol: 'Cl', name: 'Chlorine', ar: 35.45 },
  { symbol: 'Ar', name: 'Argon', ar: 39.95 },
  { symbol: 'K', name: 'Potassium', ar: 39.1 },
  { symbol: 'Ca', name: 'Calcium', ar: 40.08 },
  { symbol: 'Fe', name: 'Iron', ar: 55.85 },
  { symbol: 'Cu', name: 'Copper', ar: 63.55 },
  { symbol: 'Zn', name: 'Zinc', ar: 65.38 },
  { symbol: 'Br', name: 'Bromine', ar: 79.9 },
  { symbol: 'Ag', name: 'Silver', ar: 107.87 },
  { symbol: 'I', name: 'Iodine', ar: 126.9 },
  { symbol: 'Ba', name: 'Barium', ar: 137.33 },
  { symbol: 'Au', name: 'Gold', ar: 196.97 },
  { symbol: 'Pb', name: 'Lead', ar: 207.2 },
  { symbol: 'Mn', name: 'Manganese', ar: 54.94 },
];

export const PeriodicTableRef: FC = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { addToast } = useToast();

  const filtered = elements.filter(
    (el) =>
      el.symbol.toLowerCase().includes(search.toLowerCase()) ||
      el.name.toLowerCase().includes(search.toLowerCase())
  );

  const copyAr = (el: (typeof elements)[0]) => {
    navigator.clipboard.writeText(String(el.ar));
    addToast('success', `Ar ${el.symbol} = ${el.ar} copied!`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-[72px] z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-200/50 transition-all hover:scale-105 md:bottom-6"
        aria-label="Periodic Table"
      >
        <Atom size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-36 right-4 z-50 w-80 overflow-hidden rounded-3xl bg-white shadow-2xl md:bottom-20"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-emerald-600 px-4 py-3">
              <span className="text-xs font-bold text-white/80">
                Periodic Table — Ar Reference
              </span>
              <button onClick={() => setOpen(false)}>
                <X size={16} className="text-white/60" />
              </button>
            </div>

            {/* Search */}
            <div className="relative p-3">
              <Search
                size={14}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search element..."
                className="w-full rounded-xl bg-gray-50 py-2.5 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>

            {/* Elements List */}
            <div className="max-h-64 overflow-y-auto px-3 pb-3">
              {filtered.map((el) => (
                <button
                  key={el.symbol}
                  onClick={() => copyAr(el)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-emerald-50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-sm font-black text-emerald-700">
                    {el.symbol}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-800">
                      {el.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">
                      {el.ar}
                    </span>
                    <Copy size={12} className="text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
