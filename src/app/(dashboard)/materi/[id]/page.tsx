'use client';

import { FC, useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, List, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getMaterial, getMaterials } from '@/services/materials';
import { updateProgress } from '@/services/progress';
import { Material } from '@/types/firestore';

const MateriDetailPage: FC = () => {
  const params = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [material, setMaterial] = useState<Material | null>(null);
  const [allMaterials, setAllMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const startTime = useRef(Date.now());

  const id = params.id as string;

  useEffect(() => {
    const fetch = async () => {
      const [mat, all] = await Promise.all([getMaterial(id), getMaterials()]);
      setMaterial(mat);
      setAllMaterials(all);
      setLoading(false);

      if (profile && mat) {
        updateProgress(profile.uid, mat.id, 'in_progress', 0);
      }
    };
    fetch();
  }, [id, profile]);

  // Save time spent when leaving page
  useEffect(() => {
    const saveTime = () => {
      if (profile && id) {
        const seconds = Math.round((Date.now() - startTime.current) / 1000);
        updateProgress(profile.uid, id, 'in_progress', seconds);
      }
    };
    window.addEventListener('beforeunload', saveTime);
    return () => {
      saveTime();
      window.removeEventListener('beforeunload', saveTime);
    };
  }, [profile, id]);

  // Extract headings for TOC
  const headings = useMemo(() => {
    if (!material?.content) return [];
    const matches = material.content.match(/^#{1,3}\s.+$/gm) || [];
    return matches.map((h) => {
      const level = h.match(/^#+/)?.[0].length || 1;
      const text = h.replace(/^#+\s/, '');
      const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return { level, text, slug };
    });
  }, [material?.content]);

  // Navigation
  const currentIdx = allMaterials.findIndex((m) => m.id === id);
  const prevMaterial = currentIdx > 0 ? allMaterials[currentIdx - 1] : null;
  const nextMaterial =
    currentIdx < allMaterials.length - 1 ? allMaterials[currentIdx + 1] : null;

  const handleMarkComplete = async () => {
    if (!profile || !material) return;
    const seconds = Math.round((Date.now() - startTime.current) / 1000);
    await updateProgress(profile.uid, material.id, 'completed', seconds);
    setCompleted(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="py-20 text-center">
        <p className="text-gray-500">Material not found</p>
        <Link
          href="/materi"
          className="mt-4 text-sm text-primary hover:underline"
        >
          ← Back to materials
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Top bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <button
          onClick={() => router.push('/materi')}
          className="flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-gray-900"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {/* Mobile TOC toggle */}
        <button
          onClick={() => setTocOpen(!tocOpen)}
          className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm text-gray-600 shadow-sm lg:hidden"
        >
          <List size={16} /> Contents
        </button>
      </motion.div>

      <div className="flex gap-8">
        {/* Sidebar TOC - Desktop */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20 rounded-3xl bg-white p-5 shadow-sm">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
              <span className="h-4 w-1 rounded-full bg-primary" />
              Contents
            </h4>
            <nav className="space-y-0.5">
              {headings.map((h) => (
                <a
                  key={h.slug}
                  href={`#${h.slug}`}
                  className={`group flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all hover:bg-primary/5 hover:text-primary ${
                    h.level === 1
                      ? 'font-semibold text-gray-800'
                      : h.level === 2
                        ? 'pl-6 text-gray-600'
                        : 'pl-9 text-gray-500 text-xs'
                  }`}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300 transition-colors group-hover:bg-primary" />
                  {h.text}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Mobile TOC Overlay */}
        {tocOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/30 lg:hidden"
            onClick={() => setTocOpen(false)}
          >
            <motion.div
              initial={{ x: -200 }}
              animate={{ x: 0 }}
              className="h-full w-64 bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-bold text-gray-900">Contents</h4>
                <button onClick={() => setTocOpen(false)}>
                  <X size={20} className="text-gray-400" />
                </button>
              </div>
              <nav className="space-y-2">
                {headings.map((h) => (
                  <a
                    key={h.slug}
                    href={`#${h.slug}`}
                    onClick={() => setTocOpen(false)}
                    className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-primary/5 hover:text-primary"
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}

        {/* Main Content */}
        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="min-w-0 flex-1"
        >
          {/* Title */}
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-indigo-500 to-cyan-400 p-8 text-white lg:p-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/50">
              {material.topic}
            </p>
            <h1 className="font-display text-2xl font-extrabold lg:text-3xl">
              {material.title}
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/75">
              {material.description}
            </p>
            <div className="mt-4 flex items-center gap-3 text-xs text-white/50">
              <span>⏱ {material.estimatedTime} min</span>
              <span>•</span>
              <span>📖 {headings.length} sections</span>
            </div>
          </div>

          {/* Markdown Content */}
          <div className="prose prose-gray max-w-none rounded-3xl bg-white p-8 shadow-sm lg:p-10 prose-headings:font-display prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-[15px] prose-p:leading-[1.8] prose-li:text-[15px] prose-a:text-primary">
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
              components={{
                h1: ({ children, ...props }) => {
                  const text = String(children);
                  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h1 id={slug} {...props}>{children}</h1>;
                },
                h2: ({ children, ...props }) => {
                  const text = String(children);
                  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h2 id={slug} {...props}>{children}</h2>;
                },
                h3: ({ children, ...props }) => {
                  const text = String(children);
                  const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h3 id={slug} {...props}>{children}</h3>;
                },
                code: (({ className, children }: { className?: string; children?: React.ReactNode }) => {
                  const lang = /language-(\w+)/.exec(className || '')?.[1];
                  if (lang === 'youtube') {
                    const videoId = String(children).trim();
                    return (
                      <div className="relative my-4 aspect-video w-full overflow-hidden rounded-xl bg-black not-prose">
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
                  return <code className={className}>{children}</code>;
                }) as React.ComponentType<unknown>,
              }}
            >
              {material.content}
            </ReactMarkdown>
          </div>

          {/* Bottom Actions Bar */}
          <div className="mt-10 space-y-4">
            {/* Navigation */}
            <div className="flex items-center gap-3">
              {prevMaterial ? (
                <Link
                  href={`/materi/${prevMaterial.id}`}
                  className="flex flex-1 items-center gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
                    <ChevronLeft size={18} className="text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-gray-400">Previous</p>
                    <p className="truncate text-sm font-semibold text-gray-700">
                      {prevMaterial.title}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex-1" />
              )}
              {nextMaterial && (
                <Link
                  href={`/materi/${nextMaterial.id}`}
                  className="flex flex-1 items-center justify-end gap-3 rounded-2xl bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] text-gray-400">Next</p>
                    <p className="truncate text-sm font-semibold text-gray-700">
                      {nextMaterial.title}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <ChevronRight size={18} className="text-primary" />
                  </div>
                </Link>
              )}
            </div>

            {/* Mark Complete */}
            {!completed ? (
              <button
                onClick={handleMarkComplete}
                className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 py-4 text-center text-sm font-bold text-white shadow-lg shadow-emerald-200/40 transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                ✓ Tandai Materi Selesai
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 py-4 text-sm font-semibold text-emerald-700">
                <CheckCircle size={18} />
                Materi sudah selesai!
              </div>
            )}
          </div>
        </motion.article>
      </div>
    </div>
  );
};

export default MateriDetailPage;
