import mongoose from 'mongoose';
import { DEPARTMENTS } from '../constants.js';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, enum: DEPARTMENTS, required: true },
  roleId: { type: ObjectId, ref: 'Role', required: true },
  skills: [{ skillId: { type: ObjectId, ref: 'Skill', required: true }, level: { type: Number, min: 1, max: 5, required: true } }],
  interests: [{ type: ObjectId, ref: 'Role' }],
}, { timestamps: true });
schema.path('skills').validate((skills) => new Set(skills.map(s => String(s.skillId))).size === skills.length, 'Duplicate skillId');
export default mongoose.model('Employee', schema);
