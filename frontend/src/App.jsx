import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import UserMap from './components/UserMap';
import AdminPanel from './components/AdminPanel';
import Settings from './components/Settings';
import DriverPanel from './components/DriverPanel';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#0B1120] text-white font-sans">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/map" element={<UserMap />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Navigate to="/map" replace />} />
          <Route path="/driver" element={<DriverPanel />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
