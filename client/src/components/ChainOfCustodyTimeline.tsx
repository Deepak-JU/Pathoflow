import React from 'react';
import { ChainOfCustodyLog } from '../types/lims';
import { ShieldCheck, Clock, User, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface ChainOfCustodyTimelineProps {
  logs: ChainOfCustodyLog[];
  title?: string;
}

export const ChainOfCustodyTimeline: React.FC<ChainOfCustodyTimelineProps> = ({ logs, title = 'Chain of Custody Audit Trail' }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-center text-slate-400">
        <ShieldCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
        <p className="text-sm">No custody events recorded yet for this entity.</p>
      </div>
    );
  }

  const getStationColor = (station: string) => {
    switch (station) {
      case 'INTAKE': return 'text-sky-400 bg-sky-950/60 border-sky-800';
      case 'EMBEDDING': return 'text-indigo-400 bg-indigo-950/60 border-indigo-800';
      case 'MICROTOMY': return 'text-teal-400 bg-teal-950/60 border-teal-800';
      case 'STAINING': return 'text-fuchsia-400 bg-fuchsia-950/60 border-fuchsia-800';
      case 'SCANNING': return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
      case 'PATHOLOGY': return 'text-purple-400 bg-purple-950/60 border-purple-800';
      default: return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-slate-100 text-sm tracking-wide">{title}</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">{logs.length} Immutable Event(s)</span>
      </div>

      <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {logs.map((log) => {
          let parsedMetadata = null;
          if (log.metadata) {
            try {
              parsedMetadata = JSON.parse(log.metadata);
            } catch {
              // raw string
            }
          }

          return (
            <div key={log.id} className="relative group">
              <span className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-brand-500 group-hover:scale-125 transition-transform" />

              <div className="bg-slate-850/80 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-lg p-3 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStationColor(log.station)}`}>
                      <MapPin className="w-2.5 h-2.5 inline mr-1" />
                      {log.station}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">{log.action}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                      {log.entity_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    Performed by: <strong className="text-slate-300 font-medium">{log.performed_by}</strong>
                  </span>
                </div>

                {parsedMetadata && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 bg-slate-900/60 p-2 rounded">
                    <span className="text-slate-500 block mb-0.5 font-sans font-medium text-[10px]">EVENT METADATA:</span>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(parsedMetadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
