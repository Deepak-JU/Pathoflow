import { Response } from 'express';
import { eventBus, LabEvent } from '../bus/eventBus';

class SSEManager {
  private clients: Set<Response> = new Set();

  constructor() {
    // Listen to all events from the event bus and broadcast
    eventBus.onEvent((event: LabEvent) => {
      this.broadcast(event);
    });

    // Heartbeat every 20 seconds to keep connection alive
    setInterval(() => {
      this.broadcast({
        type: 'SYSTEM',
        payload: { heartbeat: true },
        timestamp: new Date().toISOString()
      });
    }, 20000);
  }

  public addClient(res: Response) {
    this.clients.add(res);

    // Initial connection welcome event
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', timestamp: new Date().toISOString() })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  public broadcast(event: LabEvent) {
    const dataString = `event: lab_update\ndata: ${JSON.stringify(event)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(dataString);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();
