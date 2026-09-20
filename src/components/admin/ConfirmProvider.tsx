'use client';

import { createContext, ReactNode, useContext, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'warning' | 'primary';
}

type ConfirmFunction = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<ConfirmFunction | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((result: boolean) => void) | null>(null);

  const request: ConfirmFunction = nextOptions => {
    setOptions(nextOptions);
    return new Promise(resolve => { resolver.current = resolve; });
  };

  const finish = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  const tone = options?.tone ?? 'danger';
  return <ConfirmContext.Provider value={request}>
    {children}
    {options && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[1px]" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) finish(false); }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start gap-3"><span className={'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ' + (tone === 'danger' ? 'bg-rose-50 text-rose-600' : tone === 'warning' ? 'bg-amber-50 text-amber-700' : 'bg-indigo-50 text-indigo-700')}><AlertTriangle size={19} /></span><div className="min-w-0 flex-1"><h2 id="confirm-title" className="text-base font-bold text-slate-900">{options.title}</h2><p id="confirm-description" className="mt-1 text-sm leading-6 text-slate-500">{options.description}</p></div><button type="button" onClick={() => finish(false)} aria-label="Tutup konfirmasi" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button></div>
        <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => finish(false)} className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Batal</button><button type="button" autoFocus onClick={() => finish(true)} className={'rounded-lg px-3.5 py-2 text-sm font-semibold text-white ' + (tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : tone === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700')}>{options.confirmLabel ?? 'Lanjutkan'}</button></div>
      </div>
    </div>}
  </ConfirmContext.Provider>;
}

export function useAdminConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useAdminConfirm must be used inside ConfirmProvider');
  return context;
}
