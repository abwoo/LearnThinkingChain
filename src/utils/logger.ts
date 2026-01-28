export interface Logger {
  info(message: string, payload?: unknown): void;
  warn(message: string, payload?: unknown): void;
  error(message: string, payload?: unknown): void;
}

export const defaultLogger: Logger = {
  info: (message, payload) => console.log(`[LTC] ${message}`, payload ?? ''),
  warn: (message, payload) => console.warn(`[LTC] ${message}`, payload ?? ''),
  error: (message, payload) => console.error(`[LTC] ${message}`, payload ?? '')
};
