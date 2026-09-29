import { Router } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ChainOfCustodyEngine, StationType } from '../engine/cocEngine';

const router = Router();

const createSlideSchema = z.object({
  block_id: z.string().min(1),
  slide_number: z.string().optional(), // e.g. A1-1, A1-2
  stain_type: z.string().default('H&E'), // H&E, IHC, FISH
  slide_barcode: z.string().optional(),
  status: z.enum(['CUT', 'STAINED', 'SCANNED', 'ARCHIVED']).default('CUT'),
  performed_by: z.string().default('Microtomy Tech')
});

router.post('/', async (req, res) => {
  try {
    const data = createSlideSchema.parse(req.body);
    const block = await prisma.block.findUnique({
      where: { id: data.block_id },
      include: {
        slides: true,
        specimen: {
          include: { accession: true }
        }
      }
    });
    if (!block) return res.status(404).json({ error: 'Block not found' });

    // Auto-generate slide number: e.g. A1-1, A1-2
    const count = block.slides.length + 1;
    const slideNumber = data.slide_number || `${block.block_number}-${count}`;
    const slideBarcode = data.slide_barcode || `SLD-${block.specimen.accession.accession_number}-${slideNumber}`;

    const slide = await prisma.slide.create({
      data: {
        block_id: data.block_id,
        slide_number: slideNumber,
        stain_type: data.stain_type,
        slide_barcode: slideBarcode,
        status: data.status
      }
    });

    // Automatically advance block embedding status to SECTIONED
    if (block.embedding_status !== 'SECTIONED') {
      await prisma.block.update({
        where: { id: block.id },
        data: { embedding_status: 'SECTIONED' }
      });
    }

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'SLIDE',
      entityId: slide.id,
      station: 'MICROTOMY',
      action: 'SLIDE_CUT_AND_BARCODED',
      performedBy: data.performed_by,
      accessionId: block.specimen.accession_id,
      metadata: { slideNumber, stainType: data.stain_type, slideBarcode }
    });

    res.status(201).json(slide);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status, performed_by } = req.body;
    if (!['CUT', 'STAINED', 'SCANNED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid slide status' });
    }

    const slide = await prisma.slide.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        block: {
          include: {
            specimen: {
              include: { accession: true }
            }
          }
        }
      }
    });

    // Map status to appropriate lab station
    let station: StationType = 'MICROTOMY';
    if (status === 'STAINED') station = 'STAINING';
    if (status === 'SCANNED') station = 'SCANNING';
    if (status === 'ARCHIVED') station = 'PATHOLOGY';

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'SLIDE',
      entityId: slide.id,
      station,
      action: `SLIDE_${status}`,
      performedBy: performed_by || 'Lab Specialist',
      accessionId: slide.block.specimen.accession_id,
      metadata: {
        slideBarcode: slide.slide_barcode,
        slideNumber: slide.slide_number,
        stainType: slide.stain_type,
        newStatus: status
      }
    });

    res.json(slide);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
