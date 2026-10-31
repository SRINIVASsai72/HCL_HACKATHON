import mongoose from 'mongoose';
import { SKILL_CATEGORIES, TRENDS } from '../constants.js';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  category: { type: String, enum: SKILL_CATEGORIES, required: true },
  description: { type: String, required: true },
  aliases: [{ type: String, lowercase: true }],
  prerequisites: [{ type: ObjectId, ref: 'Skill' }],
  marketPattern: { type: String, enum: TRENDS, select: false },
  embedding: { type: [Number], select: false },
  related: [{ skillId: { type: ObjectId, ref: 'Skill' }, score: Number }],
}, { timestamps: true });
export default mongoose.model('Skill', schema);
