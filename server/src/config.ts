import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  qaWorkerIntervalMs: parseInt(process.env.QA_WORKER_INTERVAL_MS || '30000', 10),
  criticalKeywords: [
    'malignant',
    'high-grade carcinoma',
    'carcinoma',
    'adenocarcinoma',
    'melanoma',
    'metastatic',
    'lymphoma',
    'sarcoma',
    'severe dysplasia',
    'invasive'
  ]
};
