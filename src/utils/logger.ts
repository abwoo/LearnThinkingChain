/**
 * Logger - 日志系统
 * 
 * Centralized logging with levels and context
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: unknown;
  timestamp: number;
}

export interface Logger {
  debug(message: string, context?: unknown): void;
  info(message: string, context?: unknown): void;
  warn(message: string, context?: unknown): void;
  error(message: string, context?: unknown): void;
}

class ConsoleLogger implements Logger {
  private readonly minLevel: LogLevel;
  private readonly enableStorage: boolean;
  private logBuffer: LogEntry[] = [];
  private readonly maxBufferSize = 100;

  constructor(minLevel: LogLevel = LogLevel.INFO, enableStorage = false) {
    this.minLevel = minLevel;
    this.enableStorage = enableStorage;
  }

  debug(message: string, context?: unknown): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: unknown): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: unknown): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: unknown): void {
    this.log(LogLevel.ERROR, message, context);
  }

  private log(level: LogLevel, message: string, context?: unknown): void {
    if (level < this.minLevel) return;

    const entry: LogEntry = {
      level,
      message,
      context,
      timestamp: Date.now()
    };

    // Console output
    const prefix = `[LTC ${LogLevel[level]}]`;
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, context || '');
        break;
      case LogLevel.INFO:
        console.info(prefix, message, context || '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, context || '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, context || '');
        break;
    }

    // Buffer for storage
    if (this.enableStorage) {
      this.logBuffer.push(entry);
      if (this.logBuffer.length > this.maxBufferSize) {
        this.logBuffer.shift();
      }
      this.flushToStorage();
    }
  }

  private async flushToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({ ltc_logs: this.logBuffer });
    } catch {
      // Ignore storage errors
    }
  }

  async getLogs(): Promise<LogEntry[]> {
    try {
      const data = await chrome.storage.local.get('ltc_logs') as { ltc_logs?: LogEntry[] };
      return Array.isArray(data.ltc_logs) ? data.ltc_logs : [];
    } catch {
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await chrome.storage.local.remove('ltc_logs');
      this.logBuffer = [];
    } catch {
      // Ignore
    }
  }
}

// Default logger instance
export const defaultLogger = new ConsoleLogger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  true
);
