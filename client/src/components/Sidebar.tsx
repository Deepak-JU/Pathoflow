import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardPlus,
  Scissors,
  Microscope,
  GitFork,
  ShieldAlert,
  Server,
  Lock
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user, canAccessStation } = useAuth();

  const navItems = [
    {
      to: '/dashboard',
      label: 'Operations & QA Dashboard',
      description: 'KPI Matrix & Anomaly Center',
      icon: LayoutDashboard,
      badge: 'PROACTIVE QA'
    },
    {
      to: '/intake',
      label: 'Intake & Accessioning',
      description: 'Patient Case & Barcoding',
      icon: ClipboardPlus
    },
    {
      to: '/grossing-microtomy',
      label: 'Grossing & Microtomy',
      description: 'Cassettes & Slide Cutting',
      icon: Scissors
    },
    {
      to: '/pathologist',
      label: 'Pathologist Cockpit',
      description: 'Slide Viewer & Sign-Off',
      icon: Microscope,
      highlight: true
    },
    {
      to: '/lineage',
      label: 'Lineage Explorer',
      description: 'Hierarchical Tree & CoC',
      icon: GitFork
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between flex-shrink-0 min-h-[calc(100vh-61px)]">
      <div className="p-3 space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">
          Laboratory Workstations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isAllowed = canAccessStation(item.to);

          if (!isAllowed) {
            return (
              <div
                key={item.to}
                className="flex items-start gap-3 p-3 rounded-xl border border-transparent text-slate-600 cursor-not-allowed opacity-50 select-none"
                title="Workstation restricted for your clinical role (Login as Admin for Master Access)"
              >
                <div className="mt-0.5 p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-600">
                  <Lock className="w-4 h-4" />
                </div>
                <div className="flex-1 truncate">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-slate-500">{item.label}</span>
                    <span className="text-[9px] font-mono px-1 rounded bg-slate-900 text-slate-600 border border-slate-800">
                      RESTRICTED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 truncate mt-0.5">Role restricted</p>
                </div>
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                  isActive
                    ? 'bg-brand-950/80 border-brand-500/80 text-white shadow-lg shadow-brand-950/40'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`
              }
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <Icon className="w-4 h-4 text-brand-400" />
              </div>
              <div className="flex-1 truncate">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-slate-100">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      QA
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.description}</p>
              </div>
            </NavLink>
          );
        })}
      </div>

      {/* System Status footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className="bg-slate-850 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <Server className="w-3 h-3 text-slate-500" />
              EVENT BUS
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">REDIS / SSE</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3 text-slate-500" />
              QA ENGINE
            </span>
            <span className="text-[10px] font-mono font-bold text-brand-400">ACTIVE (30s)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
