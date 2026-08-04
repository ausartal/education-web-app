'use client';

import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useState } from 'react';

// ── Code block handler (YouTube embed + syntax highlight) ──────────
function CodeBlock({ className, children }: { className?: string; children?: React.ReactNode }) {
  const lang = /language-(\w+)/.exec(className || '')?.[1];

  // YouTube embed: ```youtube VIDEO_ID
  if (lang === 'youtube') {
    const videoId = String(children).trim();
    return (
      <div className="relative my-3 aspect-video w-full overflow-hidden rounded-xl bg-black shadow-md">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="YouTube video"
        />
      </div>
    );
  }

  // Regular inline code
  return (
    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-rose-600">
      {children}
    </code>
  );
}

// ── Pre wrapper (skip dark bg for YouTube embeds) ──────────────────
function PreBlock({ children }: { children?: React.ReactNode }) {
  // Check if child is a YouTube code block — if so, skip the <pre> wrapper
  if (
    children &&
    typeof children === 'object' &&
    'props' in children &&
    children.props?.className?.includes('language-youtube')
  ) {
    return <>{children}</>;
  }
  return (
    <pre className="my-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
      {children}
    </pre>
  );
}

// ── Image handler with SVG/HTTPS fallback ──────────────────────────
function ImageBlock({ src, alt }: { src?: string; alt?: string }) {
  const [error, setError] = useState(false);

  if (!src) return null;

  // If image failed to load, show alt text with link fallback
  if (error) {
    return (
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="my-3 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-blue-600 underline hover:bg-gray-100"
      >
        {alt || 'Lampiran'}
      </a>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ''}
      loading="lazy"
      onError={() => setError(true)}
      className="my-3 max-w-full rounded-xl shadow-sm"
      style={{ maxHeight: '500px', objectFit: 'contain' }}
    />
  );
}

// ── Shared component overrides ─────────────────────────────────────
const questionComponents: Components = {
  code: CodeBlock as Components['code'],
  pre: PreBlock as Components['pre'],
  img: ImageBlock as Components['img'],
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-violet-400 pl-4 italic text-gray-600">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 rounded-xl border text-sm">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="bg-gray-50 px-3 py-2 text-left font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t px-3 py-2 text-gray-700">{children}</td>
  ),
  p: ({ children }) => (
    <p className="whitespace-pre-wrap leading-relaxed">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="font-bold text-gray-900">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-gray-800">{children}</em>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-4 border-gray-200" />,
  ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-gray-800">{children}</li>,
};

// ── QuestionRenderer ───────────────────────────────────────────────
interface QuestionRendererProps {
  content: string;
  className?: string;
}

/**
 * Unified renderer for all question content (stems, options, explanations).
 * Supports: Markdown, LaTeX/KaTeX math, images, YouTube embeds, tables,
 * subscript/superscript, chemistry symbols, and all standard markdown.
 *
 * Used identically in: Bank Soal preview, Exam session, Quiz, Review/Recap.
 */
export default function QuestionRenderer({ content, className = '' }: QuestionRendererProps) {
  if (!content) return null;

  return (
    <div className={`question-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={questionComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
