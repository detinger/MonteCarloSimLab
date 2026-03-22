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
      return `<span style="color:red">${math}</span>`;
    }
  }, [math, block]);

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
};
