import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import r from 'react-syntax-highlighter/dist/esm/languages/prism/r'
import vscDarkPlus from 'react-syntax-highlighter/dist/esm/styles/prism/vsc-dark-plus'
SyntaxHighlighter.registerLanguage('python',python)
SyntaxHighlighter.registerLanguage('r',r)

const CodeExporter = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const [copyError,setCopyError]=useState(false)
  const handleCopy = async () => {
    try {await navigator.clipboard.writeText(code)} catch {setCopyError(true);return}
    setCopyError(false)
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLanguageLabel = (lang) => {
    switch(lang.toLowerCase()) {
      case 'python': return 'Python';
      case 'r': return 'R';
      default: return lang;
    }
  };

  return (
    <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
      <div className="code-header">
        <span>{getLanguageLabel(language)} Code</span>
        <button 
          onClick={handleCopy}
          className="btn"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: 'none' }}
          title="Copy code"
        >
          {copied ? <Check size={14} className="text-accent" /> : <Copy size={14} />}
          <span style={{ color: copied ? 'var(--accent-color)' : 'inherit' }}>
            {copied ? 'Copied!' : 'Copy'}
          </span>
        </button>
      </div>
      {copyError && <p role="status">Clipboard access is unavailable. Select and copy the code below.</p>}
      <div className="code-block" style={{ padding: 0, overflow: 'hidden', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <SyntaxHighlighter
          language={language.toLowerCase()}
          style={vscDarkPlus}
          customStyle={{ margin: 0, borderRadius: '0', background: 'transparent' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeExporter;
