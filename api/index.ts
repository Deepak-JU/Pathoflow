import type { Request, Response } from 'express';
import { createApp } from '../server/src/app';

const app = createApp();

export default function handler(req: Request, res: Response) {
  return app(req, res);
}
