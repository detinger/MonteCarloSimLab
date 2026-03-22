import React from 'react';
import { BookOpen, CircleDot, TrendingUp, Calculator, Gamepad2, Map, Calendar, Factory } from 'lucide-react';

const Navigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'theory', label: 'Theory & Concepts', icon: BookOpen },
    { id: 'pi', label: 'Estimating Pi', icon: CircleDot },
    { id: 'stock', label: 'Stock Price Prediction', icon: TrendingUp },
    { id: 'integration', label: 'Monte Carlo Integration', icon: Calculator },
    { id: 'montyhall', label: 'Monty Hall Problem', icon: Gamepad2 },
    { id: 'randomwalk', label: '2D Random Walk', icon: Map },
    { id: 'projectmgmt', label: 'Project Scheduling', icon: Calendar },
    { id: 'manufacturing', label: 'Manufacturing Quality', icon: Factory },
  ];

  return (
    <aside className="sidebar">
      <div className="mb-4">
        <h2 className="text-accent" style={{ fontSize: '1.2rem', margin: 0 }}>Monte Carlo Lab</h2>
        <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '4px' }}>Interactive Learning Tool</p>
      </div>
      
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
              style={{
                background: isActive ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
                width: '100%',
                textAlign: 'left'
              }}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default Navigation;
