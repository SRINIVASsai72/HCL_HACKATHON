import mongoose from 'mongoose';
import { REVIEW_STATUS, REVIEW_TYPES } from '../constants.js';
const { ObjectId, Mixed } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  type: { type: String, enum: REVIEW_TYPES, required: true },
  employeeId: { type: ObjectId, ref: 'Employee' },
  skillId: { type: ObjectId, ref: 'Skill' },
  roleId: { type: ObjectId, ref: 'Role' },
  aiOutput: { type: Mixed, required: true },
  status: { type: String, enum: REVIEW_STATUS, default: 'pending' },
  comment: { type: String, default: '' },
  modifiedOutput: Mixed,
  createdBy: { type: ObjectId, ref: 'User', required: true },
  decidedBy: { type: ObjectId, ref: 'User' },
  decidedAt: Date,
}, { timestamps: true });
export default mongoose.model('Review', schema);
