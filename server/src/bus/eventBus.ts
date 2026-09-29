import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { config } from '../config';

export interface LabEvent {
  type: 'CHAIN_OF_CUSTODY' | 'QA_ALERT' | 'LINEAGE_UPDATE' | 'REPORT_STATUS' | 'SYSTEM';
  entityType?: 'SPECIMEN' | 'BLOCK' | 'SLIDE' | 'ACCESSION' | 'REPORT';
  entityId?: string;
  accessionId?: string;
  station?: string;
  action?: string;
  payload: any;
  timestamp: string;
}

class EventBusService {
  private redisPublisher: Redis | null = null;
  private redisSubscriber: Redis | null = null;
  private localEmitter: EventEmitter = new EventEmitter();
  private isRedisConnected: boolean = false;
  private readonly CHANNEL_NAME = 'pathoflow:station_events';

  constructor() {
    this.localEmitter.setMaxListeners(100);
    this.initRedis();
  }

  private initRedis() {
    try {
      this.redisPublisher = new Redis(config.redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) {
            return null; // Stop retrying after 3 tries, use in-memory fallback
          }
          return Math.min(times * 500, 2000);
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true
      });

      this.redisSubscriber = new Redis(config.redisUrl, {
        retryStrategy: (times) => {
          if (times > 3) return null;
          return Math.min(times * 500, 2000);
        },
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true
      });

      this.redisPublisher.connect().then(() => {
        this.isRedisConnected = true;
        console.log('✅ [EventBus] Connected to Redis Pub/Sub at', config.redisUrl);
        
        this.redisSubscriber?.connect().then(() => {
          this.redisSubscriber?.subscribe(this.CHANNEL_NAME, (err) => {
            if (err) {
              console.error('❌ [EventBus] Failed to subscribe to Redis channel:', err);
            } else {
              console.log(`📡 [EventBus] Subscribed to Redis channel: ${this.CHANNEL_NAME}`);
            }
          });

          this.redisSubscriber?.on('message', (channel, message) => {
            if (channel === this.CHANNEL_NAME) {
              try {
                const event: LabEvent = JSON.parse(message);
                this.localEmitter.emit('lab_event', event);
              } catch (e) {
                console.error('[EventBus] Error parsing Redis event:', e);
              }
            }
          });
        }).catch((err) => {
          console.warn('⚠️ [EventBus] Redis subscriber fallback to in-memory bus:', err.message);
        });
      }).catch((err) => {
        this.isRedisConnected = false;
        console.warn('⚠️ [EventBus] Redis unavailable, using high-speed in-memory EventBus fallback.');
      });

      this.redisPublisher.on('error', () => {
        this.isRedisConnected = false;
      });
      this.redisSubscriber?.on('error', () => {
        this.isRedisConnected = false;
      });
    } catch (err: any) {
      this.isRedisConnected = false;
      console.warn('⚠️ [EventBus] Running with local EventBus fallback:', err.message);
    }
  }

  public publish(event: Omit<LabEvent, 'timestamp'>) {
    const fullEvent: LabEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };

    if (this.isRedisConnected && this.redisPublisher) {
      this.redisPublisher.publish(this.CHANNEL_NAME, JSON.stringify(fullEvent)).catch((err) => {
        console.warn('[EventBus] Failed to publish via Redis, dispatching locally:', err.message);
        this.localEmitter.emit('lab_event', fullEvent);
      });
    } else {
      // Local broadcast fallback
      this.localEmitter.emit('lab_event', fullEvent);
    }
  }

  public onEvent(handler: (event: LabEvent) => void) {
    this.localEmitter.on('lab_event', handler);
  }

  public removeListener(handler: (event: LabEvent) => void) {
    this.localEmitter.off('lab_event', handler);
  }
}

export const eventBus = new EventBusService();
