import React from 'react';
import { InlineMath, BlockMath } from 'react-katex';
import 'katex/dist/katex.min.css';

export const Latex = ({ math, block = false }) => {
  return block ? <BlockMath math={math} /> : <InlineMath math={math} />;
};
