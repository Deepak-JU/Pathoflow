import React, { useState } from 'react';
import { useRealTime } from '../context/RealTimeContext';
import { useAuth } from '../context/AuthContext';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import {
  Activity,
  Barcode,
  Radio,
  RefreshCw,
  Bell,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  activeAlertsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ activeAlertsCount = 0 }) => {
  const { isConnected, triggerManualRefresh } = useRealTime();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg text-slate-100 tracking-tight">Patho<span className="text-brand-400">Flow</span></span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-950 text-brand-300 border border-brand-800 font-bold">LIMS v1.0</span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">Real-Time Lineage & Proactive QA Engine</p>
              </div>
            </Link>
          </div>

          {/* Action Header Elements */}
          <div className="flex items-center gap-3">
            {/* Live SSE / Redis Connection Pill */}
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border ${
              isConnected
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-amber-950/60 border-amber-800 text-amber-300'
            }`}>
              <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
              <span>{isConnected ? 'EVENT BUS: LIVE' : 'CONNECTING...'}</span>
            </div>

            {/* Quick Barcode Scanner Trigger */}
            <button
              onClick={() => setIsScannerOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold shadow-sm hover:border-brand-500 transition-colors"
            >
              <Barcode className="w-4 h-4 text-brand-400" />
              <span className="hidden md:inline">Scan Barcode</span>
            </button>

            {/* Manual Refresh */}
            <button
              onClick={triggerManualRefresh}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="Force Sync / Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* QA Alert Center Link */}
            <Link
              to="/dashboard"
              className="relative p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              title="QA Anomaly Alert Center"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold font-mono px-1.5 py-0.2 rounded-full border border-slate-900 animate-pulse">
                  {activeAlertsCount}
                </span>
              )}
            </Link>

            {/* Logged in User Badge & Logout */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-200 leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-medium text-brand-400">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer"
                  title={`Logout (${user.name})`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Universal Scanner Modal */}
      <BarcodeScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
    </>
  );
};
