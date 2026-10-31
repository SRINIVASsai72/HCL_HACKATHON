import jwt from 'jsonwebtoken';
import { AppError, isValidId } from '../utils/http.js';
export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: payload.userId, role: payload.role, employeeId: payload.employeeId };
    next();
  } catch { next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token')); }
}
export function requireHR(req, res, next) {
  if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  if (req.user.role !== 'hr') return next(new AppError(403, 'FORBIDDEN', 'HR access only'));
  next();
}
// Pass the URL parameter name: requireSelfOrHR('employeeId') or requireSelfOrHR('id').
export function requireSelfOrHR(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) return next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
    if (req.user.role === 'hr') return next();
    const requestedId = req.params[paramName];
    if (!isValidId(requestedId)) return next(new AppError(400, 'BAD_REQUEST', 'Invalid employee id'));
    if (String(req.user.employeeId) !== String(requestedId)) return next(new AppError(403, 'FORBIDDEN', 'Cannot access another employee'));
    next();
  };
}
