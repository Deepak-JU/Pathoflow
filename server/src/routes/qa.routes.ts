import { Router } from 'express';
import { prisma } from '../db/client';
import { QAAnomalyEngine } from '../engine/qaAnomalyEngine';
import { eventBus } from '../bus/eventBus';

const router = Router();

router.get('/alerts', async (req, res) => {
  try {
    const { status, severity, alert_type } = req.query;

    const where: any = {};
    if (status === 'unresolved') {
      where.is_resolved = false;
    } else if (status === 'resolved') {
      where.is_resolved = true;
    }
    if (severity && typeof severity === 'string') {
      where.severity = severity;
    }
    if (alert_type && typeof alert_type === 'string') {
      where.alert_type = alert_type;
    }

    const alerts = await prisma.qA_Alert.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        accession: {
          include: {
            patient: true
          }
        }
      }
    });

    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const { resolved_by, resolution_note } = req.body;

    const existing = await prisma.qA_Alert.findUnique({
      where: { id: req.params.id }
    });
    if (!existing) return res.status(404).json({ error: 'Alert not found' });

    const resolver = resolved_by ? `${resolved_by} (${resolution_note || 'Resolved'})` : 'QA Coordinator';

    const updated = await prisma.qA_Alert.update({
      where: { id: req.params.id },
      data: {
        is_resolved: true,
        resolved_by: resolver
      },
      include: { accession: true }
    });

    eventBus.publish({
      type: 'QA_ALERT',
      accessionId: updated.accession_id,
      action: 'RESOLVED',
      payload: updated
    });

    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Trigger QA Worker evaluation on-demand
 */
router.post('/run-worker', async (req, res) => {
  try {
    const thresholdHours = req.body.thresholdHours ? parseFloat(req.body.thresholdHours) : 4;
    const newAlerts = await QAAnomalyEngine.evaluateTATBreaches(thresholdHours);
    res.json({
      success: true,
      message: `QA Anomaly scan completed. ${newAlerts.length} new TAT breach alert(s) generated.`,
      newAlerts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Operations & QA Dashboard KPI Metrics
 */
router.get('/stats', async (req, res) => {
  try {
    const totalAccessions = await prisma.accession.count();
    const activeProcessing = await prisma.accession.count({
      where: { status: 'IN_PROCESSING' }
    });
    const statCases = await prisma.accession.count({
      where: { priority: 'STAT', status: { not: 'SIGNED_OFF' } }
    });
    const signedOffToday = await prisma.accession.count({
      where: {
        status: 'SIGNED_OFF',
        created_at: { gte: new Date(Date.now() - 24 * 3600 * 1000) }
      }
    });

    const activeAlerts = await prisma.qA_Alert.findMany({
      where: { is_resolved: false }
    });

    const alertsBySeverity = {
      CRITICAL: activeAlerts.filter(a => a.severity === 'CRITICAL').length,
      HIGH: activeAlerts.filter(a => a.severity === 'HIGH').length,
      MEDIUM: activeAlerts.filter(a => a.severity === 'MEDIUM').length,
      LOW: activeAlerts.filter(a => a.severity === 'LOW').length,
      TOTAL: activeAlerts.length
    };

    const tatBreaches = activeAlerts.filter(a => a.alert_type === 'TAT_BREACH').length;
    const missingSlideBlockers = activeAlerts.filter(a => a.alert_type === 'MISSING_SLIDE').length;
    const criticalDiagnoses = activeAlerts.filter(a => a.alert_type === 'CRITICAL_DIAGNOSIS').length;

    // Station bottlenecks count
    const totalSpecimens = await prisma.specimen.count();
    const grossedSpecimens = await prisma.specimen.count({ where: { status: 'GROSSED' } });
    const totalBlocks = await prisma.block.count();
    const pendingBlocks = await prisma.block.count({ where: { embedding_status: 'PENDING' } });
    const totalSlides = await prisma.slide.count();
    const cutSlides = await prisma.slide.count({ where: { status: 'CUT' } });
    const stainedSlides = await prisma.slide.count({ where: { status: 'STAINED' } });
    const scannedSlides = await prisma.slide.count({ where: { status: 'SCANNED' } });

    res.json({
      accessions: {
        total: totalAccessions,
        inProcessing: activeProcessing,
        statCases,
        signedOffToday
      },
      alerts: {
        active: alertsBySeverity,
        tatBreaches,
        missingSlideBlockers,
        criticalDiagnoses
      },
      workstationQueues: {
        intakeGrossing: { total: totalSpecimens, waitingGrossing: totalSpecimens - grossedSpecimens },
        embedding: { total: totalBlocks, pendingEmbedding: pendingBlocks },
        microtomy: { cutSlides },
        staining: { stainedSlides },
        scanning: { scannedSlides }
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
