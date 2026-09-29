import { Router, Request, Response } from 'express';
import { sseManager } from '../sse/sseManager';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  // Setup SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  res.flushHeaders?.();
  sseManager.addClient(res);
});

export default router;
