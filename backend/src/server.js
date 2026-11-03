import { app } from './app.js';
import { connectDatabase } from './config/db.js';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { initializeStorage } from './storage/initialize-storage.js';
import { startIntakeCleanupJobs } from './services/intake-cleanup.service.js';

let server;
let shuttingDown = false;
let stopCleanupJobs;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'Graceful shutdown started');
  const forceExit = setTimeout(() => { logger.error('Shutdown timed out'); process.exit(1); }, 10000);
  forceExit.unref();
  if (server) await new Promise((resolve) => server.close(resolve));
  stopCleanupJobs?.();
  await mongoose.disconnect();
  clearTimeout(forceExit);
  process.exit(0);
}

try {
  await connectDatabase();
  try { await initializeStorage(); }
  catch (error) {
    logger.fatal({ errorMessage: error.message }, 'Upload storage startup check failed');
    process.exit(1);
  }
  stopCleanupJobs = startIntakeCleanupJobs();
  server = app.listen(env.PORT, () => logger.info({ port: env.PORT }, 'API listening'));
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => shutdown(signal));
} catch (err) {
  logger.fatal({ errorName: err.name }, 'API startup failed; check MongoDB and environment configuration');
  process.exit(1);
}
