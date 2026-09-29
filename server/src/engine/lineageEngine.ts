import { prisma } from '../db/client';

export interface LineageTreeNode {
  id: string;
  type: 'ACCESSION' | 'SPECIMEN' | 'BLOCK' | 'SLIDE';
  label: string;
  barcode?: string;
  status: string;
  details: Record<string, any>;
  children?: LineageTreeNode[];
}

export class LineageEngine {
  /**
   * Retrieves the full hierarchical lineage tree starting from an Accession
   */
  public static async getAccessionLineage(accessionIdOrNumber: string) {
    const accession = await prisma.accession.findFirst({
      where: {
        OR: [
          { id: accessionIdOrNumber },
          { accession_number: accessionIdOrNumber }
        ]
      },
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

    if (!accession) {
      return null;
    }

    // Collect all entity IDs to fetch full custody logs
    const entityIds: string[] = [accession.id];
    accession.specimens.forEach(specimen => {
      entityIds.push(specimen.id);
      specimen.blocks.forEach(block => {
        entityIds.push(block.id);
        block.slides.forEach(slide => {
          entityIds.push(slide.id);
        });
      });
    });

    const custodyLogs = await prisma.chainOfCustodyLog.findMany({
      where: {
        entity_id: { in: entityIds }
      },
      orderBy: { timestamp: 'desc' }
    });

    // Build the hierarchical tree representation
    const tree: LineageTreeNode = {
      id: accession.id,
      type: 'ACCESSION',
      label: accession.accession_number,
      status: accession.status,
      details: {
        priority: accession.priority,
        orderingPhysician: accession.ordering_physician,
        clinicalHistory: accession.clinical_history,
        patientName: accession.patient.full_name,
        patientMrn: accession.patient.mrn,
        createdAt: accession.created_at
      },
      children: accession.specimens.map(specimen => ({
        id: specimen.id,
        type: 'SPECIMEN',
        label: `${specimen.tissue_type} (${specimen.container_barcode})`,
        barcode: specimen.container_barcode,
        status: specimen.status,
        details: {
          tissueType: specimen.tissue_type,
          collectedAt: specimen.collected_at
        },
        children: specimen.blocks.map(block => ({
          id: block.id,
          type: 'BLOCK',
          label: `Block ${block.block_number} (${block.cassette_barcode})`,
          barcode: block.cassette_barcode,
          status: block.embedding_status,
          details: {
            blockNumber: block.block_number,
            embeddingStatus: block.embedding_status,
            createdAt: block.created_at
          },
          children: block.slides.map(slide => ({
            id: slide.id,
            type: 'SLIDE',
            label: `Slide ${slide.slide_number} [${slide.stain_type}]`,
            barcode: slide.slide_barcode,
            status: slide.status,
            details: {
              slideNumber: slide.slide_number,
              stainType: slide.stain_type,
              status: slide.status,
              createdAt: slide.created_at
            }
          }))
        }))
      }))
    };

    return {
      accession,
      tree,
      custodyLogs
    };
  }

  /**
   * Universal Barcode Scanner Resolution:
   * Finds any specimen, cassette, or slide barcode and resolves it to its root Accession lineage
   */
  public static async resolveBarcode(barcode: string) {
    const trimmed = barcode.trim();

    // 1. Check Accession Number
    const accession = await prisma.accession.findUnique({
      where: { accession_number: trimmed }
    });
    if (accession) {
      const lineage = await this.getAccessionLineage(accession.id);
      return { entityType: 'ACCESSION', entity: accession, accessionId: accession.id, lineage };
    }

    // 2. Check Container Barcode (Specimen)
    const specimen = await prisma.specimen.findUnique({
      where: { container_barcode: trimmed },
      include: { accession: true }
    });
    if (specimen) {
      const lineage = await this.getAccessionLineage(specimen.accession_id);
      return { entityType: 'SPECIMEN', entity: specimen, accessionId: specimen.accession_id, lineage };
    }

    // 3. Check Cassette Barcode (Block)
    const block = await prisma.block.findUnique({
      where: { cassette_barcode: trimmed },
      include: { specimen: { include: { accession: true } } }
    });
    if (block) {
      const accessionId = block.specimen.accession_id;
      const lineage = await this.getAccessionLineage(accessionId);
      return { entityType: 'BLOCK', entity: block, accessionId, lineage };
    }

    // 4. Check Slide Barcode (Slide)
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
      const accessionId = slide.block.specimen.accession_id;
      const lineage = await this.getAccessionLineage(accessionId);
      return { entityType: 'SLIDE', entity: slide, accessionId, lineage };
    }

    return null;
  }
}
