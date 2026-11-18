import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export const Latex = ({ math, block = false }) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: true
      });
    } catch (error) {
      console.warn('KaTeX error for input:', math, error.message);
      return null;
    }
  }, [math, block]);

  if (html === null) return <span style={{color:"var(--error)"}}>{math}</span>;
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};
