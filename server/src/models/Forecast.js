import mongoose from 'mongoose';
import { TRENDS } from '../constants.js';
const { ObjectId } = mongoose.Schema.Types;
const point = new mongoose.Schema({ month: String, value: Number }, { _id: false });
const predicted = new mongoose.Schema({ month: String, value: Number, low: Number, high: Number }, { _id: false });
const schema = new mongoose.Schema({
  skillId: { type: ObjectId, ref: 'Skill', required: true, unique: true },
  method: { type: String, enum: ['linear_regression'], default: 'linear_regression' },
  history: [point],
  predictions: [predicted],
  growthPct: Number,
  trend: { type: String, enum: TRENDS },
  metrics: { mae: Number, mape: Number, naiveMae: Number, naiveMape: Number, beatsNaive: Boolean },
  params: { slope: Number, intercept: Number },
  source: { type: String, default: 'synthetic' },
}, { timestamps: true });
export default mongoose.model('Forecast', schema);
