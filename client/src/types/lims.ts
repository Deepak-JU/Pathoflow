export type PriorityType = 'ROUTINE' | 'URGENT' | 'STAT';
export type AccessionStatus = 'RECEIVED' | 'IN_PROCESSING' | 'DIAGNOSED' | 'SIGNED_OFF';
export type SlideStatus = 'CUT' | 'STAINED' | 'SCANNED' | 'ARCHIVED';
export type EmbeddingStatus = 'PENDING' | 'EMBEDDED' | 'SECTIONED';
export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type AlertType = 'TAT_BREACH' | 'MISSING_SLIDE' | 'CRITICAL_DIAGNOSIS' | 'UNKNOWN_BARCODE';
export type StationType = 'INTAKE' | 'EMBEDDING' | 'MICROTOMY' | 'STAINING' | 'SCANNING' | 'PATHOLOGY';

export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  dob: string;
  gender: string;
  contact_info: string;
  created_at: string;
  _count?: { accessions: number };
}

export interface Slide {
  id: string;
  block_id: string;
  slide_number: string;
  stain_type: string;
  slide_barcode: string;
  status: SlideStatus;
  created_at: string;
}

export interface Block {
  id: string;
  specimen_id: string;
  block_number: string;
  cassette_barcode: string;
  embedding_status: EmbeddingStatus;
  created_at: string;
  slides: Slide[];
}

export interface Specimen {
  id: string;
  accession_id: string;
  tissue_type: string;
  container_barcode: string;
  collected_at: string;
  status: string;
  blocks: Block[];
}

export interface Report {
  id: string;
  accession_id: string;
  pathologist_id: string;
  microscopic_description: string;
  diagnosis_code: string;
  impression: string;
  is_signed_off: boolean;
  signed_off_at: string | null;
  created_at: string;
}

export interface QA_Alert {
  id: string;
  accession_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  description: string;
  is_resolved: boolean;
  resolved_by: string | null;
  created_at: string;
  accession?: {
    accession_number: string;
    priority: PriorityType;
    patient?: Patient;
  };
}

export interface ChainOfCustodyLog {
  id: string;
  entity_type: 'SPECIMEN' | 'BLOCK' | 'SLIDE' | 'ACCESSION';
  entity_id: string;
  station: StationType;
  action: string;
  performed_by: string;
  timestamp: string;
  metadata?: string | null;
}

export interface Accession {
  id: string;
  accession_number: string;
  patient_id: string;
  ordering_physician: string;
  clinical_history: string;
  priority: PriorityType;
  status: AccessionStatus;
  created_at: string;
  patient: Patient;
  specimens: Specimen[];
  reports: Report[];
  qa_alerts: QA_Alert[];
}

export interface LineageTreeNode {
  id: string;
  type: 'ACCESSION' | 'SPECIMEN' | 'BLOCK' | 'SLIDE';
  label: string;
  barcode?: string;
  status: string;
  details: Record<string, any>;
  children?: LineageTreeNode[];
}

export interface LineageResponse {
  accession: Accession;
  tree: LineageTreeNode;
  custodyLogs: ChainOfCustodyLog[];
}

export interface BarcodeResolutionResponse {
  entityType: 'ACCESSION' | 'SPECIMEN' | 'BLOCK' | 'SLIDE';
  entity: any;
  accessionId: string;
  lineage: LineageResponse;
}

export interface QAStatsResponse {
  accessions: {
    total: number;
    inProcessing: number;
    statCases: number;
    signedOffToday: number;
  };
  alerts: {
    active: {
      CRITICAL: number;
      HIGH: number;
      MEDIUM: number;
      LOW: number;
      TOTAL: number;
    };
    tatBreaches: number;
    missingSlideBlockers: number;
    criticalDiagnoses: number;
  };
  workstationQueues: {
    intakeGrossing: { total: number; waitingGrossing: number };
    embedding: { total: number; pendingEmbedding: number };
    microtomy: { cutSlides: number };
    staining: { stainedSlides: number };
    scanning: { scannedSlides: number };
  };
}
