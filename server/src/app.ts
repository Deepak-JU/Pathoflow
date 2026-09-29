import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import patientsRoutes from './routes/patients.routes';
import accessionsRoutes from './routes/accessions.routes';
import specimensRoutes from './routes/specimens.routes';
import blocksRoutes from './routes/blocks.routes';
import slidesRoutes from './routes/slides.routes';
import stationsRoutes from './routes/stations.routes';
import reportsRoutes from './routes/reports.routes';
import qaRoutes from './routes/qa.routes';
import lineageRoutes from './routes/lineage.routes';
import sseRoutes from './routes/sse.routes';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'UP',
      service: 'PathoFlow LIMS API',
      timestamp: new Date().toISOString()
    });
  });

  // REST API Routes
  app.use('/api/patients', patientsRoutes);
  app.use('/api/accessions', accessionsRoutes);
  app.use('/api/specimens', specimensRoutes);
  app.use('/api/blocks', blocksRoutes);
  app.use('/api/slides', slidesRoutes);
  app.use('/api/stations', stationsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/qa', qaRoutes);
  app.use('/api/lineage', lineageRoutes);

  // Real-time Server-Sent Events (SSE)
  app.use('/sse', sseRoutes);

  // Serve static client assets in production if available
  const clientDistPath = process.env.CLIENT_DIST_PATH || path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/sse')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred'
    });
  });

  return app;
};
