import { prisma } from './client';
import { ChainOfCustodyEngine } from '../engine/cocEngine';

export async function seedDatabase() {
  console.log('🌱 Seeding PathoFlow LIMS database...');

  // Clean existing data
  await prisma.qA_Alert.deleteMany();
  await prisma.report.deleteMany();
  await prisma.chainOfCustodyLog.deleteMany();
  await prisma.slide.deleteMany();
  await prisma.block.deleteMany();
  await prisma.specimen.deleteMany();
  await prisma.accession.deleteMany();
  await prisma.patient.deleteMany();

  // 1. Patients
  const patient1 = await prisma.patient.create({
    data: {
      mrn: 'MRN-884102',
      full_name: 'Eleanor Vance',
      dob: new Date('1972-04-15'),
      gender: 'FEMALE',
      contact_info: '+1 (555) 234-5678, evance@example.com'
    }
  });

  const patient2 = await prisma.patient.create({
    data: {
      mrn: 'MRN-912044',
      full_name: 'Arthur Pendelton',
      dob: new Date('1958-11-20'),
      gender: 'MALE',
      contact_info: '+1 (555) 876-5432, arthur.p@example.com'
    }
  });

  const patient3 = await prisma.patient.create({
    data: {
      mrn: 'MRN-551930',
      full_name: 'Sophia Martinez',
      dob: new Date('1990-08-03'),
      gender: 'FEMALE',
      contact_info: '+1 (555) 345-9812, smartinez@example.com'
    }
  });

  const patient4 = await prisma.patient.create({
    data: {
      mrn: 'MRN-723019',
      full_name: 'Marcus Thorne',
      dob: new Date('1965-02-18'),
      gender: 'MALE',
      contact_info: '+1 (555) 678-1234, mthorne@example.com'
    }
  });

  // 2. Case 1: ACC-2026-0001 (STAT - Ready for Pathologist Review, Fully Scanned)
  const acc1 = await prisma.accession.create({
    data: {
      accession_number: 'ACC-2026-0001',
      patient_id: patient2.id,
      ordering_physician: 'Dr. Gregory House, Pulmonology',
      clinical_history: '64yo male with 3.2cm RUL lung mass on CT, persistent hemoptysis. Rule out primary bronchogenic carcinoma.',
      priority: 'STAT',
      status: 'IN_PROCESSING',
      created_at: new Date(Date.now() - 3 * 3600 * 1000) // 3 hours ago
    }
  });

  const spec1 = await prisma.specimen.create({
    data: {
      accession_id: acc1.id,
      tissue_type: 'Right Upper Lobe Lung Core Biopsy',
      container_barcode: 'SPEC-2026-0001',
      collected_at: new Date(Date.now() - 4 * 3600 * 1000),
      status: 'GROSSED'
    }
  });

  const block1 = await prisma.block.create({
    data: {
      specimen_id: spec1.id,
      block_number: 'A1',
      cassette_barcode: 'CAS-2026-0001-A1',
      embedding_status: 'EMBEDDED'
    }
  });

  const slide1_1 = await prisma.slide.create({
    data: {
      block_id: block1.id,
      slide_number: 'A1-1',
      stain_type: 'H&E',
      slide_barcode: 'SLD-2026-0001-A1-1',
      status: 'SCANNED'
    }
  });

  const slide1_2 = await prisma.slide.create({
    data: {
      block_id: block1.id,
      slide_number: 'A1-2',
      stain_type: 'IHC TTF-1',
      slide_barcode: 'SLD-2026-0001-A1-2',
      status: 'SCANNED'
    }
  });

  // Chain of Custody for Case 1
  await ChainOfCustodyEngine.recordEvent({
    entityType: 'SPECIMEN',
    entityId: spec1.id,
    station: 'INTAKE',
    action: 'RECEIVED',
    performedBy: 'Tech. Sarah Jenkins',
    accessionId: acc1.id
  });

  await ChainOfCustodyEngine.recordEvent({
    entityType: 'BLOCK',
    entityId: block1.id,
    station: 'EMBEDDING',
    action: 'EMBEDDED',
    performedBy: 'Histotech. David Miller',
    accessionId: acc1.id
  });

  await ChainOfCustodyEngine.recordEvent({
    entityType: 'SLIDE',
    entityId: slide1_1.id,
    station: 'SCANNING',
    action: 'SCANNED',
    performedBy: 'Digital Path Tech. Alex Rivera',
    accessionId: acc1.id
  });

  await ChainOfCustodyEngine.recordEvent({
    entityType: 'SLIDE',
    entityId: slide1_2.id,
    station: 'SCANNING',
    action: 'SCANNED',
    performedBy: 'Digital Path Tech. Alex Rivera',
    accessionId: acc1.id
  });

  // 3. Case 2: ACC-2026-0002 (URGENT - Has Unscanned Slide -> Missing Asset check trigger)
  const acc2 = await prisma.accession.create({
    data: {
      accession_number: 'ACC-2026-0002',
      patient_id: patient1.id,
      ordering_physician: 'Dr. Meredith Grey, Surgical Oncology',
      clinical_history: '48yo female with palpable left breast upper outer quadrant mass. Segmental resection.',
      priority: 'URGENT',
      status: 'IN_PROCESSING',
      created_at: new Date(Date.now() - 2 * 3600 * 1000)
    }
  });

  const spec2 = await prisma.specimen.create({
    data: {
      accession_id: acc2.id,
      tissue_type: 'Left Breast Lumpectomy',
      container_barcode: 'SPEC-2026-0002',
      collected_at: new Date(Date.now() - 3 * 3600 * 1000),
      status: 'GROSSED'
    }
  });

  const block2_A1 = await prisma.block.create({
    data: {
      specimen_id: spec2.id,
      block_number: 'A1',
      cassette_barcode: 'CAS-2026-0002-A1',
      embedding_status: 'EMBEDDED'
    }
  });

  const block2_A2 = await prisma.block.create({
    data: {
      specimen_id: spec2.id,
      block_number: 'A2',
      cassette_barcode: 'CAS-2026-0002-A2',
      embedding_status: 'EMBEDDED'
    }
  });

  await prisma.slide.create({
    data: {
      block_id: block2_A1.id,
      slide_number: 'A1-1',
      stain_type: 'H&E',
      slide_barcode: 'SLD-2026-0002-A1-1',
      status: 'SCANNED'
    }
  });

  // This slide is only STAINED, not SCANNED yet!
  await prisma.slide.create({
    data: {
      block_id: block2_A2.id,
      slide_number: 'A2-1',
      stain_type: 'IHC HER2',
      slide_barcode: 'SLD-2026-0002-A2-1',
      status: 'STAINED'
    }
  });

  await ChainOfCustodyEngine.recordEvent({
    entityType: 'SPECIMEN',
    entityId: spec2.id,
    station: 'INTAKE',
    action: 'RECEIVED',
    performedBy: 'Tech. Sarah Jenkins',
    accessionId: acc2.id
  });

  // 4. Case 3: ACC-2026-0003 (ROUTINE - Skin Punch Biopsy, In Microtomy)
  const acc3 = await prisma.accession.create({
    data: {
      accession_number: 'ACC-2026-0003',
      patient_id: patient3.id,
      ordering_physician: 'Dr. John Watson, Dermatology',
      clinical_history: '35yo female with changing pigmented macule on right forearm. Rule out dysplastic nevus.',
      priority: 'ROUTINE',
      status: 'IN_PROCESSING',
      created_at: new Date(Date.now() - 1 * 3600 * 1000)
    }
  });

  const spec3 = await prisma.specimen.create({
    data: {
      accession_id: acc3.id,
      tissue_type: 'Skin Punch Biopsy (Forearm)',
      container_barcode: 'SPEC-2026-0003',
      collected_at: new Date(Date.now() - 2 * 3600 * 1000),
      status: 'IN_PROCESSING'
    }
  });

  const block3 = await prisma.block.create({
    data: {
      specimen_id: spec3.id,
      block_number: 'A1',
      cassette_barcode: 'CAS-2026-0003-A1',
      embedding_status: 'PENDING'
    }
  });

  await prisma.slide.create({
    data: {
      block_id: block3.id,
      slide_number: 'A1-1',
      stain_type: 'H&E',
      slide_barcode: 'SLD-2026-0003-A1-1',
      status: 'CUT'
    }
  });

  // 5. Case 4: ACC-2026-0004 (STAT/URGENT - In Processing for 6 hours without slides -> TAT Breach!)
  const acc4 = await prisma.accession.create({
    data: {
      accession_number: 'ACC-2026-0004',
      patient_id: patient4.id,
      ordering_physician: 'Dr. Robert Chase, Nephrology',
      clinical_history: 'Rapidly progressive glomerulonephritis with acute renal failure. STAT renal cortex biopsy.',
      priority: 'STAT',
      status: 'IN_PROCESSING',
      created_at: new Date(Date.now() - 6.5 * 3600 * 1000) // 6.5 hours ago!
    }
  });

  const spec4 = await prisma.specimen.create({
    data: {
      accession_id: acc4.id,
      tissue_type: 'Renal Needle Core Biopsy',
      container_barcode: 'SPEC-2026-0004',
      collected_at: new Date(Date.now() - 7 * 3600 * 1000),
      status: 'RECEIVED'
    }
  });

  // Initial QA Alert for Case 4 (TAT breach)
  await prisma.qA_Alert.create({
    data: {
      accession_id: acc4.id,
      alert_type: 'TAT_BREACH',
      severity: 'HIGH',
      description: 'TAT BREACH: Priority STAT accession ACC-2026-0004 has been in processing for >6 hours without slide creation.',
      is_resolved: false
    }
  });

  // 6. Case 5: ACC-2026-0005 (SIGNED_OFF with Critical Value recorded)
  const acc5 = await prisma.accession.create({
    data: {
      accession_number: 'ACC-2026-0005',
      patient_id: patient1.id,
      ordering_physician: 'Dr. Allison Cameron, Oncology',
      clinical_history: 'Follow-up thyroid FNA, suspicious nodule.',
      priority: 'URGENT',
      status: 'SIGNED_OFF',
      created_at: new Date(Date.now() - 24 * 3600 * 1000)
    }
  });

  const spec5 = await prisma.specimen.create({
    data: {
      accession_id: acc5.id,
      tissue_type: 'Thyroid FNA Cell Block',
      container_barcode: 'SPEC-2026-0005',
      collected_at: new Date(Date.now() - 25 * 3600 * 1000),
      status: 'COMPLETED'
    }
  });

  const block5 = await prisma.block.create({
    data: {
      specimen_id: spec5.id,
      block_number: 'A1',
      cassette_barcode: 'CAS-2026-0005-A1',
      embedding_status: 'SECTIONED'
    }
  });

  await prisma.slide.create({
    data: {
      block_id: block5.id,
      slide_number: 'A1-1',
      stain_type: 'H&E',
      slide_barcode: 'SLD-2026-0005-A1-1',
      status: 'SCANNED'
    }
  });

  await prisma.report.create({
    data: {
      accession_id: acc5.id,
      pathologist_id: 'PATH-DR-KIM',
      microscopic_description: 'High-power examination reveals crowded clusters of follicular epithelial cells with nuclear enlargement, ground-glass appearance (Orphan Annie eyes), and psammoma bodies.',
      diagnosis_code: 'ICD-O 8260/3 (Papillary Thyroid Carcinoma)',
      impression: 'Malignant neoplasm consistent with Papillary Thyroid Carcinoma. High-grade features noted.',
      is_signed_off: true,
      signed_off_at: new Date(Date.now() - 20 * 3600 * 1000)
    }
  });

  await prisma.qA_Alert.create({
    data: {
      accession_id: acc5.id,
      alert_type: 'CRITICAL_DIAGNOSIS',
      severity: 'CRITICAL',
      description: 'CRITICAL VALUE ESCALATION: Malignancy/High-Risk finding detected: [malignant, carcinoma]. Priority alert dispatched to ordering physician: Dr. Allison Cameron, Oncology.',
      is_resolved: true,
      resolved_by: 'Dr. Kim (Auto-confirmed via Dr. Cameron phone acknowledgment)'
    }
  });

  console.log('✅ Seed completed successfully with 5 clinical cases, chain of custody logs, and QA alerts.');
}

// Execute directly if run as CLI script
if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
