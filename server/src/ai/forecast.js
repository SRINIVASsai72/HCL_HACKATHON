import { AppError } from '../utils/http.js';

export function linearForecast(values, steps) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'linearForecast not implemented yet');
}

export function backtest(values) {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'backtest not implemented yet');
}

export async function runAllForecasts() {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'runAllForecasts not implemented yet');
}

