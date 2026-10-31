import { AppError } from '../utils/http.js';

export async function buildReport() {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'buildReport not implemented yet');
}

