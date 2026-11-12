'use client';

import { FC } from 'react';
import { Pencil, Globe, Lock, Loader2, Eye } from 'lucide-react';
import { RichEditor } from '@/components/teacher/RichEditor';
import { MSATTierPath, CognitiveLevel } from '@/types/firestore';
import { TPDef, ExamQ, TIER_PATHS, COGNITIVE_LEVELS, ANSWER_KEYS, emptyForm } from './types';
import { Modal, TooltipInfo, QuestionPreview } from './parts';

interface QuestionFormModalProps {
  editQ: ExamQ | null;
  selectedTP: TPDef | null;
  form: ReturnType<typeof emptyForm>;
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyForm>>>;
  formTab: 'edit' | 'preview';
  setFormTab: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>;
  savingQ: boolean;
  isAdmin: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const QuestionFormModal: FC<QuestionFormModalProps> = ({ editQ, selectedTP, form, setForm, formTab, setFormTab, savingQ, isAdmin, onSave, onClose }) => (
      <Modal onClose={onClose} wide>
        <div className="mb-4 pr-8">
          <h3 className="text-base font-bold text-gray-900">
            {editQ ? 'Edit Soal' : 'Tambah Soal'}
            {selectedTP && (
              <span className="ml-2 rounded-lg bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                {selectedTP.code}
              </span>
            )}
          </h3>
        </div>

        <div className="mb-4 flex rounded-xl bg-gray-100 p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setFormTab('edit')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${formTab === 'edit' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={() => setFormTab('preview')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${formTab === 'preview' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Eye size={12} /> Preview
          </button>
        </div>

        {formTab === 'edit' ? (
          <div className="space-y-4">
            {/* Tier + Cognitive */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Tier Path *
                  <TooltipInfo text="Tier Path menentukan jalur adaptif soal dalam ujian MSAT. T1 (Anchor) = soal awal, T2 = soal lanjutan berdasarkan jawaban T1, T3 = soal akhir berdasarkan jalur T1+T2." />
                </label>
                <select
                  value={form.tierPath}
                  onChange={e => setForm(f => ({ ...f, tierPath: e.target.value as MSATTierPath }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  {TIER_PATHS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                  Level Kognitif
                  <TooltipInfo text="Taksonomi Bloom: C1=Mengingat, C2=Memahami, C3=Menerapkan, C4=Menganalisis, C5=Mengevaluasi, C6=Mencipta. Tentukan level berpikir yang diuji oleh soal ini." />
                </label>
                <select
                  value={form.cognitiveLevel}
                  onChange={e => setForm(f => ({ ...f, cognitiveLevel: e.target.value as CognitiveLevel }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  {COGNITIVE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Stem — RichEditor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Pertanyaan (Stem) *
                <TooltipInfo text="Tulis soal di sini. Mendukung markdown: **tebal**, *miring*, $rumus$ inline, $$rumus$$ display, gambar, dan video YouTube." />
              </label>
              <RichEditor
                value={form.stem}
                onChange={v => setForm(f => ({ ...f, stem: v }))}
                placeholder="Tulis soal di sini... Mendukung **teks tebal**, *miring*, $rumus$, gambar, dan video."
                minHeight={160}
              />
            </div>

            {/* Options */}
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-600">Pilihan Jawaban *</label>
              <div className="space-y-2">
                {ANSWER_KEYS.map(key => (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${form.correctAnswer === key ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {key}
                    </div>
                    <input
                      value={form[`option${key}` as keyof typeof form] as string}
                      onChange={e => setForm(f => ({ ...f, [`option${key}`]: e.target.value }))}
                      placeholder={`Pilihan ${key}${key === 'E' ? ' (opsional)' : ''}`}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    />
                    <button
                      onClick={() => setForm(f => ({ ...f, correctAnswer: key }))}
                      className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${form.correctAnswer === key ? 'bg-emerald-100 text-emerald-700' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                      Benar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation — RichEditor */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                Penjelasan / Pembahasan
                <TooltipInfo text="Markdown didukung: **tebal**, *miring*, $rumus$ inline, $$rumus$$ display, ```youtube ID``` video, ![alt](url) gambar. Bisa juga paste dari Word." />
              </label>
              <RichEditor
                value={form.explanation}
                onChange={v => setForm(f => ({ ...f, explanation: v }))}
                placeholder="Penjelasan jawaban yang benar... Bisa pakai rumus $E=mc^2$ atau gambar."
                minHeight={120}
              />
            </div>

            {/* Visibility — admin only */}
            {isAdmin && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Visibilitas Soal</label>
                <div className="flex gap-2">
                  {(['private', 'global'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, visibility: v }))}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${form.visibility === v ? (v === 'global' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-violet-400 bg-violet-50 text-violet-700') : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                    >
                      {v === 'global' ? <><Globe size={12} /> Public</> : <><Lock size={12} /> Private</>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Preview Tab ─────────────────────────────────────────── */
          <QuestionPreview form={form} tierPaths={TIER_PATHS} />
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Batal
          </button>
          <button
            onClick={onSave}
            disabled={savingQ || !form.stem.trim() || !form.optionA.trim() || !form.optionB.trim()}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {savingQ && <Loader2 size={14} className="animate-spin" />}
            {editQ ? 'Simpan' : 'Tambah Soal'}
          </button>
        </div>
      </Modal>
);
