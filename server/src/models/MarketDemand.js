import mongoose from 'mongoose';
const { ObjectId } = mongoose.Schema.Types;
const schema = new mongoose.Schema({
  skillId: { type: ObjectId, ref: 'Skill', required: true },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  value: { type: Number, min: 0, required: true },
  source: { type: String, enum: ['synthetic', 'external'], required: true },
}, { timestamps: true });
schema.index({ skillId: 1, month: 1 }, { unique: true });
export default mongoose.model('MarketDemand', schema);
