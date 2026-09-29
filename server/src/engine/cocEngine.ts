import { prisma } from '../db/client';
import { eventBus } from '../bus/eventBus';

export type EntityType = 'SPECIMEN' | 'BLOCK' | 'SLIDE' | 'ACCESSION';
export type StationType = 'INTAKE' | 'EMBEDDING' | 'MICROTOMY' | 'STAINING' | 'SCANNING' | 'PATHOLOGY';

export interface RecordCustodyParams {
  entityType: EntityType;
  entityId: string;
  station: StationType;
  action: string;
  performedBy: string;
  accessionId?: string;
  metadata?: Record<string, any>;
}

export class ChainOfCustodyEngine {
  public static async recordEvent(params: RecordCustodyParams) {
    const log = await prisma.chainOfCustodyLog.create({
      data: {
        entity_type: params.entityType,
        entity_id: params.entityId,
        station: params.station,
        action: params.action,
        performed_by: params.performedBy,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        timestamp: new Date()
      }
    });

    // Broadcast in real-time to all connected stations via Redis / SSE
    eventBus.publish({
      type: 'CHAIN_OF_CUSTODY',
      entityType: params.entityType,
      entityId: params.entityId,
      accessionId: params.accessionId,
      station: params.station,
      action: params.action,
      payload: {
        logId: log.id,
        entityType: params.entityType,
        entityId: params.entityId,
        station: params.station,
        action: params.action,
        performedBy: params.performedBy,
        timestamp: log.timestamp,
        metadata: params.metadata
      }
    });

    return log;
  }

  public static async getLogsForEntity(entityId: string) {
    return prisma.chainOfCustodyLog.findMany({
      where: { entity_id: entityId },
      orderBy: { timestamp: 'desc' }
    });
  }

  public static async getRecentLogs(limit: number = 50) {
    return prisma.chainOfCustodyLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' }
    });
  }
}
