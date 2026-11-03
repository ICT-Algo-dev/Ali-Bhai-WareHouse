import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence: { type: Number, required: true, default: 0, min: 0 }
}, { versionKey: false, collection: 'counters' });

export const Counter = mongoose.models.IntakeCounter || mongoose.model('IntakeCounter', counterSchema, 'counters');
