import mongoose from 'mongoose';
import { DEPARTMENTS } from '../constants.js';
const { ObjectId } = mongoose.Schema.Types;
const skillReq = new mongoose.Schema({
  skillId: { type: ObjectId, ref: 'Skill', required: true },
  level: { type: Number, min: 1, max: 5, required: true },
  weight: { type: Number, min: 1, max: 3, required: true },
}, { _id: false });
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  department: { type: String, enum: DEPARTMENTS, required: true },
  level: { type: Number, min: 1, max: 3, required: true },
  requiredSkills: [skillReq],
  futureSkills: [skillReq],
  nextRoles: [{ type: ObjectId, ref: 'Role' }],
  embedding: { type: [Number], select: false },
}, { timestamps: true });
export default mongoose.model('Role', schema);
