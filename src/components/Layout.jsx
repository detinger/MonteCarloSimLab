import React from 'react';
import Navigation from './Navigation';
import '../App.css';

const Layout = ({ children, activeTab, setActiveTab }) => {
  return (
    <div className="app-container">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
