'use client';

import { FC, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, X } from 'lucide-react';

const buttons = [
  ['C', '(', ')', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', ''],
];

const sciButtons = ['log', 'ln', '√', 'x²', '10ˣ', 'π'];

export const ScientificCalculator: FC = () => {
  const [open, setOpen] = useState(false);
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');

  const handleButton = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setExpression('');
    } else if (val === '=') {
      try {
        const expr = expression
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, String(Math.PI));
        const result = Function('"use strict"; return (' + expr + ')')();
        setDisplay(String(parseFloat(result.toFixed(8))));
        setExpression(String(result));
      } catch {
        setDisplay('Error');
        setExpression('');
      }
    } else if (val === 'log') {
      setExpression((e) => e + 'Math.log10(');
      setDisplay((d) => (d === '0' ? 'log(' : d + 'log('));
    } else if (val === 'ln') {
      setExpression((e) => e + 'Math.log(');
      setDisplay((d) => (d === '0' ? 'ln(' : d + 'ln('));
    } else if (val === '√') {
      setExpression((e) => e + 'Math.sqrt(');
      setDisplay((d) => (d === '0' ? '√(' : d + '√('));
    } else if (val === 'x²') {
      setExpression((e) => e + '**2');
      setDisplay((d) => d + '²');
    } else if (val === '10ˣ') {
      setExpression((e) => '10**(' + e + ')');
      setDisplay((d) => '10^(' + d + ')');
    } else if (val === 'π') {
      setExpression((e) => e + String(Math.PI));
      setDisplay((d) => (d === '0' ? 'π' : d + 'π'));
    } else {
      const newExpr = expression + val.replace('×', '*').replace('÷', '/');
      setExpression(newExpr);
      setDisplay(display === '0' && val !== '.' ? val : display + val);
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary-cyan text-white shadow-lg shadow-primary/25 transition-all hover:scale-105 md:bottom-6"
        aria-label="Calculator"
      >
        <Calculator size={20} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-36 right-4 z-50 w-72 overflow-hidden rounded-3xl bg-white shadow-2xl md:bottom-20"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gray-900 px-4 py-3">
              <span className="text-xs font-bold text-gray-400">
                Scientific Calculator
              </span>
              <button onClick={() => setOpen(false)}>
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Display */}
            <div className="bg-gray-900 px-4 pb-4">
              <p className="text-right text-2xl font-bold text-white">
                {display}
              </p>
            </div>

            {/* Scientific row */}
            <div className="grid grid-cols-6 gap-1 bg-gray-50 p-2">
              {sciButtons.map((btn) => (
                <button
                  key={btn}
                  onClick={() => handleButton(btn)}
                  className="rounded-lg py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                >
                  {btn}
                </button>
              ))}
            </div>

            {/* Main buttons */}
            <div className="grid grid-cols-4 gap-1 p-2">
              {buttons
                .flat()
                .filter(Boolean)
                .map((btn) => (
                  <button
                    key={btn}
                    onClick={() => handleButton(btn)}
                    className={`rounded-xl py-3 text-sm font-bold transition-all active:scale-95 ${
                      btn === '='
                        ? 'bg-primary text-white'
                        : btn === 'C'
                          ? 'bg-rose-100 text-rose-600'
                          : ['+', '-', '×', '÷', '(', ')'].includes(btn)
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
