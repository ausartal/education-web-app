'use client';

import { FC, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code2, Link2, Image, Video, Calculator, Eye, PenLine,
  Minus, Table, Upload, ChevronDown, X,
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import 'katex/dist/katex.min.css';

// ─── Math symbol categories ─────────────────────────────────────────────────
const MATH_CATEGORIES = [
  {
    label: 'Huruf Yunani',
    items: [
      { d: 'α', l: '\\alpha' }, { d: 'β', l: '\\beta' }, { d: 'γ', l: '\\gamma' },
      { d: 'δ', l: '\\delta' }, { d: 'ε', l: '\\epsilon' }, { d: 'θ', l: '\\theta' },
      { d: 'λ', l: '\\lambda' }, { d: 'μ', l: '\\mu' }, { d: 'ν', l: '\\nu' },
      { d: 'π', l: '\\pi' }, { d: 'σ', l: '\\sigma' }, { d: 'τ', l: '\\tau' },
      { d: 'φ', l: '\\phi' }, { d: 'χ', l: '\\chi' }, { d: 'ψ', l: '\\psi' },
      { d: 'ω', l: '\\omega' }, { d: 'Γ', l: '\\Gamma' }, { d: 'Δ', l: '\\Delta' },
      { d: 'Λ', l: '\\Lambda' }, { d: 'Σ', l: '\\Sigma' }, { d: 'Φ', l: '\\Phi' },
      { d: 'Ψ', l: '\\Psi' }, { d: 'Ω', l: '\\Omega' },
    ],
  },
  {
    label: 'Operator',
    items: [
      { d: '±', l: '\\pm' }, { d: '×', l: '\\times' }, { d: '÷', l: '\\div' },
      { d: '≤', l: '\\leq' }, { d: '≥', l: '\\geq' }, { d: '≠', l: '\\neq' },
      { d: '≈', l: '\\approx' }, { d: '∞', l: '\\infty' }, { d: '∝', l: '\\propto' },
      { d: '∈', l: '\\in' }, { d: '∉', l: '\\notin' }, { d: '⊂', l: '\\subset' },
      { d: '∪', l: '\\cup' }, { d: '∩', l: '\\cap' }, { d: '∅', l: '\\emptyset' },
    ],
  },
  {
    label: 'Kimia / Fisika',
    items: [
      { d: '→', l: '\\rightarrow' }, { d: '←', l: '\\leftarrow' },
      { d: '⇌', l: '\\rightleftharpoons' }, { d: '⇒', l: '\\Rightarrow' },
      { d: '↔', l: '\\leftrightarrow' }, { d: '°', l: '^{\\circ}' },
      { d: '·', l: '\\cdot' }, { d: 'Δ', l: '\\Delta' }, { d: '∘', l: '\\circ' },
      { d: 'ℏ', l: '\\hbar' }, { d: '∇', l: '\\nabla' },
    ],
  },
  {
    label: 'Kalkulus',
    items: [
      { d: '∫', l: '\\int' }, { d: '∮', l: '\\oint' }, { d: '∑', l: '\\sum' },
      { d: '∏', l: '\\prod' }, { d: '∂', l: '\\partial' }, { d: '√', l: '\\sqrt{}' },
      { d: '∛', l: '\\sqrt[3]{}' }, { d: 'lim', l: '\\lim_{x \\to \\infty}' },
    ],
  },
  {
    label: 'Template',
    items: [
      { d: 'a/b', l: '\\frac{a}{b}' }, { d: 'xⁿ', l: 'x^{n}' },
      { d: 'xₙ', l: 'x_{n}' }, { d: '|x|', l: '|x|' },
      { d: 'x̄', l: '\\bar{x}' }, { d: 'x⃗', l: '\\vec{x}' },
      { d: 'log', l: '\\log' }, { d: 'ln', l: '\\ln' },
      { d: 'sin', l: '\\sin' }, { d: 'cos', l: '\\cos' },
      { d: 'tan', l: '\\tan' }, { d: 'A²+B²', l: 'A^2 + B^2 = C^2' },
    ],
  },
];

// ─── Preview markdown components ─────────────────────────────────────────────
type CodeProps = {
  className?: string;
  children?: React.ReactNode;
};

const previewComponents = {
  code: ({ className, children }: CodeProps) => {
    const lang = /language-(\w+)/.exec(className || '')?.[1];
    if (lang === 'youtube') {
      const videoId = String(children).trim();
      return (
        <div className="relative my-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <code className={`rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-rose-600 ${className ?? ''}`}>
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="my-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
      {children}
    </pre>
  ),
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt ?? ''} className="my-4 max-w-full rounded-xl shadow-md" />
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-4 border-l-4 border-emerald-400 pl-4 italic text-gray-600">
      {children}
    </blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 rounded-xl border text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t px-4 py-2 text-gray-700">{children}</td>
  ),
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface RichEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minHeight?: number;
  onImport?: (data: { title?: string; content: string; [k: string]: unknown }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const RichEditor: FC<RichEditorProps> = ({
  value,
  onChange,
  placeholder = 'Tulis konten materi di sini...\n\nGunakan **tebal**, *miring*, atau $rumus$.',
  minHeight = 380,
  onImport,
}) => {
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [showMath, setShowMath] = useState(false);
  const [mathCat, setMathCat] = useState(0);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Insert markdown at cursor position
  const insert = useCallback(
    (before: string, after = '') => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);
      const next = value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        const newPos = start + before.length + selected.length;
        el.setSelectionRange(newPos, newPos);
      });
    },
    [value, onChange],
  );

  const insertLine = useCallback(
    (prefix: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
      onChange(next);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length);
      });
    },
    [value, onChange],
  );

  // Upload image to Firebase Storage
  const handleImageUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const ext = file.name.split('.').pop() ?? 'png';
        const name = `materials/images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const storageRef = ref(storage, name);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        insert(`![${file.name}](${url})`);
      } catch {
        alert('Gagal upload gambar. Coba lagi.');
      } finally {
        setUploading(false);
      }
    },
    [insert],
  );

  // Insert YouTube embed
  const handleYoutube = useCallback(() => {
    const url = prompt('Masukkan URL atau ID video YouTube:');
    if (!url) return;
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    const id = match?.[1] ?? url.trim();
    insert('\n```youtube\n' + id + '\n```\n');
  }, [insert]);

  // Handle file import (.json or .md)
  const handleImport = useCallback(
    async (file: File) => {
      const text = await file.text();
      if (file.name.endsWith('.json')) {
        try {
          const data = JSON.parse(text);
          if (data.format?.startsWith('akurat-material') && data.content) {
            onImport?.(data);
          } else {
            alert('Format file tidak dikenali. Gunakan format akurat-material-v1.');
          }
        } catch {
          alert('File JSON tidak valid.');
        }
      } else if (file.name.endsWith('.md')) {
        // Simple markdown import — just use content
        onImport?.({ content: text });
      } else {
        alert('Hanya mendukung file .json atau .md');
      }
    },
    [onImport],
  );

  const toolbarBtn = 'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors';

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        {/* Format group */}
        <button type="button" className={toolbarBtn} title="Tebal (Ctrl+B)" onClick={() => insert('**', '**')}>
          <Bold size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Miring (Ctrl+I)" onClick={() => insert('*', '*')}>
          <Italic size={14} />
        </button>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        <button type="button" className={toolbarBtn} title="Judul 1" onClick={() => insertLine('# ')}>
          <Heading1 size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Judul 2" onClick={() => insertLine('## ')}>
          <Heading2 size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Judul 3" onClick={() => insertLine('### ')}>
          <Heading3 size={14} />
        </button>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        <button type="button" className={toolbarBtn} title="Daftar" onClick={() => insertLine('- ')}>
          <List size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Daftar bernomor" onClick={() => insertLine('1. ')}>
          <ListOrdered size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Kutipan" onClick={() => insertLine('> ')}>
          <Quote size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Kode" onClick={() => insert('`', '`')}>
          <Code2 size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Tautan" onClick={() => insert('[', '](https://)')}>
          <Link2 size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Garis horizontal" onClick={() => insert('\n---\n')}>
          <Minus size={14} />
        </button>
        <button type="button" className={toolbarBtn} title="Tabel" onClick={() => insert('\n| Kolom 1 | Kolom 2 |\n|---|---|\n| Baris 1 | Baris 1 |\n')}>
          <Table size={14} />
        </button>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        {/* Media group */}
        <button
          type="button"
          className={`${toolbarBtn} ${uploading ? 'opacity-50' : ''}`}
          title="Upload gambar"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          ) : (
            <Image size={14} />
          )}
        </button>
        <button type="button" className={toolbarBtn} title="Embed YouTube" onClick={handleYoutube}>
          <Video size={14} />
        </button>
        <div className="mx-1 h-5 w-px bg-gray-200" />
        {/* Math picker */}
        <div className="relative">
          <button
            type="button"
            className={`${toolbarBtn} gap-0.5 w-auto px-2 text-xs font-semibold ${showMath ? 'bg-violet-100 text-violet-700' : ''}`}
            title="Simbol matematika"
            onClick={() => setShowMath(v => !v)}
          >
            <Calculator size={14} />
            <ChevronDown size={10} />
          </button>
          {showMath && (
            <div className="absolute left-0 top-full z-50 mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                <p className="text-xs font-semibold text-gray-700">Simbol Matematika</p>
                <button type="button" onClick={() => setShowMath(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
              {/* Category tabs */}
              <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-2 py-1">
                {MATH_CATEGORIES.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMathCat(i)}
                    className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                      mathCat === i ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Symbol grid */}
              <div className="grid grid-cols-6 gap-1 p-3">
                {MATH_CATEGORIES[mathCat].items.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    title={`$${item.l}$`}
                    onClick={() => {
                      insert(`$${item.l}$`);
                      setShowMath(false);
                    }}
                    className="flex h-10 w-full items-center justify-center rounded-lg border border-gray-100 text-sm hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                  >
                    {item.d}
                  </button>
                ))}
              </div>
              <div className="border-t border-gray-100 px-3 py-2">
                <p className="mb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Display formula</p>
                <button
                  type="button"
                  onClick={() => { insert('$$\n', '\n$$'); setShowMath(false); }}
                  className="w-full rounded-lg border border-dashed border-violet-200 py-1.5 text-xs text-violet-600 hover:bg-violet-50"
                >
                  Masukkan blok rumus $$...$$
                </button>
              </div>
            </div>
          )}
        </div>
        {/* Import */}
        {onImport && (
          <button
            type="button"
            className={`${toolbarBtn} ml-auto gap-1 w-auto px-2 text-xs font-medium`}
            title="Import dari file"
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={13} />
            Import
          </button>
        )}
      </div>

      {/* ── Mode tabs ────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-100 bg-gray-50 px-3">
        <button
          type="button"
          onClick={() => setMode('write')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            mode === 'write'
              ? 'border-emerald-500 text-emerald-700'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <PenLine size={12} /> Tulis
        </button>
        <button
          type="button"
          onClick={() => setMode('preview')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
            mode === 'preview'
              ? 'border-emerald-500 text-emerald-700'
              : 'border-transparent text-gray-400 hover:text-gray-700'
          }`}
        >
          <Eye size={12} /> Preview
        </button>
      </div>

      {/* ── Editor / Preview ────────────────────────────────────────────── */}
      {mode === 'write' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full resize-y bg-white px-4 py-3 font-mono text-sm text-gray-800 placeholder-gray-300 outline-none"
          spellCheck={false}
        />
      ) : (
        <div
          className="prose prose-sm prose-emerald max-w-none overflow-y-auto px-6 py-5"
          style={{ minHeight }}
        >
          {value.trim() ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={previewComponents as Record<string, unknown>}
            >
              {value}
            </ReactMarkdown>
          ) : (
            <p className="text-gray-300 italic">Tidak ada konten untuk ditampilkan.</p>
          )}
        </div>
      )}

      {/* ── Footer hint ─────────────────────────────────────────────────── */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-1.5">
        <p className="text-[10px] text-gray-400">
          Markdown didukung · <span className="font-mono">$rumus$</span> inline · <span className="font-mono">$$rumus$$</span> display · <span className="font-mono">```youtube ID```</span> video
        </p>
      </div>

      {/* Hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleImageUpload(f);
          e.target.value = '';
        }}
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json,.md"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleImport(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};
