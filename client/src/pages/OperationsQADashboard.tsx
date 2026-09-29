import React, { useState, useEffect } from 'react';
import { limsApi } from '../api/limsApi';
import { useRealTime } from '../context/RealTimeContext';
import { QA_Alert, QAStatsResponse } from '../types/lims';
import { QABadge } from '../components/QABadge';
import {
  LayoutDashboard,
  AlertTriangle,
  Clock,
  Layers,
  Activity,
  CheckCircle,
  Play,
  RotateCcw,
  CheckSquare,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const OperationsQADashboard: React.FC = () => {
  const { refreshTrigger } = useRealTime();
  const navigate = useNavigate();

  const [stats, setStats] = useState<QAStatsResponse | null>(null);
  const [alerts, setAlerts] = useState<QA_Alert[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('unresolved');
  const [loading, setLoading] = useState<boolean>(true);
  const [runningWorker, setRunningWorker] = useState<boolean>(false);
  const [workerMessage, setWorkerMessage] = useState<string | null>(null);

  // Alert Resolution Modal
  const [resolvingAlert, setResolvingAlert] = useState<QA_Alert | null>(null);
  const [resolverName, setResolverName] = useState<string>('QA Coordinator Sarah Connor');
  const [resolutionNote, setResolutionNote] = useState<string>('Actioned with laboratory supervisor. Slides expedited.');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, alertsData] = await Promise.all([
        limsApi.getQAStats(),
        limsApi.getAlerts({
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          severity: filterSeverity === 'ALL' ? undefined : filterSeverity
        })
      ]);
      setStats(statsData);
      setAlerts(alertsData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [refreshTrigger, filterSeverity, filterStatus]);

  const handleRunWorker = async () => {
    try {
      setRunningWorker(true);
      const res = await limsApi.runQAWorker(4);
      setWorkerMessage(res.message);
      setTimeout(() => setWorkerMessage(null), 5000);
      loadDashboardData();
    } catch (err: any) {
      setWorkerMessage(err.message || 'Worker run failed');
    } finally {
      setRunningWorker(false);
    }
  };

  const handleResolveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;

    try {
      await limsApi.resolveAlert(resolvingAlert.id, resolverName, resolutionNote);
      setResolvingAlert(null);
      loadDashboardData();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title & On-Demand QA Engine Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Operations & QA Anomaly Control Dashboard
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-bold">
                PROACTIVE ENGINE
              </span>
            </h1>
            <p className="text-xs text-slate-400">Real-time laboratory KPI matrix, active TAT breaches, bottleneck queues, and QA anomaly resolution</p>
          </div>
        </div>

        {/* Trigger On-Demand Worker Scan */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunWorker}
            disabled={runningWorker}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-600/30 transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${runningWorker ? 'animate-spin' : ''}`} />
            {runningWorker ? 'Scanning TAT Rules...' : 'Run QA Anomaly Scan Now'}
          </button>
        </div>
      </div>

      {/* Worker feedback alert */}
      {workerMessage && (
        <div className="p-3 rounded-xl bg-brand-950/70 border border-brand-700 text-brand-200 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-400 flex-shrink-0" />
          <span>{workerMessage}</span>
        </div>
      )}

      {/* High-Level KPI Matrix (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Cases */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Total In-Processing</span>
            <Activity className="w-4 h-4 text-brand-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stats?.accessions.inProcessing ?? 0}</span>
            <span className="text-xs text-slate-400">/ {stats?.accessions.total ?? 0} total cases</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Signed off today:</span>
            <strong className="text-emerald-400 font-mono">{stats?.accessions.signedOffToday ?? 0}</strong>
          </div>
        </div>

        {/* Card 2: STAT / Critical Priority */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Active STAT Cases</span>
            <Flame className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-400 font-mono">{stats?.accessions.statCases ?? 0}</span>
            <span className="text-xs text-rose-300/80 font-mono">PRIORITY 1</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Critical Diagnoses:</span>
            <strong className="text-rose-400 font-mono">{stats?.alerts.criticalDiagnoses ?? 0}</strong>
          </div>
        </div>

        {/* Card 3: TAT Breaches */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-semibold uppercase">TAT Breaches (&gt;4h)</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-400 font-mono">{stats?.alerts.tatBreaches ?? 0}</span>
            <span className="text-xs text-amber-300/80 font-mono">RULE 1 VIOLATIONS</span>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Auto-monitored every:</span>
            <strong className="text-slate-300 font-mono">30 seconds</strong>
          </div>
        </div>

        {/* Card 4: QA Anomaly Alerts */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-mono font-semibold uppercase">Active QA Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{stats?.alerts.active.TOTAL ?? 0}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400">
                {stats?.alerts.active.CRITICAL ?? 0} CRIT
              </span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400">
                {stats?.alerts.active.HIGH ?? 0} HIGH
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-800/80 pt-2">
            <span>Missing Slide Blockers:</span>
            <strong className="text-amber-400 font-mono">{stats?.alerts.missingSlideBlockers ?? 0}</strong>
          </div>
        </div>
      </div>

      {/* Workstation Bottleneck Queues */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-400" />
            <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
              Real-Time Workstation Queue & Bottleneck Matrix
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Live Station Capacity</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">1. Grossing Intake</span>
            <span className="text-xl font-bold font-mono text-white">{stats?.workstationQueues.intakeGrossing.total ?? 0}</span>
            <span className="text-[10px] text-slate-400 block">Specimens</span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">2. Embedding</span>
            <span className="text-xl font-bold font-mono text-teal-400">{stats?.workstationQueues.embedding.total ?? 0}</span>
            <span className="text-[10px] text-slate-400 block">{stats?.workstationQueues.embedding.pendingEmbedding ?? 0} Pending</span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">3. Microtomy</span>
            <span className="text-xl font-bold font-mono text-cyan-400">{stats?.workstationQueues.microtomy.cutSlides ?? 0}</span>
            <span className="text-[10px] text-slate-400 block">Slides Cut</span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">4. Staining</span>
            <span className="text-xl font-bold font-mono text-fuchsia-400">{stats?.workstationQueues.staining.stainedSlides ?? 0}</span>
            <span className="text-[10px] text-slate-400 block">Stained</span>
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">5. Digital Scanning</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{stats?.workstationQueues.scanning.scannedSlides ?? 0}</span>
            <span className="text-[10px] text-slate-400 block">WSI Scanned</span>
          </div>
        </div>
      </div>

      {/* Active QA Alerts Triage List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-sm text-slate-100 uppercase tracking-wider">
              Proactive QA Anomaly Resolution Center
            </h2>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono"
            >
              <option value="unresolved">Status: Unresolved Only</option>
              <option value="resolved">Status: Resolved Only</option>
              <option value="ALL">Status: All Alerts</option>
            </select>

            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 font-mono"
            >
              <option value="ALL">Severity: All</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
            </select>
          </div>
        </div>

        {/* Alerts table */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <CheckCircle className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-300">No QA Anomaly Alerts Found</p>
              <p className="text-xs text-slate-500 mt-1">All quality parameters and specimen turnaround times are within acceptable tolerances.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all ${
                  alert.is_resolved
                    ? 'bg-slate-950/40 border-slate-800/80 opacity-70'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-rose-950/50 border-rose-600/80 shadow-lg shadow-rose-950/20'
                    : alert.severity === 'HIGH'
                    ? 'bg-amber-950/50 border-amber-600/80 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-850 border-slate-800'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <QABadge severity={alert.severity} type={alert.alert_type} />
                      <span className="text-xs font-mono font-bold text-slate-200">
                        {alert.accession?.accession_number}
                      </span>
                      {alert.accession?.priority && (
                        <span className="text-[10px] font-mono px-1.5 rounded bg-slate-800 text-slate-300">
                          {alert.accession.priority}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-200 font-medium leading-relaxed max-w-3xl">
                      {alert.description}
                    </p>

                    {alert.is_resolved && (
                      <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        Resolved by: {alert.resolved_by}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/lineage?query=${alert.accession?.accession_number}`)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1"
                    >
                      Lineage <ExternalLink className="w-3 h-3" />
                    </button>

                    {!alert.is_resolved && (
                      <button
                        onClick={() => setResolvingAlert(alert)}
                        className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1 shadow-md shadow-brand-600/30"
                      >
                        <CheckSquare className="w-3 h-3" />
                        Resolve Alert
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Alert Resolution Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Resolve QA Anomaly Alert</h3>
                <p className="text-xs text-slate-400">{resolvingAlert.alert_type} - {resolvingAlert.severity}</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
              <div>Description: <p className="text-slate-400 mt-0.5">{resolvingAlert.description}</p></div>
            </div>

            <form onSubmit={handleResolveAlert} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">QA Coordinator / Resolver *</label>
                <input
                  type="text"
                  required
                  value={resolverName}
                  onChange={(e) => setResolverName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Resolution Actions Taken *</label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-md shadow-brand-600/30"
                >
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
