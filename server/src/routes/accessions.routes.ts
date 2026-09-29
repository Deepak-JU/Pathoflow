import { Router } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ChainOfCustodyEngine } from '../engine/cocEngine';

const router = Router();

const createAccessionSchema = z.object({
  patient_id: z.string().min(1, 'Patient ID is required'),
  ordering_physician: z.string().min(1, 'Ordering physician is required'),
  clinical_history: z.string().default(''),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
  // Optional initial specimen on accession intake
  initial_specimen: z.object({
    tissue_type: z.string().min(1),
    collected_at: z.string().optional()
  }).optional(),
  performed_by: z.string().default('Intake Clerk')
});

router.get('/', async (req, res) => {
  try {
    const { status, priority, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    }
    if (priority && typeof priority === 'string') {
      where.priority = priority;
    }
    if (search && typeof search === 'string') {
      where.OR = [
        { accession_number: { contains: search } },
        { ordering_physician: { contains: search } },
        { patient: { full_name: { contains: search } } },
        { patient: { mrn: { contains: search } } }
      ];
    }

    const accessions = await prisma.accession.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        patient: true,
        specimens: {
          include: {
            blocks: {
              include: {
                slides: true
              }
            }
          }
        },
        reports: true,
        qa_alerts: {
          where: { is_resolved: false }
        }
      }
    });

    res.json(accessions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = createAccessionSchema.parse(req.body);

    // Auto-generate next accession number
    const count = await prisma.accession.count();
    const nextSeq = String(count + 1).padStart(4, '0');
    const accessionNumber = `ACC-${new Date().getFullYear()}-${nextSeq}`;

    const accession = await prisma.accession.create({
      data: {
        accession_number: accessionNumber,
        patient_id: data.patient_id,
        ordering_physician: data.ordering_physician,
        clinical_history: data.clinical_history,
        priority: data.priority,
        status: 'RECEIVED'
      },
      include: { patient: true }
    });

    // Immutable Chain of Custody Log
    await ChainOfCustodyEngine.recordEvent({
      entityType: 'ACCESSION',
      entityId: accession.id,
      station: 'INTAKE',
      action: 'ACCESSIONED',
      performedBy: data.performed_by,
      accessionId: accession.id,
      metadata: {
        accessionNumber,
        priority: data.priority,
        patientName: accession.patient.full_name
      }
    });

    // If initial specimen provided, create it automatically
    let specimen = null;
    if (data.initial_specimen) {
      const specBarcode = `SPEC-${new Date().getFullYear()}-${nextSeq}-1`;
      specimen = await prisma.specimen.create({
        data: {
          accession_id: accession.id,
          tissue_type: data.initial_specimen.tissue_type,
          container_barcode: specBarcode,
          collected_at: data.initial_specimen.collected_at ? new Date(data.initial_specimen.collected_at) : new Date(),
          status: 'RECEIVED'
        }
      });

      await ChainOfCustodyEngine.recordEvent({
        entityType: 'SPECIMEN',
        entityId: specimen.id,
        station: 'INTAKE',
        action: 'RECEIVED',
        performedBy: data.performed_by,
        accessionId: accession.id,
        metadata: { containerBarcode: specBarcode, tissueType: specimen.tissue_type }
      });
    }

    res.status(201).json({
      accession,
      specimen
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const accession = await prisma.accession.findUnique({
      where: { id: req.params.id },
      include: {
        patient: true,
        specimens: {
          include: {
            blocks: {
              include: {
                slides: true
              }
            }
          }
        },
        reports: true,
        qa_alerts: {
          orderBy: { created_at: 'desc' }
        }
      }
    });
    if (!accession) return res.status(404).json({ error: 'Accession not found' });
    res.json(accession);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, performed_by } = req.body;
    const accession = await prisma.accession.update({
      where: { id: req.params.id },
      data: { status }
    });

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'ACCESSION',
      entityId: accession.id,
      station: 'INTAKE',
      action: `STATUS_CHANGED_TO_${status}`,
      performedBy: performed_by || 'Lab Staff',
      accessionId: accession.id
    });

    res.json(accession);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
