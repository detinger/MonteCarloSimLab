import React, { useState } from 'react';
import Layout from './components/Layout';
import Theory from './pages/Theory';
import PiEstimation from './pages/PiEstimation';
import StockPrediction from './pages/StockPrediction';
import Integration from './pages/Integration';
import MontyHall from './pages/MontyHall';
import RandomWalk from './pages/RandomWalk';
import ProjectManagement from './pages/ProjectManagement';
import Manufacturing from './pages/Manufacturing';

function App() {
  const [activeTab, setActiveTab] = useState('theory');

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'theory' && <Theory />}
      {activeTab === 'pi' && <PiEstimation />}
      {activeTab === 'stock' && <StockPrediction />}
      {activeTab === 'integration' && <Integration />}
      {activeTab === 'montyhall' && <MontyHall />}
      {activeTab === 'randomwalk' && <RandomWalk />}
      {activeTab === 'projectmgmt' && <ProjectManagement />}
      {activeTab === 'manufacturing' && <Manufacturing />}
    </Layout>
  );
}

export default App;
