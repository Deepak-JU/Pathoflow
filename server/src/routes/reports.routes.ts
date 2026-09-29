import { Router } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { QAAnomalyEngine } from '../engine/qaAnomalyEngine';
import { ChainOfCustodyEngine } from '../engine/cocEngine';
import { eventBus } from '../bus/eventBus';

const router = Router();

const reportSchema = z.object({
  accession_id: z.string().min(1),
  pathologist_id: z.string().min(1, 'Pathologist credential ID is required'),
  microscopic_description: z.string().min(1, 'Microscopic description is required'),
  diagnosis_code: z.string().min(1, 'Diagnosis code (ICD-O / SNOMED CT) is required'),
  impression: z.string().min(1, 'Diagnostic impression is required')
});

router.get('/accession/:accessionId', async (req, res) => {
  try {
    const report = await prisma.report.findFirst({
      where: { accession_id: req.params.accessionId },
      include: { accession: { include: { patient: true } } }
    });
    res.json(report || null);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Save draft diagnosis without signing off
 */
router.post('/save-draft', async (req, res) => {
  try {
    const data = reportSchema.parse(req.body);
    const existing = await prisma.report.findFirst({
      where: { accession_id: data.accession_id }
    });

    let report;
    if (existing) {
      if (existing.is_signed_off) {
        return res.status(400).json({ error: 'Cannot edit an already signed-off diagnostic report.' });
      }
      report = await prisma.report.update({
        where: { id: existing.id },
        data: {
          pathologist_id: data.pathologist_id,
          microscopic_description: data.microscopic_description,
          diagnosis_code: data.diagnosis_code,
          impression: data.impression
        }
      });
    } else {
      report = await prisma.report.create({
        data: {
          accession_id: data.accession_id,
          pathologist_id: data.pathologist_id,
          microscopic_description: data.microscopic_description,
          diagnosis_code: data.diagnosis_code,
          impression: data.impression,
          is_signed_off: false
        }
      });
    }

    res.json({ success: true, report, message: 'Diagnostic draft saved.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Proactive QA Sign-off Engine:
 * 1. Evaluates Missing Assets Check (Blocks sign-off if slides unscanned)
 * 2. Evaluates Critical Diagnosis Escalation (Auto-escalates malignant/high-risk findings)
 * 3. Records immutable Chain of Custody log
 * 4. Broadcasts real-time events
 */
router.post('/sign-off', async (req, res) => {
  try {
    const data = reportSchema.parse(req.body);

    const accession = await prisma.accession.findUnique({
      where: { id: data.accession_id },
      include: { patient: true }
    });

    if (!accession) {
      return res.status(404).json({ error: 'Accession not found' });
    }

    // QA Check Rule 2: Missing Asset Check (Unscanned slides prevent sign-off)
    const assetCheck = await QAAnomalyEngine.checkMissingAssets(data.accession_id);
    if (!assetCheck.allowed) {
      return res.status(422).json({
        error: 'QA Enforcement Block: Missing Assets',
        reason: assetCheck.reason,
        missingSlides: assetCheck.missingSlides,
        code: 'MISSING_SLIDES_QA_BLOCK'
      });
    }

    // Save or update the report to signed-off
    const existing = await prisma.report.findFirst({
      where: { accession_id: data.accession_id }
    });

    let report;
    if (existing) {
      report = await prisma.report.update({
        where: { id: existing.id },
        data: {
          pathologist_id: data.pathologist_id,
          microscopic_description: data.microscopic_description,
          diagnosis_code: data.diagnosis_code,
          impression: data.impression,
          is_signed_off: true,
          signed_off_at: new Date()
        }
      });
    } else {
      report = await prisma.report.create({
        data: {
          accession_id: data.accession_id,
          pathologist_id: data.pathologist_id,
          microscopic_description: data.microscopic_description,
          diagnosis_code: data.diagnosis_code,
          impression: data.impression,
          is_signed_off: true,
          signed_off_at: new Date()
        }
      });
    }

    // Advance Accession Status to SIGNED_OFF
    await prisma.accession.update({
      where: { id: data.accession_id },
      data: { status: 'SIGNED_OFF' }
    });

    // Record immutable Chain of Custody Log
    await ChainOfCustodyEngine.recordEvent({
      entityType: 'ACCESSION',
      entityId: accession.id,
      station: 'PATHOLOGY',
      action: 'DIAGNOSTIC_REPORT_SIGNED_OFF',
      performedBy: data.pathologist_id,
      accessionId: accession.id,
      metadata: {
        diagnosisCode: data.diagnosis_code,
        pathologist: data.pathologist_id
      }
    });

    // QA Check Rule 3: Critical Value Escalation
    const criticalEval = await QAAnomalyEngine.evaluateCriticalDiagnosis(
      accession.id,
      data.impression,
      data.microscopic_description,
      accession.ordering_physician
    );

    // Broadcast report sign-off event
    eventBus.publish({
      type: 'REPORT_STATUS',
      entityType: 'REPORT',
      entityId: report.id,
      accessionId: accession.id,
      action: 'SIGNED_OFF',
      payload: {
        report,
        accessionNumber: accession.accession_number,
        isCritical: criticalEval.isCritical,
        matchedKeywords: criticalEval.matchedKeywords
      }
    });

    res.json({
      success: true,
      report,
      criticalEscalation: criticalEval,
      message: criticalEval.isCritical
        ? 'Report signed off. CRITICAL ALERT triggered and ordering physician notified.'
        : 'Report signed off successfully.'
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
