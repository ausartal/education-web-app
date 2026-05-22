'use client';

import { FC, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathProps {
  expression: string;
  displayMode?: boolean;
  className?: string;
}

export const Math: FC<MathProps> = ({
  expression,
  displayMode = false,
  className,
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(expression, {
        displayMode,
        throwOnError: false,
      });
    } catch {
      return expression;
    }
  }, [expression, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-label={expression}
      role="math"
    />
  );
};
