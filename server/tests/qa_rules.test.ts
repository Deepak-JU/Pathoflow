import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/db/client';
import { QAAnomalyEngine } from '../src/engine/qaAnomalyEngine';
import { ChainOfCustodyEngine } from '../src/engine/cocEngine';
import { LineageEngine } from '../src/engine/lineageEngine';

describe('PathoFlow LIMS: Proactive QA & Lineage Engine Tests', () => {
  let testPatientId: string;
  let testAccessionId: string;
  let testSpecimenId: string;
  let testBlockId: string;
  let testSlideId: string;

  beforeAll(async () => {
    // Setup test patient
    const patient = await prisma.patient.create({
      data: {
        mrn: `MRN-TEST-${Date.now()}`,
        full_name: 'Test Patient QA',
        dob: new Date('1980-01-01'),
        gender: 'OTHER',
        contact_info: 'test@example.com'
      }
    });
    testPatientId = patient.id;

    // Setup test accession with STAT priority
    const acc = await prisma.accession.create({
      data: {
        accession_number: `ACC-TEST-${Date.now()}`,
        patient_id: testPatientId,
        ordering_physician: 'Dr. Test Physician',
        clinical_history: 'Test clinical indication',
        priority: 'STAT',
        status: 'IN_PROCESSING',
        created_at: new Date(Date.now() - 5 * 3600 * 1000) // 5 hours ago (breaching 4h threshold)
      }
    });
    testAccessionId = acc.id;

    const spec = await prisma.specimen.create({
      data: {
        accession_id: testAccessionId,
        tissue_type: 'Test Biopsy',
        container_barcode: `SPEC-TEST-${Date.now()}`,
        status: 'RECEIVED'
      }
    });
    testSpecimenId = spec.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.qA_Alert.deleteMany({ where: { accession_id: testAccessionId } });
    await prisma.chainOfCustodyLog.deleteMany({ where: { entity_id: testAccessionId } });
    await prisma.accession.deleteMany({ where: { id: testAccessionId } });
    await prisma.patient.deleteMany({ where: { id: testPatientId } });
    await prisma.$disconnect();
  });

  it('Rule 1 (TAT Breach Monitor): Should detect STAT accession >4 hours without slides and raise HIGH alert', async () => {
    const alerts = await QAAnomalyEngine.evaluateTATBreaches(4);
    expect(alerts.length).toBeGreaterThanOrEqual(1);

    const alertForOurCase = alerts.find(a => a.accession_id === testAccessionId);
    expect(alertForOurCase).toBeDefined();
    expect(alertForOurCase?.severity).toBe('HIGH');
    expect(alertForOurCase?.alert_type).toBe('TAT_BREACH');
    expect(alertForOurCase?.description).toContain('TAT BREACH');
  });

  it('Rule 2 (Missing Asset Check): Should BLOCK sign-off when no slides exist or unscanned slides exist', async () => {
    // Initially test accession has no slides
    const checkNoSlides = await QAAnomalyEngine.checkMissingAssets(testAccessionId);
    expect(checkNoSlides.allowed).toBe(false);
    expect(checkNoSlides.reason).toContain('No slides exist');

    // Create block and slide with CUT status (not SCANNED)
    const block = await prisma.block.create({
      data: {
        specimen_id: testSpecimenId,
        block_number: 'A1',
        cassette_barcode: `CAS-TEST-${Date.now()}`,
        embedding_status: 'EMBEDDED'
      }
    });
    testBlockId = block.id;

    const slide = await prisma.slide.create({
      data: {
        block_id: testBlockId,
        slide_number: 'A1-1',
        stain_type: 'H&E',
        slide_barcode: `SLD-TEST-${Date.now()}`,
        status: 'CUT' // Not SCANNED yet
      }
    });
    testSlideId = slide.id;

    // Check again: should block because slide is CUT
    const checkUnscanned = await QAAnomalyEngine.checkMissingAssets(testAccessionId);
    expect(checkUnscanned.allowed).toBe(false);
    expect(checkUnscanned.reason).toContain('Missing scanned digital slides');
    expect(checkUnscanned.missingSlides.length).toBe(1);

    // Now transition slide to SCANNED
    await prisma.slide.update({
      where: { id: testSlideId },
      data: { status: 'SCANNED' }
    });

    const checkScanned = await QAAnomalyEngine.checkMissingAssets(testAccessionId);
    expect(checkScanned.allowed).toBe(true);
    expect(checkScanned.missingSlides.length).toBe(0);
  });

  it('Rule 3 (Critical Value Escalation): Should detect Malignant keywords and auto-trigger CRITICAL alert and physician notice', async () => {
    const impression = 'Malignant neoplasm consistent with High-grade carcinoma with lymphovascular invasion.';
    const microscopicDesc = 'Atypical cells forming irregular glands.';

    const result = await QAAnomalyEngine.evaluateCriticalDiagnosis(
      testAccessionId,
      impression,
      microscopicDesc,
      'Dr. Test Physician'
    );

    expect(result.isCritical).toBe(true);
    expect(result.matchedKeywords).toContain('malignant');
    expect(result.matchedKeywords).toContain('high-grade carcinoma');
    expect(result.alert?.severity).toBe('CRITICAL');
    expect(result.alert?.alert_type).toBe('CRITICAL_DIAGNOSIS');
    expect(result.alert?.description).toContain('Dr. Test Physician');

    // Verify Chain of Custody record was created for critical value escalation
    const logs = await prisma.chainOfCustodyLog.findMany({
      where: {
        entity_id: testAccessionId,
        action: 'CRITICAL_VALUE_ESCALATED'
      }
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].station).toBe('PATHOLOGY');
  });

  it('Chain of Custody & Hierarchical Lineage Engine: Should produce complete hierarchical tree and barcode resolution', async () => {
    // Record an event
    await ChainOfCustodyEngine.recordEvent({
      entityType: 'SLIDE',
      entityId: testSlideId,
      station: 'SCANNING',
      action: 'SCANNED',
      performedBy: 'Test Digital Path Tech',
      accessionId: testAccessionId
    });

    // Fetch lineage tree
    const lineage = await LineageEngine.getAccessionLineage(testAccessionId);
    expect(lineage).not.toBeNull();
    expect(lineage?.tree.type).toBe('ACCESSION');
    expect(lineage?.tree.children?.[0].type).toBe('SPECIMEN');
    expect(lineage?.tree.children?.[0].children?.[0].type).toBe('BLOCK');
    expect(lineage?.tree.children?.[0].children?.[0].children?.[0].type).toBe('SLIDE');

    // Barcode resolution
    const slide = await prisma.slide.findUnique({ where: { id: testSlideId } });
    const resolved = await LineageEngine.resolveBarcode(slide!.slide_barcode);
    expect(resolved).not.toBeNull();
    expect(resolved?.entityType).toBe('SLIDE');
    expect(resolved?.accessionId).toBe(testAccessionId);
  });
});
