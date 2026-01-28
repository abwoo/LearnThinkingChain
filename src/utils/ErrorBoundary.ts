/**
 * Error Boundary - 错误边界
 * 
 * Catches and logs errors, prevents extension crash
 */

import { defaultLogger, Logger } from './logger';

export interface ErrorInfo {
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

export class ErrorBoundary {
  private readonly logger: Logger;
  private errorCount = 0;
  private readonly maxErrors = 10;
  private errorWindow: number[] = [];
  private readonly errorWindowSize = 60000; // 1 minute

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  /**
   * Wrap async function with error handling
   */
  async wrap<T>(
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Wrap sync function with error handling
   */
  wrapSync<T>(
    fn: () => T,
    context?: Record<string, unknown>
  ): T | null {
    try {
      return fn();
    } catch (error) {
      return this.handleError(error, context);
    }
  }

  /**
   * Handle error
   */
  private handleError(
    error: unknown,
    context?: Record<string, unknown>
  ): null {
    const now = Date.now();
    
    // Clean old errors from window
    this.errorWindow = this.errorWindow.filter(
      timestamp => now - timestamp < this.errorWindowSize
    );

    // Check error rate
    this.errorWindow.push(now);
    if (this.errorWindow.length > this.maxErrors) {
      this.logger.error('ErrorBoundary: Too many errors, throttling');
      return null;
    }

    // Log error
    const errorInfo: ErrorInfo = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context,
      timestamp: now
    };

    this.logger.error('ErrorBoundary: Caught error', errorInfo);

    // Store error for debugging
    this.storeError(errorInfo);

    return null;
  }

  /**
   * Store error for later retrieval
   */
  private async storeError(errorInfo: ErrorInfo): Promise<void> {
    try {
      const errors = await chrome.storage.local.get('ltc_errors') as { ltc_errors?: ErrorInfo[] };
      const errorList = Array.isArray(errors.ltc_errors) ? errors.ltc_errors : [];
      
      errorList.push(errorInfo);
      
      // Keep only last 50 errors
      if (errorList.length > 50) {
        errorList.shift();
      }

      await chrome.storage.local.set({ ltc_errors: errorList });
    } catch (err) {
      // Ignore storage errors
    }
  }

  /**
   * Get stored errors
   */
  async getStoredErrors(): Promise<ErrorInfo[]> {
    try {
      const errors = await chrome.storage.local.get('ltc_errors') as { ltc_errors?: ErrorInfo[] };
      return Array.isArray(errors.ltc_errors) ? errors.ltc_errors : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  async clearErrors(): Promise<void> {
    try {
      await chrome.storage.local.remove('ltc_errors');
      this.errorWindow = [];
      this.errorCount = 0;
    } catch {
      // Ignore
    }
  }
}
