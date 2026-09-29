import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { limsApi } from '../api/limsApi';
import { useRealTime } from '../context/RealTimeContext';
import { LineageResponse, Accession } from '../types/lims';
import { LineageTree } from '../components/LineageTree';
import { ChainOfCustodyTimeline } from '../components/ChainOfCustodyTimeline';
import {
  GitFork,
  Search,
  Barcode,
  ShieldCheck,
  ExternalLink,
  Layers,
  ArrowRight,
  Clock
} from 'lucide-react';

export const LineageExplorer: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshTrigger } = useRealTime();

  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('query') || 'ACC-2026-0001');
  const [lineageData, setLineageData] = useState<LineageResponse | null>(null);
  const [accessions, setAccessions] = useState<Accession[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadLineage = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);

    try {
      // First try resolving barcode or accession directly
      let res: LineageResponse | null = null;
      try {
        res = await limsApi.getLineage(query.trim());
      } catch {
        // If not accession number, try resolving as barcode
        const barcodeRes = await limsApi.resolveBarcode(query.trim());
        res = barcodeRes.lineage;
      }
      setLineageData(res);
    } catch (err: any) {
      setError(err.message || `No lineage found for '${query}'`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    limsApi.getAccessions().then(setAccessions).catch(console.error);
    const initial = searchParams.get('query') || searchQuery;
    if (initial) {
      setSearchQuery(initial);
      loadLineage(initial);
    }
  }, [refreshTrigger, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLineage(searchQuery);
  };

  const currentAcc = lineageData?.accession;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
            <GitFork className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Hierarchical Lineage & Custody Explorer</h1>
            <p className="text-xs text-slate-400">Complete visual trace: Accession ➔ Specimen ➔ Block ➔ Slide with immutable Chain of Custody</p>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Accession or Barcode (e.g. CAS-2026-0001-A1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
          >
            {loading ? 'Searching...' : 'Trace'}
          </button>
        </form>
      </div>

      {/* Quick Accession Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-mono text-[11px] flex-shrink-0">Quick Trace:</span>
        {accessions.map((acc) => (
          <button
            key={acc.id}
            onClick={() => {
              setSearchQuery(acc.accession_number);
              loadLineage(acc.accession_number);
            }}
            className={`px-2.5 py-1 rounded-lg border font-mono transition-colors flex-shrink-0 ${
              searchQuery === acc.accession_number
                ? 'bg-brand-600 text-white border-brand-500'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {acc.accession_number} ({acc.priority})
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs">
          {error}
        </div>
      )}

      {currentAcc && (
        <div className="space-y-6">
          {/* Accession Summary Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-extrabold font-mono text-white">{currentAcc.accession_number}</span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                  currentAcc.priority === 'STAT'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                    : currentAcc.priority === 'URGENT'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}>
                  {currentAcc.priority}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                  {currentAcc.status}
                </span>
              </div>

              <div className="text-xs text-slate-300 mt-2 font-mono flex flex-wrap gap-4">
                <span>Patient: <strong className="text-white">{currentAcc.patient?.full_name}</strong></span>
                <span>MRN: <strong className="text-brand-400">{currentAcc.patient?.mrn}</strong></span>
                <span>DOB: {new Date(currentAcc.patient?.dob).toLocaleDateString()}</span>
                <span>Physician: {currentAcc.ordering_physician}</span>
              </div>

              <p className="text-xs text-slate-400 mt-2 max-w-3xl leading-relaxed">
                <strong className="text-slate-300">Indication:</strong> {currentAcc.clinical_history}
              </p>
            </div>

            <button
              onClick={() => navigate(`/pathologist?accessionId=${currentAcc.id}`)}
              className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/30 flex items-center gap-2 transition-all"
            >
              Open in Pathologist Cockpit <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 2-Column Display: Hierarchical Lineage Tree (Left) and Chain of Custody Timeline (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              {lineageData?.tree && (
                <LineageTree
                  tree={lineageData.tree}
                  onSelectNode={(node) => {
                    if (node.type === 'SLIDE') {
                      navigate(`/pathologist?accessionId=${currentAcc.id}`);
                    }
                  }}
                />
              )}
            </div>

            <div className="lg:col-span-6 space-y-4">
              <ChainOfCustodyTimeline
                logs={lineageData?.custodyLogs || []}
                title={`Chain of Custody: ${currentAcc.accession_number}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
