import React from 'react';
import { AlertSeverity } from '../types/lims';

interface QABadgeProps {
  severity: AlertSeverity;
  type?: string;
  size?: 'sm' | 'md';
}

export const QABadge: React.FC<QABadgeProps> = ({ severity, type, size = 'sm' }) => {
  const getColors = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold rounded-full border ${getColors()} ${pad}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {type ? `${severity}: ${type}` : severity}
    </span>
  );
};
