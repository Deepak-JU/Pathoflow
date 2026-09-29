import React, { createContext, useContext, useEffect, useState } from 'react';

export interface ToastMessage {
  id: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  title: string;
  message: string;
  timestamp: string;
}

interface RealTimeContextType {
  isConnected: boolean;
  lastEvent: any | null;
  refreshTrigger: number;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
  triggerManualRefresh: () => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

export const RealTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const triggerManualRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/sse');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.addEventListener('connected', () => {
          setIsConnected(true);
        });

        eventSource.addEventListener('lab_update', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'SYSTEM' && data.payload?.heartbeat) {
              return; // Ignore keep-alive heartbeats
            }

            setLastEvent(data);
            setRefreshTrigger(prev => prev + 1);

            // Create contextual toast alert
            if (data.type === 'QA_ALERT') {
              const alert = data.payload?.alert || data.payload;
              const isCritical = alert?.severity === 'CRITICAL';
              const isHigh = alert?.severity === 'HIGH';

              const newToast: ToastMessage = {
                id: Math.random().toString(36).substring(7),
                type: isCritical ? 'CRITICAL' : isHigh ? 'WARNING' : 'INFO',
                title: isCritical
                  ? '🚨 CRITICAL DIAGNOSIS ALERT'
                  : isHigh
                  ? '⚠️ HIGH QA ANOMALY DETECTED'
                  : 'QA Alert Updated',
                message: alert?.description || 'Laboratory anomaly registered.',
                timestamp: new Date().toLocaleTimeString()
              };

              setToasts(prev => [newToast, ...prev.slice(0, 4)]);
            } else if (data.type === 'CHAIN_OF_CUSTODY') {
              const newToast: ToastMessage = {
                id: Math.random().toString(36).substring(7),
                type: 'INFO',
                title: `Custody Transfer: ${data.station || 'Lab'}`,
                message: `${data.entityType} ${data.action} by ${data.payload?.performedBy || 'Operator'}`,
                timestamp: new Date().toLocaleTimeString()
              };
              setToasts(prev => [newToast, ...prev.slice(0, 4)]);
            } else if (data.type === 'REPORT_STATUS') {
              const newToast: ToastMessage = {
                id: Math.random().toString(36).substring(7),
                type: data.payload?.isCritical ? 'CRITICAL' : 'SUCCESS',
                title: data.payload?.isCritical ? '🚨 REPORT SIGNED (CRITICAL)' : '📋 Report Signed Off',
                message: `Diagnostic report for ${data.payload?.accessionNumber || 'Accession'} signed.`,
                timestamp: new Date().toLocaleTimeString()
              };
              setToasts(prev => [newToast, ...prev.slice(0, 4)]);
            }
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        });

        eventSource.onerror = () => {
          setIsConnected(false);
          eventSource?.close();
          // Try reconnecting in 5 seconds
          reconnectTimeout = setTimeout(connectSSE, 5000);
        };
      } catch (err) {
        setIsConnected(false);
        reconnectTimeout = setTimeout(connectSSE, 5000);
      }
    };

    connectSSE();

    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  return (
    <RealTimeContext.Provider
      value={{
        isConnected,
        lastEvent,
        refreshTrigger,
        toasts,
        dismissToast,
        triggerManualRefresh
      }}
    >
      {children}

      {/* Floating Real-Time Notifications Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-y-0 ${
              toast.type === 'CRITICAL'
                ? 'bg-rose-950/95 border-rose-500 text-rose-100 shadow-rose-950/50 animate-pulse'
                : toast.type === 'WARNING'
                ? 'bg-amber-950/95 border-amber-500 text-amber-100 shadow-amber-950/50'
                : toast.type === 'SUCCESS'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100 shadow-emerald-950/50'
                : 'bg-slate-900/95 border-slate-700 text-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm tracking-wide">{toast.title}</h4>
                  <span className="text-[10px] opacity-75 font-mono">{toast.timestamp}</span>
                </div>
                <p className="text-xs mt-1 leading-relaxed opacity-90">{toast.message}</p>
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="text-xs opacity-60 hover:opacity-100 font-bold p-1 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </RealTimeContext.Provider>
  );
};

export const useRealTime = () => {
  const context = useContext(RealTimeContext);
  if (!context) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};
