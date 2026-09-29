import { Router } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ChainOfCustodyEngine } from '../engine/cocEngine';

const router = Router();

const createSpecimenSchema = z.object({
  accession_id: z.string().min(1),
  tissue_type: z.string().min(1),
  container_barcode: z.string().optional(),
  collected_at: z.string().optional(),
  performed_by: z.string().default('Grossing Tech')
});

router.post('/', async (req, res) => {
  try {
    const data = createSpecimenSchema.parse(req.body);
    const accession = await prisma.accession.findUnique({
      where: { id: data.accession_id },
      include: { specimens: true }
    });
    if (!accession) return res.status(404).json({ error: 'Accession not found' });

    // Auto-generate barcode if omitted
    const count = accession.specimens.length + 1;
    const barcode = data.container_barcode || `${accession.accession_number}-SPEC-${count}`;

    const specimen = await prisma.specimen.create({
      data: {
        accession_id: data.accession_id,
        tissue_type: data.tissue_type,
        container_barcode: barcode,
        collected_at: data.collected_at ? new Date(data.collected_at) : new Date(),
        status: 'RECEIVED'
      }
    });

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'SPECIMEN',
      entityId: specimen.id,
      station: 'INTAKE',
      action: 'SPECIMEN_INTAKE',
      performedBy: data.performed_by,
      accessionId: accession.id,
      metadata: { tissueType: specimen.tissue_type, barcode }
    });

    res.status(201).json(specimen);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, performed_by } = req.body;
    const specimen = await prisma.specimen.update({
      where: { id: req.params.id },
      data: { status },
      include: { accession: true }
    });

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'SPECIMEN',
      entityId: specimen.id,
      station: 'EMBEDDING',
      action: `SPECIMEN_STATUS_${status}`,
      performedBy: performed_by || 'Grossing Tech',
      accessionId: specimen.accession_id
    });

    res.json(specimen);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
