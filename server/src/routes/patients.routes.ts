import { Router } from 'express';
import { prisma } from '../db/client';
import { z } from 'zod';

const router = Router();

const createPatientSchema = z.object({
  mrn: z.string().min(1, 'MRN is required'),
  full_name: z.string().min(1, 'Full name is required'),
  dob: z.string(),
  gender: z.string(),
  contact_info: z.string().default('')
});

router.get('/', async (req, res) => {
  try {
    const search = req.query.search as string;
    const where = search ? {
      OR: [
        { full_name: { contains: search } },
        { mrn: { contains: search } }
      ]
    } : {};

    const patients = await prisma.patient.findMany({
      where,
      orderBy: { created_at: 'desc' },
      include: {
        _count: { select: { accessions: true } }
      }
    });
    res.json(patients);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = createPatientSchema.parse(req.body);
    const existing = await prisma.patient.findUnique({
      where: { mrn: data.mrn }
    });
    if (existing) {
      return res.status(409).json({ error: 'Patient with this MRN already exists', patient: existing });
    }

    const patient = await prisma.patient.create({
      data: {
        mrn: data.mrn,
        full_name: data.full_name,
        dob: new Date(data.dob),
        gender: data.gender,
        contact_info: data.contact_info
      }
    });
    res.status(201).json(patient);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        accessions: {
          include: {
            specimens: true,
            reports: true,
            qa_alerts: true
          }
        }
      }
    });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
