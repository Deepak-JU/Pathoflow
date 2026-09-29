import { createApp } from './app';
import { config } from './config';
import { QAAnomalyEngine } from './engine/qaAnomalyEngine';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🔬 PathoFlow LIMS Backend Server is Running!`);
  console.log(`🌐 URL: http://localhost:${config.port}`);
  console.log(`📡 SSE Stream: http://localhost:${config.port}/sse`);
  console.log(`📊 Health Check: http://localhost:${config.port}/health`);
  console.log(`====================================================`);

  // Start proactive QA Anomaly Engine background worker
  QAAnomalyEngine.startWorker();
});

const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down PathoFlow LIMS server...');
  QAAnomalyEngine.stopWorker();
  server.close(() => {
    console.log('✅ Server terminated gracefully.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
