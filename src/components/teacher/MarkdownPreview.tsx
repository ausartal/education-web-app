'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

type CodeProps = { className?: string; children?: React.ReactNode };

const components = {
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
    <pre className="my-4 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">{children}</pre>
  ),
  // eslint-disable-next-line @next/next/no-img-element
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img src={src} alt={alt ?? ''} className="my-4 max-w-full rounded-xl shadow-md" />
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-4 border-l-4 border-emerald-400 pl-4 italic text-gray-600">{children}</blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 rounded-xl border text-sm">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-t px-4 py-2 text-gray-700">{children}</td>
  ),
};

export default function MarkdownPreview({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components as Record<string, unknown>}
    >
      {content}
    </ReactMarkdown>
  );
}
