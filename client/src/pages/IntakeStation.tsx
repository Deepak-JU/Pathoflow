import React, { useState, useEffect } from 'react';
import { limsApi } from '../api/limsApi';
import { useRealTime } from '../context/RealTimeContext';
import { Accession, Patient, PriorityType } from '../types/lims';
import {
  ClipboardPlus,
  UserPlus,
  Barcode,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  Clock,
  FlaskConical,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const IntakeStation: React.FC = () => {
  const { refreshTrigger } = useRealTime();
  const navigate = useNavigate();

  // Patients & Accessions list
  const [accessions, setAccessions] = useState<Accession[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form mode: 'NEW_PATIENT' or 'EXISTING_PATIENT'
  const [patientMode, setPatientMode] = useState<'NEW_PATIENT' | 'EXISTING_PATIENT'>('NEW_PATIENT');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState<string>('');

  // New Patient Form
  const [mrn, setMrn] = useState<string>(`MRN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [fullName, setFullName] = useState<string>('');
  const [dob, setDob] = useState<string>('1985-05-12');
  const [gender, setGender] = useState<string>('FEMALE');
  const [contactInfo, setContactInfo] = useState<string>('');

  // Accession Details
  const [orderingPhysician, setOrderingPhysician] = useState<string>('Dr. Gregory House, Pulmonology');
  const [clinicalHistory, setClinicalHistory] = useState<string>('');
  const [priority, setPriority] = useState<PriorityType>('ROUTINE');
  const [tissueType, setTissueType] = useState<string>('Right Breast Biopsy Core');

  // Creation Feedback
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successResult, setSuccessResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [accList, patList] = await Promise.all([
        limsApi.getAccessions(),
        limsApi.getPatients()
      ]);
      setAccessions(accList);
      setPatients(patList);
      if (patList.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patList[0].id);
      }
    } catch (err: any) {
      console.error('Error loading intake data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleCreateAccession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessResult(null);

    try {
      let patientId = selectedPatientId;

      // Create new patient if in NEW_PATIENT mode
      if (patientMode === 'NEW_PATIENT') {
        if (!fullName.trim() || !mrn.trim()) {
          throw new Error('Patient Full Name and MRN are required');
        }
        const createdPatient = await limsApi.createPatient({
          mrn,
          full_name: fullName,
          dob,
          gender,
          contact_info: contactInfo
        });
        patientId = createdPatient.id;
      }

      if (!patientId) {
        throw new Error('Please select or create a patient');
      }

      const result = await limsApi.createAccession({
        patient_id: patientId,
        ordering_physician: orderingPhysician,
        clinical_history: clinicalHistory,
        priority,
        initial_specimen: tissueType.trim() ? { tissue_type: tissueType } : undefined,
        performed_by: 'Intake Desk Operator'
      });

      setSuccessResult(result);
      // Reset form
      setFullName('');
      setClinicalHistory('');
      setTissueType('Surgical Tissue Specimen');
      setMrn(`MRN-${Math.floor(100000 + Math.random() * 900000)}`);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create accession');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Station Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <ClipboardPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">Specimen Intake & Accessioning Workstation</h1>
            <p className="text-xs text-slate-400">Fast patient case registration, automated barcoding, and initial specimen custody logging</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
            Active Cases: <strong className="text-brand-400">{accessions.length}</strong>
          </span>
        </div>
      </div>

      {/* Main Grid: Form on left, Recent Accessions list on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brand-400" />
              New Accession Order Intake
            </h2>

            {/* Mode Toggle */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setPatientMode('NEW_PATIENT')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  patientMode === 'NEW_PATIENT' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                New Patient
              </button>
              <button
                type="button"
                onClick={() => setPatientMode('EXISTING_PATIENT')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  patientMode === 'EXISTING_PATIENT' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Existing Patient
              </button>
            </div>
          </div>

          <form onSubmit={handleCreateAccession} className="space-y-4 text-xs">
            {/* Patient Section */}
            {patientMode === 'NEW_PATIENT' ? (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <span className="text-[11px] font-mono font-bold text-brand-400 block">PATIENT DEMOGRAPHICS</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">MRN (Medical Record No.) *</label>
                    <input
                      type="text"
                      required
                      value={mrn}
                      onChange={(e) => setMrn(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="FEMALE">Female</option>
                      <option value="MALE">Male</option>
                      <option value="OTHER">Other / Non-binary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Contact Info</label>
                    <input
                      type="text"
                      placeholder="Phone or email"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <label className="block text-slate-400 mb-1">Select Registered Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none text-xs font-mono"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn}) - {p.gender}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Case Order Specifics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Ordering Physician *</label>
                <input
                  type="text"
                  required
                  value={orderingPhysician}
                  onChange={(e) => setOrderingPhysician(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Priority Classification *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ROUTINE', 'URGENT', 'STAT'] as PriorityType[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 rounded-lg font-mono font-bold text-center border transition-all ${
                        priority === p
                          ? p === 'STAT'
                            ? 'bg-rose-600 text-white border-rose-500 ring-2 ring-rose-500/40'
                            : p === 'URGENT'
                            ? 'bg-amber-600 text-white border-amber-500 ring-2 ring-amber-500/40'
                            : 'bg-brand-600 text-white border-brand-500 ring-2 ring-brand-500/40'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Clinical History & Pre-Op Diagnosis</label>
              <textarea
                rows={2}
                placeholder="Clinical indications, prior biopsy history, radiographic findings..."
                value={clinicalHistory}
                onChange={(e) => setClinicalHistory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* Initial Specimen Container */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2 text-brand-400 font-mono text-[11px] font-bold">
                <FlaskConical className="w-3.5 h-3.5" />
                INITIAL SPECIMEN CONTAINER
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Tissue / Specimen Type</label>
                <input
                  type="text"
                  value={tissueType}
                  onChange={(e) => setTissueType(e.target.value)}
                  placeholder="e.g. Left Breast Lumpectomy, Skin Punch Biopsy..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Error & Success alerts */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successResult && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-100 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Accession Order Created Successfully!
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/grossing-microtomy?accessionId=${successResult.accession.id}`)}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    Proceed to Grossing <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-emerald-900/40 p-2.5 rounded-lg border border-emerald-800">
                  <div>Accession: <strong className="text-white">{successResult.accession.accession_number}</strong></div>
                  <div>Priority: <strong className="text-amber-300">{successResult.accession.priority}</strong></div>
                  {successResult.specimen && (
                    <div className="col-span-2 flex items-center gap-2">
                      <Barcode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Barcode: <strong>{successResult.specimen.container_barcode}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 text-sm transition-all"
            >
              <Barcode className="w-4 h-4" />
              {submitting ? 'Generating Barcodes & Intake...' : 'Create Accession & Print Labels'}
            </button>
          </form>
        </div>

        {/* Right Pane: Live Accession Intake Queue (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <h3 className="font-semibold text-sm text-slate-100">Intake Queue</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">{accessions.length} Recent Cases</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[560px] pr-1">
            {accessions.map((acc) => (
              <div
                key={acc.id}
                onClick={() => navigate(`/lineage?query=${acc.accession_number}`)}
                className="p-3.5 rounded-xl bg-slate-850/80 hover:bg-slate-850 border border-slate-800 hover:border-brand-500/50 cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-brand-400">{acc.accession_number}</span>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        acc.priority === 'STAT'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                          : acc.priority === 'URGENT'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {acc.priority}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-slate-200 mt-1">
                      {acc.patient?.full_name} <span className="font-mono text-slate-400 text-[11px]">({acc.patient?.mrn})</span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    acc.status === 'SIGNED_OFF'
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-indigo-950/60 border-indigo-800 text-indigo-300'
                  }`}>
                    {acc.status}
                  </span>
                </div>

                <div className="mt-2 text-[11px] text-slate-400 truncate">
                  {acc.ordering_physician}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Specimens: {acc.specimens?.length || 0}</span>
                  <span className="group-hover:text-brand-400 flex items-center gap-1 font-medium transition-colors">
                    Lineage & Custody <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
