import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { limsApi } from '../api/limsApi';
import { Barcode, Search, AlertCircle, CheckCircle, ExternalLink, X, Zap } from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ isOpen, onClose }) => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const sampleBarcodes = [
    { label: 'STAT Case Accession', code: 'ACC-2026-0001' },
    { label: 'Unscanned Case Block', code: 'CAS-2026-0002-A2' },
    { label: 'Unscanned Slide (HER2)', code: 'SLD-2026-0002-A2-1' },
    { label: 'Specimen Container', code: 'SPEC-2026-0001' },
    { label: 'TAT Breach Accession', code: 'ACC-2026-0004' }
  ];

  const handleScan = async (codeToScan?: string) => {
    const code = (codeToScan || barcodeInput).trim();
    if (!code) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await limsApi.resolveBarcode(code);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Barcode not found');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateToCockpit = (accessionId: string) => {
    onClose();
    navigate(`/pathologist?accessionId=${accessionId}`);
  };

  const handleNavigateToLineage = (accessionNumber: string) => {
    onClose();
    navigate(`/lineage?query=${accessionNumber}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Universal Barcode Scanner</h3>
              <p className="text-xs text-slate-400">Scan or enter any specimen, cassette, or slide barcode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Input field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleScan();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                autoFocus
                placeholder="Scan barcode or type ID (e.g. SLD-2026-0001-A1-1)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !barcodeInput.trim()}
              className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Scanning...' : 'Lookup'}
            </button>
          </form>

          {/* Quick-test pills */}
          <div>
            <span className="text-[11px] font-mono text-slate-400 block mb-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Quick Barcode Simulations:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sampleBarcodes.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(s.code);
                    handleScan(s.code);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-mono transition-colors"
                >
                  {s.label} ({s.code})
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Resolution Result */}
          {result && (
            <div className="bg-slate-950 border border-emerald-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-xs font-bold text-emerald-400 uppercase">
                    Resolved: {result.entityType}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Root: {result.lineage?.accession?.accession_number}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg text-xs space-y-1 font-mono text-slate-300 border border-slate-800">
                <div>Patient: <strong className="text-slate-100">{result.lineage?.accession?.patient?.full_name}</strong> ({result.lineage?.accession?.patient?.mrn})</div>
                <div>Priority: <strong className="text-amber-400">{result.lineage?.accession?.priority}</strong></div>
                <div>Status: <span className="text-sky-400">{result.lineage?.accession?.status}</span></div>
                <div>Physician: {result.lineage?.accession?.ordering_physician}</div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleNavigateToCockpit(result.accessionId)}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Pathologist Cockpit
                </button>
                <button
                  onClick={() => handleNavigateToLineage(result.lineage?.accession?.accession_number)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2 px-3 rounded-lg border border-slate-700"
                >
                  View Lineage Tree
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
