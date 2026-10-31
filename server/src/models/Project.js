import mongoose from 'mongoose';
import { DEPARTMENTS } from '../constants.js';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, enum: DEPARTMENTS, required: true },
  status: { type: String, enum: ['completed', 'active', 'planned'], required: true },
  startDate: { type: Date, required: true },
  requiredSkills: [{ skillId: { type: ObjectId, ref: 'Skill' }, level: { type: Number, min: 1, max: 5 }, headcount: { type: Number, min: 0 } }],
  members: [{ type: ObjectId, ref: 'Employee' }],
}, { timestamps: true });
export default mongoose.model('Project', schema);
