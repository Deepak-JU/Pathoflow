import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { limsApi } from '../api/limsApi';
import { useRealTime } from '../context/RealTimeContext';
import { Accession, LineageResponse, Slide, Report, LineageTreeNode } from '../types/lims';
import { LineageTree } from '../components/LineageTree';
import { SlideViewerMock } from '../components/SlideViewerMock';
import { QABadge } from '../components/QABadge';
import {
  Microscope,
  FileCheck,
  AlertTriangle,
  Lock,
  CheckCircle,
  Save,
  Send,
  UserCheck,
  Sparkles,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';

export const PathologistCockpit: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshTrigger } = useRealTime();

  const [accessions, setAccessions] = useState<Accession[]>([]);
  const [selectedAccessionId, setSelectedAccessionId] = useState<string>('');
  const [lineageData, setLineageData] = useState<LineageResponse | null>(null);
  const [selectedSlide, setSelectedSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Diagnostic Report Form
  const [pathologistId, setPathologistId] = useState<string>('PATH-DR-KIM (Lic #MD-90412)');
  const [diagnosisCode, setDiagnosisCode] = useState<string>('ICD-O 8140/3 (Invasive Adenocarcinoma)');
  const [microscopicDesc, setMicroscopicDesc] = useState<string>(
    'Sections demonstrate cellular tissue with prominent nuclear atypia, loss of cell polarity, and atypical mitotic figures invading the surrounding stroma.'
  );
  const [impression, setImpression] = useState<string>(
    'Malignant neoplasm consistent with High-grade carcinoma. Margins are positive for invasive disease.'
  );

  // Sign-off modal state
  const [isSignOffModalOpen, setIsSignOffModalOpen] = useState<boolean>(false);
  const [signingOff, setSigningOff] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [qaBlockDetails, setQaBlockDetails] = useState<any | null>(null);

  // Check if critical keywords are present in live draft text
  const criticalKeywords = ['malignant', 'high-grade carcinoma', 'carcinoma', 'adenocarcinoma', 'melanoma', 'metastatic', 'sarcoma'];
  const hasCriticalKeyword = criticalKeywords.some(keyword =>
    `${impression} ${microscopicDesc}`.toLowerCase().includes(keyword)
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const accList = await limsApi.getAccessions();
      setAccessions(accList);

      const targetId = searchParams.get('accessionId') || selectedAccessionId || accList[0]?.id;
      if (targetId) {
        setSelectedAccessionId(targetId);
        const data = await limsApi.getLineage(targetId);
        setLineageData(data);

        // Auto-select first scanned slide
        const allSlides: Slide[] = [];
        data.accession.specimens?.forEach(s => s.blocks?.forEach(b => b.slides?.forEach(sl => allSlides.push(sl))));
        const scanned = allSlides.find(s => s.status === 'SCANNED') || allSlides[0] || null;
        setSelectedSlide(scanned);

        // Load existing report if present
        const existingReport = await limsApi.getReport(targetId);
        if (existingReport) {
          setPathologistId(existingReport.pathologist_id);
          setDiagnosisCode(existingReport.diagnosis_code);
          setMicroscopicDesc(existingReport.microscopic_description);
          setImpression(existingReport.impression);
        }
      }
    } catch (err: any) {
      console.error('Error loading cockpit data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger, searchParams]);

  const handleSelectAccession = async (id: string) => {
    setSelectedAccessionId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setQaBlockDetails(null);
    const data = await limsApi.getLineage(id);
    setLineageData(data);

    const allSlides: Slide[] = [];
    data.accession.specimens?.forEach(s => s.blocks?.forEach(b => b.slides?.forEach(sl => allSlides.push(sl))));
    setSelectedSlide(allSlides[0] || null);

    const existingReport = await limsApi.getReport(id);
    if (existingReport) {
      setPathologistId(existingReport.pathologist_id);
      setDiagnosisCode(existingReport.diagnosis_code);
      setMicroscopicDesc(existingReport.microscopic_description);
      setImpression(existingReport.impression);
    }
  };

  const handleSelectTreeNode = (node: LineageTreeNode) => {
    if (node.type === 'SLIDE') {
      // Find full slide object from accession
      let found: Slide | null = null;
      lineageData?.accession.specimens?.forEach(s => {
        s.blocks?.forEach(b => {
          b.slides?.forEach(sl => {
            if (sl.id === node.id) found = sl;
          });
        });
      });
      if (found) setSelectedSlide(found);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedAccessionId) return;
    try {
      setErrorMessage(null);
      await limsApi.saveDraftReport({
        accession_id: selectedAccessionId,
        pathologist_id: pathologistId,
        microscopic_description: microscopicDesc,
        diagnosis_code: diagnosisCode,
        impression
      });
      setSuccessMessage('Diagnostic draft saved successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save draft');
    }
  };

  // Diagnostic Sign-off (Evaluates QA Rules)
  const handleConfirmSignOff = async () => {
    if (!selectedAccessionId) return;
    setSigningOff(true);
    setErrorMessage(null);
    setQaBlockDetails(null);

    try {
      const res = await limsApi.signOffReport({
        accession_id: selectedAccessionId,
        pathologist_id: pathologistId,
        microscopic_description: microscopicDesc,
        diagnosis_code: diagnosisCode,
        impression
      });

      setIsSignOffModalOpen(false);
      setSuccessMessage(res.message);
      loadData();
    } catch (err: any) {
      if (err.details && err.details.code === 'MISSING_SLIDES_QA_BLOCK') {
        setQaBlockDetails(err.details);
      } else {
        setErrorMessage(err.message || 'Diagnostic sign-off failed');
      }
    } finally {
      setSigningOff(false);
    }
  };

  const currentAcc = lineageData?.accession;

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1700px] mx-auto">
      {/* Top Cockpit Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Microscope className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Pathologist Diagnostic Cockpit
              {currentAcc?.status === 'SIGNED_OFF' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> SIGNED OFF
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">Integrated patient history, digital slide inspection, and proactive QA sign-off authentication</p>
          </div>
        </div>

        {/* Case Switcher Quick Dropdown */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-slate-400">CASE:</label>
          <select
            value={selectedAccessionId}
            onChange={(e) => handleSelectAccession(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-brand-500 focus:outline-none"
          >
            {accessions.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.accession_number} - {acc.patient?.full_name} ({acc.priority}) [{acc.status}]
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main 3-Pane Split Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Pane: Patient Case, Hierarchy Lineage, QA Alerts (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {currentAcc ? (
            <>
              {/* Patient Case Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-slate-100">{currentAcc.patient?.full_name}</h2>
                    <span className="text-xs font-mono text-brand-400">{currentAcc.patient?.mrn}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    currentAcc.priority === 'STAT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : currentAcc.priority === 'URGENT'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {currentAcc.priority}
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div>Ordering MD: <strong className="text-slate-100">{currentAcc.ordering_physician}</strong></div>
                  <div>Clinical Indication: <p className="text-slate-400 mt-0.5 leading-relaxed">{currentAcc.clinical_history}</p></div>
                </div>

                {/* Active QA Alerts on this Case */}
                {currentAcc.qa_alerts && currentAcc.qa_alerts.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                      Active QA Alerts ({currentAcc.qa_alerts.length})
                    </span>
                    {currentAcc.qa_alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-2 rounded-lg text-[11px] border font-mono ${
                          alert.severity === 'CRITICAL'
                            ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                            : alert.severity === 'HIGH'
                            ? 'bg-amber-950/80 border-amber-600 text-amber-200'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-1 font-bold">
                          <AlertTriangle className="w-3 h-3 text-current" />
                          <span>{alert.alert_type}</span>
                        </div>
                        <p className="mt-1 font-sans text-[11px] opacity-90">{alert.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hierarchical Lineage Tree */}
              {lineageData?.tree && (
                <LineageTree
                  tree={lineageData.tree}
                  selectedId={selectedSlide?.id}
                  onSelectNode={handleSelectTreeNode}
                />
              )}
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              Loading Case...
            </div>
          )}
        </div>

        {/* Center Pane: High-Resolution Digital Slide Viewer (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <SlideViewerMock
            slide={selectedSlide}
            patientName={currentAcc?.patient?.full_name}
            mrn={currentAcc?.patient?.mrn}
            accessionNumber={currentAcc?.accession_number}
          />
        </div>

        {/* Right Pane: Diagnostic Report Editor & Sign-off Engine (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-brand-400" />
                <h3 className="font-bold text-xs text-slate-100 uppercase tracking-wider">
                  Pathology Diagnostic Report
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">ICD-O / SNOMED CT</span>
            </div>

            {/* QA Missing Asset Alert Warning (Rule 2 Block) */}
            {qaBlockDetails && (
              <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-600 text-rose-200 text-xs space-y-2 animate-shake">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>QA Enforcement Block: Missing Assets!</span>
                </div>
                <p className="text-[11px] leading-relaxed text-rose-200">{qaBlockDetails.reason}</p>
                <div className="pt-1">
                  <button
                    onClick={() => navigate(`/grossing-microtomy?accessionId=${selectedAccessionId}`)}
                    className="bg-rose-800 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[11px] font-semibold"
                  >
                    Go to Scanning Station to complete WSI
                  </button>
                </div>
              </div>
            )}

            {/* Critical Diagnosis Warning banner (Rule 3 Preview) */}
            {hasCriticalKeyword && (
              <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/80 text-amber-200 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-amber-300">CRITICAL VALUE TRIGGER DETECTED</strong>
                  <p className="text-[11px] text-amber-200/90 mt-0.5">
                    High-risk diagnostic terms identified. Signing off this report will auto-trigger a CRITICAL alert and dispatch priority escalation to Dr. {currentAcc?.ordering_physician}.
                  </p>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Pathologist Electronic Signature Credential</label>
                <input
                  type="text"
                  disabled={currentAcc?.status === 'SIGNED_OFF'}
                  value={pathologistId}
                  onChange={(e) => setPathologistId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Diagnostic Code (ICD-O / SNOMED CT)</label>
                <select
                  disabled={currentAcc?.status === 'SIGNED_OFF'}
                  value={diagnosisCode}
                  onChange={(e) => setDiagnosisCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-brand-500 focus:outline-none"
                >
                  <option value="ICD-O 8140/3 (Invasive Adenocarcinoma)">ICD-O 8140/3 (Invasive Adenocarcinoma)</option>
                  <option value="ICD-O 8260/3 (Papillary Thyroid Carcinoma)">ICD-O 8260/3 (Papillary Thyroid Carcinoma)</option>
                  <option value="ICD-O 8500/3 (Infiltrating Ductal Carcinoma, High-Grade)">ICD-O 8500/3 (Infiltrating Ductal Carcinoma, High-Grade)</option>
                  <option value="ICD-O 8720/3 (Malignant Melanoma)">ICD-O 8720/3 (Malignant Melanoma)</option>
                  <option value="SNOMED M-00100 (Normal Tissue / Benign Architecture)">SNOMED M-00100 (Normal Tissue / Benign Architecture)</option>
                  <option value="SNOMED M-72000 (Severe Dysplasia / Atypical Hyperplasia)">SNOMED M-72000 (Severe Dysplasia / Atypical Hyperplasia)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Microscopic Description</label>
                <textarea
                  rows={3}
                  disabled={currentAcc?.status === 'SIGNED_OFF'}
                  value={microscopicDesc}
                  onChange={(e) => setMicroscopicDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Final Diagnostic Impression</label>
                <textarea
                  rows={3}
                  disabled={currentAcc?.status === 'SIGNED_OFF'}
                  value={impression}
                  onChange={(e) => setImpression(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Error or Success notification */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs">
                {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            {currentAcc?.status === 'SIGNED_OFF' ? (
              <div className="p-3 rounded-xl bg-slate-850 border border-emerald-800 text-emerald-300 text-xs flex items-center justify-center gap-2 font-mono font-bold">
                <Lock className="w-4 h-4 text-emerald-400" />
                REPORT SIGNED-OFF & LOCKED
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignOffModalOpen(true)}
                  className="flex-1 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold py-2.5 rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-1.5 transition-all"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  Sign-Off Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sign-Off Authentication Modal */}
      {isSignOffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Pathologist Diagnostic Sign-Off</h3>
                <p className="text-xs text-slate-400">Electronic signature authentication</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono space-y-1 text-slate-300">
              <div>Case: <strong className="text-white">{currentAcc?.accession_number}</strong></div>
              <div>Signer: <strong className="text-brand-400">{pathologistId}</strong></div>
              <div>Code: {diagnosisCode}</div>
            </div>

            {hasCriticalKeyword && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-600 text-rose-200 text-xs">
                🚨 <strong>Critical Value Notice:</strong> High-risk malignant finding detected. Auto-escalation will notify Dr. {currentAcc?.ordering_physician}.
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed">
              By confirming, you certify that all microscopic slides have been examined and verify the clinical diagnosis. This action is permanently logged to the immutable Chain of Custody.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSignOffModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2 px-3 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={signingOff}
                onClick={handleConfirmSignOff}
                className="flex-1 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md shadow-brand-600/30"
              >
                {signingOff ? 'Verifying QA Rules...' : 'Confirm Electronic Signature'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
