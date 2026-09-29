import { Router } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';
import { ChainOfCustodyEngine } from '../engine/cocEngine';

const router = Router();

const createBlockSchema = z.object({
  specimen_id: z.string().min(1),
  block_number: z.string().optional(), // e.g. A1, A2
  cassette_barcode: z.string().optional(),
  embedding_status: z.enum(['PENDING', 'EMBEDDED', 'SECTIONED']).default('PENDING'),
  performed_by: z.string().default('Grossing Tech')
});

router.post('/', async (req, res) => {
  try {
    const data = createBlockSchema.parse(req.body);
    const specimen = await prisma.specimen.findUnique({
      where: { id: data.specimen_id },
      include: { accession: true, blocks: true }
    });
    if (!specimen) return res.status(404).json({ error: 'Specimen not found' });

    // Auto-generate block number: A1, A2, A3...
    const count = specimen.blocks.length + 1;
    const blockNumber = data.block_number || `A${count}`;
    const cassetteBarcode = data.cassette_barcode || `CAS-${specimen.accession.accession_number}-${blockNumber}`;

    const block = await prisma.block.create({
      data: {
        specimen_id: data.specimen_id,
        block_number: blockNumber,
        cassette_barcode: cassetteBarcode,
        embedding_status: data.embedding_status
      }
    });

    // Update specimen status to GROSSED if not already
    if (specimen.status === 'RECEIVED') {
      await prisma.specimen.update({
        where: { id: specimen.id },
        data: { status: 'GROSSED' }
      });
    }

    // Update accession status to IN_PROCESSING
    if (specimen.accession.status === 'RECEIVED') {
      await prisma.accession.update({
        where: { id: specimen.accession_id },
        data: { status: 'IN_PROCESSING' }
      });
    }

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'BLOCK',
      entityId: block.id,
      station: 'EMBEDDING',
      action: 'CASSETTE_PRINTED_AND_GROSSED',
      performedBy: data.performed_by,
      accessionId: specimen.accession_id,
      metadata: { blockNumber, cassetteBarcode }
    });

    res.status(201).json(block);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.patch('/:id/embedding', async (req, res) => {
  try {
    const { embedding_status, performed_by } = req.body;
    const block = await prisma.block.update({
      where: { id: req.params.id },
      data: { embedding_status },
      include: { specimen: { include: { accession: true } } }
    });

    await ChainOfCustodyEngine.recordEvent({
      entityType: 'BLOCK',
      entityId: block.id,
      station: 'EMBEDDING',
      action: `BLOCK_EMBEDDING_${embedding_status}`,
      performedBy: performed_by || 'Embedding Tech',
      accessionId: block.specimen.accession_id
    });

    res.json(block);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
