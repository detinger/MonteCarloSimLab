import React from 'react';

export const Card = ({ children, title }) => (
  <div className="glass-card mb-4">
    {title && (
      <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.5rem' }}>
        {title}
      </h3>
    )}
    {children}
  </div>
);
