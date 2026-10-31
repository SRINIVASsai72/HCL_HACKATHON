import { AppError } from '../utils/http.js';

export async function embed(texts) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'embed not implemented yet');
}

export function cosine(a, b) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'cosine not implemented yet');
}

