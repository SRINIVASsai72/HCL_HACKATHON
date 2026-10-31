import { AppError } from '../utils/http.js';

export async function employeeGraph(id) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'employeeGraph not implemented yet');
}

export async function skillGraph(id) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'skillGraph not implemented yet');
}

export async function graphStats() {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'graphStats not implemented yet');
}

