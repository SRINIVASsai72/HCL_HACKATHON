import { AppError } from '../utils/http.js';

export async function getGaps(employeeId, options) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'getGaps not implemented yet');
}

export async function getOrgReadiness() {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'getOrgReadiness not implemented yet');
}

