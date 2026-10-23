import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { OrderSafetyPage } from './pages/OrderSafetyPage';
import { OperationsDashboard } from './pages/OperationsDashboard';

import { SafetyProvider } from './context/SafetyContext';

export const App: React.FC = () => {
  return (
    <SafetyProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#22241F]">
          <Navbar />
          <div className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/order/:token" element={<OrderSafetyPage />} />
              <Route path="/dashboard" element={<OperationsDashboard />} />
              {/* Fallback routes */}
              <Route path="/order" element={<Navigate to="/order/order-1042" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </SafetyProvider>
  );
};

export default App;
