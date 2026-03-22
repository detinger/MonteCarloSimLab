import React from 'react';

export const Input = ({ label, type = 'number', value, onChange, step = 1, min, max }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 500, marginBottom: '0.5rem' }}>{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      step={step}
      min={min}
      max={max}
      className="input-base"
    />
  </div>
);
