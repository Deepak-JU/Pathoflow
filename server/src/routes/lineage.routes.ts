import { Router } from 'express';
import { LineageEngine } from '../engine/lineageEngine';
import { ChainOfCustodyEngine } from '../engine/cocEngine';

const router = Router();

/**
 * Get full hierarchical lineage tree starting from an Accession
 */
router.get('/accession/:idOrNumber', async (req, res) => {
  try {
    const data = await LineageEngine.getAccessionLineage(req.params.idOrNumber);
    if (!data) {
      return res.status(404).json({ error: 'Accession not found' });
    }
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Universal barcode lookup: scans any barcode (Accession, Cassette, Container, Slide)
 * and resolves its full parentage and lineage tree!
 */
router.get('/barcode/:barcode', async (req, res) => {
  try {
    const result = await LineageEngine.resolveBarcode(req.params.barcode);
    if (!result) {
      return res.status(404).json({ error: `Barcode '${req.params.barcode}' not recognized in system.` });
    }
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Chain of Custody audit log endpoint
 */
router.get('/custody-logs', async (req, res) => {
  try {
    const { entityId, limit } = req.query;
    if (entityId && typeof entityId === 'string') {
      const logs = await ChainOfCustodyEngine.getLogsForEntity(entityId);
      return res.json(logs);
    }
    const limitNum = limit ? parseInt(limit as string, 10) : 50;
    const logs = await ChainOfCustodyEngine.getRecentLogs(limitNum);
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
