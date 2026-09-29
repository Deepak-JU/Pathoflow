import { Router } from 'express';
import { prisma } from '../db/client';
import { ChainOfCustodyEngine, StationType } from '../engine/cocEngine';

const router = Router();

/**
 * Rapid Barcode Action:
 * Simulates a scanner at a station (e.g. Staining or Scanning) scanning a barcode
 * and automatically transitioning the entity to the next state, logging immutable CoC and broadcasting.
 */
router.post('/scan-action', async (req, res) => {
  try {
    const { barcode, station, action, performedBy } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    const trimmed = barcode.trim();

    // 1. Try finding slide
    const slide = await prisma.slide.findUnique({
      where: { slide_barcode: trimmed },
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

    if (slide) {
      let targetStatus = slide.status;
      if (station === 'STAINING') targetStatus = 'STAINED';
      else if (station === 'SCANNING') targetStatus = 'SCANNED';
      else if (station === 'PATHOLOGY') targetStatus = 'SCANNED';

      const updated = await prisma.slide.update({
        where: { id: slide.id },
        data: { status: targetStatus }
      });

      const log = await ChainOfCustodyEngine.recordEvent({
        entityType: 'SLIDE',
        entityId: slide.id,
        station: station as StationType,
        action: action || `SCAN_${targetStatus}`,
        performedBy: performedBy || `${station} Station Operator`,
        accessionId: slide.block.specimen.accession_id,
        metadata: {
          barcode: trimmed,
          previousStatus: slide.status,
          newStatus: targetStatus
        }
      });

      return res.json({
        success: true,
        entityType: 'SLIDE',
        entity: updated,
        accessionId: slide.block.specimen.accession_id,
        log
      });
    }

    // 2. Try finding block / cassette
    const block = await prisma.block.findUnique({
      where: { cassette_barcode: trimmed },
      include: { specimen: { include: { accession: true } } }
    });

    if (block) {
      let newEmbeddingStatus = block.embedding_status;
      if (station === 'EMBEDDING') newEmbeddingStatus = 'EMBEDDED';
      if (station === 'MICROTOMY') newEmbeddingStatus = 'SECTIONED';

      const updated = await prisma.block.update({
        where: { id: block.id },
        data: { embedding_status: newEmbeddingStatus }
      });

      const log = await ChainOfCustodyEngine.recordEvent({
        entityType: 'BLOCK',
        entityId: block.id,
        station: station as StationType,
        action: action || `SCAN_${newEmbeddingStatus}`,
        performedBy: performedBy || `${station} Station Operator`,
        accessionId: block.specimen.accession_id,
        metadata: { barcode: trimmed, embeddingStatus: newEmbeddingStatus }
      });

      return res.json({
        success: true,
        entityType: 'BLOCK',
        entity: updated,
        accessionId: block.specimen.accession_id,
        log
      });
    }

    // 3. Try finding specimen container
    const specimen = await prisma.specimen.findUnique({
      where: { container_barcode: trimmed },
      include: { accession: true }
    });

    if (specimen) {
      const log = await ChainOfCustodyEngine.recordEvent({
        entityType: 'SPECIMEN',
        entityId: specimen.id,
        station: station as StationType,
        action: action || 'SPECIMEN_VERIFIED_AT_STATION',
        performedBy: performedBy || `${station} Station Operator`,
        accessionId: specimen.accession_id,
        metadata: { barcode: trimmed }
      });

      return res.json({
        success: true,
        entityType: 'SPECIMEN',
        entity: specimen,
        accessionId: specimen.accession_id,
        log
      });
    }

    // Unknown barcode! Auto-generate QA Alert
    res.status(404).json({ error: `Barcode '${trimmed}' not found in system.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
