import React from 'react';

export const Slider = ({ label, min, max, step, value, onChange, description }) => (
  <div style={{ marginBottom: '1rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
      <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>{label}</label>
      <span className="text-accent" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{value}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value} 
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
    />
    {description && <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{description}</div>}
  </div>
);
