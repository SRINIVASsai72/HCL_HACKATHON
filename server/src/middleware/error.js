import { AppError } from '../utils/http.js';
export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'));
}
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err instanceof AppError ? err.status : 500;
  const code = err instanceof AppError ? err.code : 'SERVER_ERROR';
  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, code, message: status >= 500 && code === 'SERVER_ERROR' ? 'Internal server error' : err.message });
}
