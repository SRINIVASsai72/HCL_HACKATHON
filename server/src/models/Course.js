import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['course', 'certification'], required: true },
  provider: { type: String, required: true },
  skills: [{ skillId: { type: ObjectId, ref: 'Skill' }, targetLevel: { type: Number, min: 1, max: 5 } }],
  level: { type: Number, min: 1, max: 5, required: true },
  hours: { type: Number, min: 0, required: true },
  embedding: { type: [Number], select: false },
}, { timestamps: true });
export default mongoose.model('Course', schema);
