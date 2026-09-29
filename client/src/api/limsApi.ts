import {
  Accession,
  Patient,
  Specimen,
  Block,
  Slide,
  Report,
  QA_Alert,
  LineageResponse,
  BarcodeResolutionResponse,
  QAStatsResponse,
  ChainOfCustodyLog
} from '../types/lims';

const BASE_URL = '/api';

export const limsApi = {
  // Patients
  async getPatients(search?: string): Promise<Patient[]> {
    const url = search ? `${BASE_URL}/patients?search=${encodeURIComponent(search)}` : `${BASE_URL}/patients`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch patients');
    return res.json();
  },

  async createPatient(data: { mrn: string; full_name: string; dob: string; gender: string; contact_info?: string }): Promise<Patient> {
    const res = await fetch(`${BASE_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create patient');
    }
    return res.json();
  },

  // Accessions
  async getAccessions(filters?: { status?: string; priority?: string; search?: string }): Promise<Accession[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.search) params.append('search', filters.search);
    const res = await fetch(`${BASE_URL}/accessions?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch accessions');
    return res.json();
  },

  async getAccession(id: string): Promise<Accession> {
    const res = await fetch(`${BASE_URL}/accessions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch accession');
    return res.json();
  },

  async createAccession(data: {
    patient_id: string;
    ordering_physician: string;
    clinical_history: string;
    priority: string;
    initial_specimen?: { tissue_type: string; collected_at?: string };
    performed_by?: string;
  }): Promise<{ accession: Accession; specimen?: Specimen }> {
    const res = await fetch(`${BASE_URL}/accessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create accession');
    }
    return res.json();
  },

  // Specimens & Blocks & Slides
  async createSpecimen(data: { accession_id: string; tissue_type: string; container_barcode?: string; performed_by?: string }): Promise<Specimen> {
    const res = await fetch(`${BASE_URL}/specimens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create specimen');
    }
    return res.json();
  },

  async createBlock(data: { specimen_id: string; block_number?: string; cassette_barcode?: string; performed_by?: string }): Promise<Block> {
    const res = await fetch(`${BASE_URL}/blocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create block');
    }
    return res.json();
  },

  async createSlide(data: { block_id: string; slide_number?: string; stain_type: string; performed_by?: string }): Promise<Slide> {
    const res = await fetch(`${BASE_URL}/slides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create slide');
    }
    return res.json();
  },

  async updateSlideStatus(id: string, status: string, performed_by?: string): Promise<Slide> {
    const res = await fetch(`${BASE_URL}/slides/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, performed_by })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update slide status');
    }
    return res.json();
  },

  // Workstation Rapid Actions
  async scanAction(data: { barcode: string; station: string; action?: string; performedBy?: string }) {
    const res = await fetch(`${BASE_URL}/stations/scan-action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Barcode scan failed');
    }
    return res.json();
  },

  // Lineage & Barcode Scanner
  async getLineage(idOrNumber: string): Promise<LineageResponse> {
    const res = await fetch(`${BASE_URL}/lineage/accession/${idOrNumber}`);
    if (!res.ok) throw new Error('Failed to fetch lineage tree');
    return res.json();
  },

  async resolveBarcode(barcode: string): Promise<BarcodeResolutionResponse> {
    const res = await fetch(`${BASE_URL}/lineage/barcode/${encodeURIComponent(barcode)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Barcode '${barcode}' not found`);
    }
    return res.json();
  },

  async getCustodyLogs(limit?: number): Promise<ChainOfCustodyLog[]> {
    const res = await fetch(`${BASE_URL}/lineage/custody-logs?limit=${limit || 50}`);
    if (!res.ok) throw new Error('Failed to fetch custody logs');
    return res.json();
  },

  // Reports & QA
  async getReport(accessionId: string): Promise<Report | null> {
    const res = await fetch(`${BASE_URL}/reports/accession/${accessionId}`);
    if (!res.ok) return null;
    return res.json();
  },

  async saveDraftReport(data: {
    accession_id: string;
    pathologist_id: string;
    microscopic_description: string;
    diagnosis_code: string;
    impression: string;
  }): Promise<{ success: boolean; report: Report }> {
    const res = await fetch(`${BASE_URL}/reports/save-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save report draft');
    }
    return res.json();
  },

  async signOffReport(data: {
    accession_id: string;
    pathologist_id: string;
    microscopic_description: string;
    diagnosis_code: string;
    impression: string;
  }): Promise<{ success: boolean; report: Report; criticalEscalation?: any; message: string }> {
    const res = await fetch(`${BASE_URL}/reports/sign-off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      const customErr: any = new Error(err.reason || err.error || 'Failed to sign off report');
      customErr.details = err;
      throw customErr;
    }
    return res.json();
  },

  // QA Alerts & Dashboard
  async getAlerts(filters?: { status?: string; severity?: string; alert_type?: string }): Promise<QA_Alert[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.alert_type) params.append('alert_type', filters.alert_type);
    const res = await fetch(`${BASE_URL}/qa/alerts?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch QA alerts');
    return res.json();
  },

  async resolveAlert(id: string, resolvedBy: string, resolutionNote?: string): Promise<QA_Alert> {
    const res = await fetch(`${BASE_URL}/qa/alerts/${id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved_by: resolvedBy, resolution_note: resolutionNote })
    });
    if (!res.ok) throw new Error('Failed to resolve alert');
    return res.json();
  },

  async runQAWorker(thresholdHours?: number): Promise<{ success: boolean; message: string; newAlerts: QA_Alert[] }> {
    const res = await fetch(`${BASE_URL}/qa/run-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thresholdHours })
    });
    if (!res.ok) throw new Error('Failed to run QA worker');
    return res.json();
  },

  async getQAStats(): Promise<QAStatsResponse> {
    const res = await fetch(`${BASE_URL}/qa/stats`);
    if (!res.ok) throw new Error('Failed to fetch QA stats');
    return res.json();
  }
};
