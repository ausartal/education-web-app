'use client';

import QuestionRenderer from '@/components/shared/QuestionRenderer';

export default function MarkdownRenderer({ content, className = '' }: { content: string; className?: string }) {
  return <QuestionRenderer content={content} className={className} />;
}
