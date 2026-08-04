'use client';

import QuestionRenderer from '@/components/shared/QuestionRenderer';

export default function MarkdownPreview({ content }: { content: string }) {
  return <QuestionRenderer content={content} />;
}
