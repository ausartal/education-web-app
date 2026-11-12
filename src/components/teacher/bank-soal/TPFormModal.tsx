'use client';

import { FC } from 'react';
import { Globe, Lock, Loader2 } from 'lucide-react';
import { TPDef, emptyTPForm } from './types';
import { Modal } from './parts';

interface TPFormModalProps {
  editTP: TPDef | null;
  tpForm: ReturnType<typeof emptyTPForm>;
  setTPForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyTPForm>>>;
  savingTP: boolean;
  isAdmin: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const TPFormModal: FC<TPFormModalProps> = ({ editTP, tpForm, setTPForm, savingTP, isAdmin, onSave, onClose }) => (
      <Modal onClose={onClose}>
        <h3 className="mb-5 text-base font-bold text-gray-900">
          {editTP ? 'Edit Tujuan Pembelajaran' : 'Buat TP Baru'}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Kode TP *</label>
              <input
                value={tpForm.code}
                onChange={e => setTPForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="TP1"
                maxLength={10}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm font-mono font-bold uppercase outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Mata Pelajaran</label>
              <input
                value={tpForm.subject}
                onChange={e => setTPForm(f => ({ ...f, subject: e.target.value }))}
                placeholder="Kimia"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Nama / Topik *</label>
            <input
              value={tpForm.name}
              onChange={e => setTPForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Konsep Mol & Jumlah Partikel"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          {isAdmin && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">Visibilitas</label>
              <div className="flex gap-2">
                {(['private', 'global'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setTPForm(f => ({ ...f, scope: s }))}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${tpForm.scope === s ? (s === 'global' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-violet-400 bg-violet-50 text-violet-700') : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                  >
                    {s === 'global' ? <><Globe size={12} /> Public</> : <><Lock size={12} /> Private</>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={savingTP || !tpForm.code.trim() || !tpForm.name.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {savingTP && <Loader2 size={14} className="animate-spin" />}
            {editTP ? 'Simpan Perubahan' : 'Buat TP'}
          </button>
        </div>
      </Modal>
);
