import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';
import { Intake } from '../models/Intake.js';
import { IntakeFile } from '../models/IntakeFile.js';
import { Inquiry } from '../models/Inquiry.js';
import { Counter } from '../models/Counter.js';

export async function connectDatabase(uri = env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required to start the API');
  mongoose.set('sanitizeFilter', true);
  mongoose.set('autoIndex', false);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  try { await Intake.collection.dropIndex('createdAt_1'); }
  catch (error) { if (![26, 27].includes(error.code)) throw error; }
  await Promise.all([Inquiry.createIndexes(), Intake.createIndexes(), IntakeFile.createIndexes(), Counter.createIndexes()]);
  logger.info('MongoDB connected');
  return mongoose.connection;
}
