import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SolarGenerator from './pages/SolarGenerator';
import Gestao from './pages/Gestao';
import Studio from './pages/Studio';
import SolarAnalysis from './pages/SolarAnalysis';
import Automacao from './pages/Automacao';
import GoTeste from './pages/GoTeste';
import GoTesteReal from './pages/GoTesteReal';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/propostas/*" element={<SolarGenerator />} />
              <Route path="/gestao/*" element={<Gestao />} />
              <Route path="/studio/*" element={<Studio />} />
              <Route path="/solar/*" element={<SolarAnalysis />} />
              <Route path="/automacao/*" element={<Automacao />} />
              <Route path="/goteste/*" element={<GoTesteReal />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
