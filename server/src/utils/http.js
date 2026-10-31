import mongoose from 'mongoose';
export function ok(res, data, status = 200) { return res.status(status).json({ success: true, data }); }
export class AppError extends Error {
  constructor(status, code, message) {
    super(message); this.name = 'AppError'; this.status = status; this.code = code;
  }
}
export const isValidId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id);
