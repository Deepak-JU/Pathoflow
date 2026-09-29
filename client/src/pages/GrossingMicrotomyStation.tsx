import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { limsApi } from '../api/limsApi';
import { useRealTime } from '../context/RealTimeContext';
import { Accession, Block, Specimen, Slide } from '../types/lims';
import {
  Scissors,
  Box,
  Layers,
  Barcode,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  Sparkles,
  ArrowRight,
  FlaskConical,
  Radio
} from 'lucide-react';

export const GrossingMicrotomyStation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshTrigger } = useRealTime();

  const [accessions, setAccessions] = useState<Accession[]>([]);
  const [selectedAccessionId, setSelectedAccessionId] = useState<string>('');
  const [currentAccession, setCurrentAccession] = useState<Accession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // New Block Form (Grossing)
  const [selectedSpecimenId, setSelectedSpecimenId] = useState<string>('');
  const [blockNumber, setBlockNumber] = useState<string>('A1');
  const [grossingTech, setGrossingTech] = useState<string>('Grossing Tech. David Miller');

  // New Slide Form (Microtomy)
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [stainType, setStainType] = useState<string>('H&E');
  const [microtomyTech, setMicrotomyTech] = useState<string>('Microtomy Tech. Sarah Jenkins');

  // Fast Barcode Scanner input on station
  const [quickScanBarcode, setQuickScanBarcode] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const loadAccessions = async () => {
    try {
      setLoading(true);
      const list = await limsApi.getAccessions();
      setAccessions(list);

      const targetId = searchParams.get('accessionId') || selectedAccessionId || list[0]?.id;
      if (targetId) {
        setSelectedAccessionId(targetId);
        const detailed = await limsApi.getAccession(targetId);
        setCurrentAccession(detailed);
        if (detailed.specimens?.length > 0) {
          setSelectedSpecimenId(detailed.specimens[0].id);
          if (detailed.specimens[0].blocks?.length > 0) {
            setSelectedBlockId(detailed.specimens[0].blocks[0].id);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccessions();
  }, [refreshTrigger, searchParams]);

  const handleSelectAccession = async (id: string) => {
    setSelectedAccessionId(id);
    const detailed = await limsApi.getAccession(id);
    setCurrentAccession(detailed);
    if (detailed.specimens?.length > 0) {
      setSelectedSpecimenId(detailed.specimens[0].id);
      if (detailed.specimens[0].blocks?.length > 0) {
        setSelectedBlockId(detailed.specimens[0].blocks[0].id);
      }
    }
  };

  // Create Block (Grossing)
  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecimenId) return;

    try {
      await limsApi.createBlock({
        specimen_id: selectedSpecimenId,
        block_number: blockNumber,
        performed_by: grossingTech
      });
      setScanMessage(`Cassette ${blockNumber} grossed & barcode printed!`);
      loadAccessions();
    } catch (err: any) {
      setScanError(err.message);
    }
  };

  // Create Slide (Microtomy)
  const handleCreateSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBlockId) return;

    try {
      await limsApi.createSlide({
        block_id: selectedBlockId,
        stain_type: stainType,
        performed_by: microtomyTech
      });
      setScanMessage(`Glass slide [${stainType}] cut and barcoded!`);
      loadAccessions();
    } catch (err: any) {
      setScanError(err.message);
    }
  };

  // Rapid Slide status transition (e.g. advance to STAINED, SCANNED)
  const handleTransitionSlide = async (slideId: string, targetStatus: string) => {
    try {
      await limsApi.updateSlideStatus(slideId, targetStatus, 'Bench Specialist');
      setScanMessage(`Slide status updated to ${targetStatus}`);
      loadAccessions();
    } catch (err: any) {
      setScanError(err.message);
    }
  };

  // Quick Barcode Scanner Gun simulation
  const handleStationBarcodeScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickScanBarcode.trim()) return;

    setScanMessage(null);
    setScanError(null);

    try {
      const result = await limsApi.scanAction({
        barcode: quickScanBarcode.trim(),
        station: 'SCANNING',
        action: 'STATION_BARCODE_VERIFIED',
        performedBy: 'Station Barcode Gun'
      });
      setScanMessage(`Barcode ${quickScanBarcode} processed at SCANNING station! Transitioned: ${result.entityType}`);
      setQuickScanBarcode('');
      loadAccessions();
    } catch (err: any) {
      setScanError(err.message || 'Unknown barcode');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Grossing & Microtomy Workstation</h1>
            <p className="text-xs text-slate-400">Tissue block cassette grossing, microtomy glass slide sectioning, and rapid staining/scanning</p>
          </div>
        </div>

        {/* Quick Barcode Scanner Gun */}
        <form onSubmit={handleStationBarcodeScan} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1.5 shadow-md">
          <Barcode className="w-4 h-4 text-teal-400 ml-2" />
          <input
            type="text"
            placeholder="Scan Cassette/Slide Barcode..."
            value={quickScanBarcode}
            onChange={(e) => setQuickScanBarcode(e.target.value)}
            className="bg-transparent text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none w-52"
          />
          <button
            type="submit"
            className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded-lg text-xs font-semibold"
          >
            Scan Gun
          </button>
        </form>
      </div>

      {/* Messages */}
      {scanMessage && (
        <div className="p-3 rounded-xl bg-teal-950/70 border border-teal-700 text-teal-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-teal-400" />
            <span>{scanMessage}</span>
          </div>
          <button onClick={() => setScanMessage(null)} className="text-teal-400 font-bold">✕</button>
        </div>
      )}

      {scanError && (
        <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-700 text-rose-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{scanError}</span>
          </div>
          <button onClick={() => setScanError(null)} className="text-rose-400 font-bold">✕</button>
        </div>
      )}

      {/* Workstation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Case Selector Left (3 cols) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <span className="text-xs font-mono font-bold text-slate-400 block uppercase">
            Active Processing Cases
          </span>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {accessions.map((acc) => (
              <div
                key={acc.id}
                onClick={() => handleSelectAccession(acc.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedAccessionId === acc.id
                    ? 'bg-teal-950/60 border-teal-500 shadow-md ring-1 ring-teal-500'
                    : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-brand-400">{acc.accession_number}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                    acc.priority === 'STAT' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {acc.priority}
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-200 truncate mt-1">
                  {acc.patient?.full_name}
                </div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between mt-2">
                  <span>Specimens: {acc.specimens?.length || 0}</span>
                  <span className="text-teal-400 font-mono text-[10px]">
                    Blocks: {acc.specimens?.reduce((sum, s) => sum + s.blocks.length, 0) || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Center / Right Workbench (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {currentAccession ? (
            <>
              {/* Selected Case Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-mono font-extrabold text-white">{currentAccession.accession_number}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      {currentAccession.priority}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Patient: <strong className="text-slate-200">{currentAccession.patient?.full_name}</strong> ({currentAccession.patient?.mrn})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{currentAccession.clinical_history}</p>
                </div>

                <button
                  onClick={() => navigate(`/pathologist?accessionId=${currentAccession.id}`)}
                  className="bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
                >
                  Open in Cockpit <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Station Forms: Grossing Cassette (Left) & Microtomy Slide (Right) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Grossing Station */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Box className="w-4 h-4 text-teal-400" />
                    <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Grossing & Cassette Barcoding</h3>
                  </div>

                  <form onSubmit={handleCreateBlock} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Target Specimen</label>
                      <select
                        value={selectedSpecimenId}
                        onChange={(e) => setSelectedSpecimenId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                      >
                        {currentAccession.specimens?.map((spec) => (
                          <option key={spec.id} value={spec.id}>
                            {spec.tissue_type} ({spec.container_barcode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Block Number</label>
                        <input
                          type="text"
                          value={blockNumber}
                          onChange={(e) => setBlockNumber(e.target.value)}
                          placeholder="e.g. A1, A2, B1"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Grossing Tech</label>
                        <input
                          type="text"
                          value={grossingTech}
                          onChange={(e) => setGrossingTech(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      <Printer className="w-4 h-4" />
                      Print Cassette Barcode & Gross
                    </button>
                  </form>
                </div>

                {/* Microtomy Slide Station */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                    <Layers className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Microtomy & Slide Sectioning</h3>
                  </div>

                  <form onSubmit={handleCreateSlide} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Source Paraffin Block</label>
                      <select
                        value={selectedBlockId}
                        onChange={(e) => setSelectedBlockId(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                      >
                        {currentAccession.specimens?.flatMap((s) => s.blocks).map((b) => (
                          <option key={b.id} value={b.id}>
                            Block {b.block_number} ({b.cassette_barcode}) [{b.embedding_status}]
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">Stain Protocol</label>
                        <select
                          value={stainType}
                          onChange={(e) => setStainType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                        >
                          <option value="H&E">H&E (Routine Diagnostic)</option>
                          <option value="IHC HER2">IHC HER2 (Breast)</option>
                          <option value="IHC ER/PR">IHC ER/PR (Hormone Receptors)</option>
                          <option value="IHC TTF-1">IHC TTF-1 (Lung)</option>
                          <option value="FISH">FISH (Gene Amplification)</option>
                          <option value="PAS">PAS (Special Stain)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Microtomist</label>
                        <input
                          type="text"
                          value={microtomyTech}
                          onChange={(e) => setMicrotomyTech(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md"
                    >
                      <Barcode className="w-4 h-4" />
                      Cut Slide & Generate Barcode
                    </button>
                  </form>
                </div>
              </div>

              {/* Live Staining & Digital Scanning Rack */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-brand-400" />
                    <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                      Slide Staining & Digital Whole-Slide Scanning Rack
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Total Slides: {currentAccession.specimens?.flatMap((s) => s.blocks).flatMap((b) => b.slides).length}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                        <th className="pb-2">Slide ID</th>
                        <th className="pb-2">Stain Type</th>
                        <th className="pb-2">Slide Barcode</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">Workflow Transitions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {currentAccession.specimens?.flatMap((s) => s.blocks).flatMap((b) => b.slides).map((slide) => (
                        <tr key={slide.id} className="hover:bg-slate-850/50 transition-colors">
                          <td className="py-3 font-bold text-slate-200">{slide.slide_number}</td>
                          <td className="py-3">
                            <span className="px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                              {slide.stain_type}
                            </span>
                          </td>
                          <td className="py-3 text-slate-400">{slide.slide_barcode}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                              slide.status === 'SCANNED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : slide.status === 'STAINED'
                                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            }`}>
                              {slide.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {slide.status === 'CUT' && (
                                <button
                                  onClick={() => handleTransitionSlide(slide.id, 'STAINED')}
                                  className="bg-fuchsia-700 hover:bg-fuchsia-600 text-white px-2.5 py-1 rounded text-[11px] font-semibold"
                                >
                                  Mark STAINED
                                </button>
                              )}
                              {(slide.status === 'CUT' || slide.status === 'STAINED') && (
                                <button
                                  onClick={() => handleTransitionSlide(slide.id, 'SCANNED')}
                                  className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1"
                                >
                                  Mark SCANNED (Digital WSI)
                                </button>
                              )}
                              {slide.status === 'SCANNED' && (
                                <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-bold">
                                  <CheckCircle className="w-3.5 h-3.5" /> Ready for Cockpit
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <FlaskConical className="w-12 h-12 mx-auto text-slate-700 mb-3 animate-pulse" />
              <p>Select an accession from the list to begin grossing and microtomy.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
