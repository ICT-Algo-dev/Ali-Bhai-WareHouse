import path from 'node:path';
import { readdir, rm, stat } from 'node:fs/promises';
import { Intake } from '../models/Intake.js';
import { IntakeFile } from '../models/IntakeFile.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { storageProvider } from '../storage/LocalStorageProvider.js';

let cleanupRunning = false;

export async function cleanupExpiredIntakes(now = new Date()) {
  if (cleanupRunning) return { skipped: true };
  cleanupRunning = true;
  let deleted = 0;
  try {
    const cutoff = new Date(now.getTime() - env.INQUIRY_RETENTION_DAYS * 86400000);
    const cursor = Intake.find({ createdAt: { $lt: cutoff } }).select('_id reference').lean().cursor();
    for await (const intake of cursor) {
      await storageProvider.deletePrefix(`intakes/${intake.reference}`);
      await IntakeFile.deleteMany({ intakeId: intake._id });
      await Intake.deleteOne({ _id: intake._id });
      deleted += 1;
    }
    return { deleted };
  } finally { cleanupRunning = false; }
}

export async function removeStaleTempFiles(now = new Date(), tempDirectory = path.join(env.UPLOADS_DIR, 'tmp')) {
  let entries;
  try { entries = await readdir(tempDirectory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
  let removed = 0;
  for (const entry of entries) {
    const filePath = path.join(tempDirectory, entry.name);
    if (!entry.isFile()) continue;
    try {
      const details = await stat(filePath);
      if (now.getTime() - details.mtimeMs > 60 * 60 * 1000) { await rm(filePath, { force: true }); removed += 1; }
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return removed;
}

export function startIntakeCleanupJobs() {
  const runRetention = async () => {
    try { const result = await cleanupExpiredIntakes(); if (result.deleted) logger.info({ deleted: result.deleted }, 'Expired intake records and files removed'); }
    catch (error) { logger.error({ errorName: error?.name || 'Error' }, 'Intake retention cleanup failed'); }
  };
  const runTemp = async () => {
    try { const removed = await removeStaleTempFiles(); if (removed) logger.info({ removed }, 'Stale upload temp files removed'); }
    catch (error) { logger.error({ errorName: error?.name || 'Error' }, 'Temporary upload cleanup failed'); }
  };
  void runRetention(); void runTemp();
  const retentionTimer = setInterval(runRetention, 24 * 60 * 60 * 1000);
  const tempTimer = setInterval(runTemp, 60 * 60 * 1000);
  retentionTimer.unref(); tempTimer.unref();
  return () => { clearInterval(retentionTimer); clearInterval(tempTimer); };
}
