import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { RealTimeProvider, useRealTime } from './context/RealTimeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { OperationsQADashboard } from './pages/OperationsQADashboard';
import { IntakeStation } from './pages/IntakeStation';
import { GrossingMicrotomyStation } from './pages/GrossingMicrotomyStation';
import { PathologistCockpit } from './pages/PathologistCockpit';
import { LineageExplorer } from './pages/LineageExplorer';
import { limsApi } from './api/limsApi';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const MainLayout: React.FC = () => {
  const { refreshTrigger } = useRealTime();
  const [activeAlertsCount, setActiveAlertsCount] = useState<number>(0);

  useEffect(() => {
    limsApi.getQAStats()
      .then((data) => setActiveAlertsCount(data.alerts.active.TOTAL))
      .catch(console.error);
  }, [refreshTrigger]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar activeAlertsCount={activeAlertsCount} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<OperationsQADashboard />} />
            <Route path="/intake" element={<IntakeStation />} />
            <Route path="/grossing-microtomy" element={<GrossingMicrotomyStation />} />
            <Route path="/pathologist" element={<PathologistCockpit />} />
            <Route path="/lineage" element={<LineageExplorer />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <RealTimeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </RealTimeProvider>
    </AuthProvider>
  );
}
