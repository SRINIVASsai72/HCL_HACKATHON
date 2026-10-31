import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  employeeId: { type: ObjectId, ref: 'Employee', required: true },
  courseId: { type: ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['enrolled', 'completed', 'dropped'], required: true },
  startedAt: { type: Date, required: true },
  completedAt: Date,
}, { timestamps: true });
export default mongoose.model('LearningRecord', schema);
