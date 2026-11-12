'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';

export type ExportFormat = 'csv' | 'json';

interface ExportMenuProps {
  label?: string;
  onExport: (format: ExportFormat) => Promise<void> | void;
  formats?: ExportFormat[];
  align?: 'left' | 'right';
  disabled?: boolean;
  className?: string;
}

const FORMAT_META: Record<ExportFormat, { title: string; hint: string; icon: typeof FileJson; tone: string }> = {
  csv: { title: 'CSV', hint: 'Spreadsheet (Excel, Google Sheets)', icon: FileSpreadsheet, tone: 'bg-emerald-50 text-emerald-600' },
  json: { title: 'JSON', hint: 'Data mentah untuk integrasi', icon: FileJson, tone: 'bg-blue-50 text-blue-600' },
};

export function ExportMenu({ label = 'Export', onExport, formats = ['csv', 'json'], align = 'right', disabled, className = '' }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 250);
  }, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => cancelClose, [cancelClose]);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try { await onExport(format); } finally { setBusy(null); setOpen(false); }
  };

  return (
    <div
      ref={rootRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => { cancelClose(); if (!disabled) setOpen(true); }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {label}
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute top-full z-30 pt-2 ${align === 'right' ? 'right-0' : 'left-0'}`} onMouseEnter={cancelClose}>
          <div role="menu" className="w-72 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-200">
            <p className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pilih format</p>
            {formats.map(format => {
              const meta = FORMAT_META[format];
              const Icon = meta.icon;
              return (
                <button
                  key={format}
                  type="button"
                  role="menuitem"
                  disabled={busy !== null}
                  onClick={() => run(format)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none disabled:opacity-60"
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                    {busy === format ? <Loader2 size={18} className="animate-spin" /> : <Icon size={18} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-slate-800">Unduh {meta.title}</span>
                    <span className="block text-xs text-slate-500">{meta.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
