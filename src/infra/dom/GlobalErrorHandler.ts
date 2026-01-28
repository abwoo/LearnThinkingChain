/**
 * Global Error Handler - 全局错误处理器
 * 
 * Captures DOM-selection failures, storage-quota exceeded errors,
 * and provides user-friendly fallback UI
 */

import { defaultLogger, Logger } from '../../utils/logger';
import { ShadowHost } from '../../ui/shadow/ShadowHost';

export interface ErrorContext {
  type: 'dom_selection' | 'storage_quota' | 'network' | 'unknown';
  message: string;
  details?: any;
  recoverable: boolean;
}

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  timestamp: number;
  dismissed: boolean;
}

export class GlobalErrorHandler {
  private readonly logger: Logger;
  private shadowHost: ShadowHost | null = null;
  private errorNotifications: ErrorNotification[] = [];
  private readonly maxNotifications = 10;

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
    this.setupGlobalHandlers();
  }

  /**
   * Set shadow host for error UI
   */
  setShadowHost(shadowHost: ShadowHost): void {
    this.shadowHost = shadowHost;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'unknown',
        message: event.reason?.message || 'Unhandled promise rejection',
        details: event.reason,
        recoverable: true
      });
    });

    // Handle general errors
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'unknown',
        message: event.message || 'Unknown error',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        },
        recoverable: true
      });
    });
  }

  /**
   * Handle DOM selection failures
   */
  handleDOMSelectionFailure(
    selector: string,
    context?: string
  ): void {
    this.handleError({
      type: 'dom_selection',
      message: `Failed to find element with selector: ${selector}`,
      details: { selector, context },
      recoverable: true
    });

    // Show fallback UI
    this.showFallbackUI('DOM selection failed', `Could not find: ${selector}`);
  }

  /**
   * Handle storage quota exceeded
   */
  async handleStorageQuotaExceeded(
    operation: string,
    attemptedSize: number
  ): Promise<void> {
    this.handleError({
      type: 'storage_quota',
      message: 'Storage quota exceeded',
      details: { operation, attemptedSize },
      recoverable: true
    });

    // Try to free up space
    await this.freeStorageSpace();

    // Show notification
    this.showNotification({
      type: 'warning',
      message: 'Storage quota exceeded. Cleared old data.',
      details: 'Some old logs and errors have been removed to free up space.'
    });
  }

  /**
   * Handle network errors
   */
  handleNetworkError(
    url: string,
    error: any
  ): void {
    this.handleError({
      type: 'network',
      message: `Network request failed: ${url}`,
      details: error,
      recoverable: true
    });

    this.showNotification({
      type: 'error',
      message: 'Network error',
      details: `Failed to connect to: ${url}`
    });
  }

  /**
   * Generic error handler
   */
  handleError(context: ErrorContext): void {
    this.logger.error('GlobalErrorHandler: Error caught', context);

    // Store error notification
    const notification: ErrorNotification = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: context.type === 'storage_quota' ? 'warning' : 'error',
      message: context.message,
      details: context.details ? JSON.stringify(context.details, null, 2) : undefined,
      timestamp: Date.now(),
      dismissed: false
    };

    this.errorNotifications.push(notification);

    // Keep only recent notifications
    if (this.errorNotifications.length > this.maxNotifications) {
      this.errorNotifications.shift();
    }

    // Show in UI if shadow host is available
    if (this.shadowHost) {
      this.renderErrorUI();
    }

    // Store errors for debugging
    this.storeError(notification);
  }

  /**
   * Free up storage space
   */
  private async freeStorageSpace(): Promise<void> {
    try {
      // Get all storage keys
      const allData = await chrome.storage.local.get(null);
      const keys = Object.keys(allData);

      // Sort by size (estimate) and remove old logs/errors first
      const priorityKeys = [
        'ltc_logs',
        'ltc_errors',
        'ltc_history'
      ];

      for (const key of priorityKeys) {
        if (keys.includes(key)) {
          try {
            const data = allData[key];
            if (Array.isArray(data) && data.length > 50) {
              // Keep only last 50 entries
              await chrome.storage.local.set({
                [key]: data.slice(-50)
              });
              this.logger.info(`GlobalErrorHandler: Trimmed ${key}`);
            }
          } catch (err) {
            // If trimming fails, remove the key entirely
            await chrome.storage.local.remove(key);
            this.logger.warn(`GlobalErrorHandler: Removed ${key} due to error`);
          }
        }
      }
    } catch (error) {
      this.logger.error('GlobalErrorHandler: Error freeing storage', error);
    }
  }

  /**
   * Show fallback UI
   */
  private showFallbackUI(title: string, message: string): void {
    if (!this.shadowHost) return;

    const root = this.shadowHost.getRoot();
    if (!root) return;

    // Remove existing fallback UI
    const existing = root.querySelector('.ltc-fallback-ui');
    if (existing) existing.remove();

    // Create fallback UI
    const fallback = document.createElement('div');
    fallback.className = 'ltc-fallback-ui';
    fallback.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      width: 300px;
      background: rgba(255, 59, 48, 0.95);
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 999998;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
    `;
    fallback.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px;">${title}</div>
      <div style="opacity: 0.9;">${message}</div>
      <button style="margin-top: 12px; padding: 6px 12px; background: white; color: #ff3b30; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
        Dismiss
      </button>
    `;

    fallback.querySelector('button')?.addEventListener('click', () => {
      fallback.remove();
    });

    root.appendChild(fallback);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      fallback.remove();
    }, 10000);
  }

  /**
   * Show notification
   */
  showNotification(notification: Omit<ErrorNotification, 'id' | 'timestamp' | 'dismissed'>): void {
    const fullNotification: ErrorNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      dismissed: false
    };

    this.errorNotifications.push(fullNotification);
    if (this.errorNotifications.length > this.maxNotifications) {
      this.errorNotifications.shift();
    }

    if (this.shadowHost) {
      this.renderErrorUI();
    }
  }

  /**
   * Render error UI in shadow DOM
   */
  private renderErrorUI(): void {
    if (!this.shadowHost) return;

    const root = this.shadowHost.getRoot();
    if (!root) return;

    // Remove existing error UI
    const existing = root.querySelector('.ltc-error-panel');
    if (existing) existing.remove();

    const recentErrors = this.errorNotifications
      .filter(n => !n.dismissed)
      .slice(-5);

    if (recentErrors.length === 0) return;

    const errorPanel = document.createElement('div');
    errorPanel.className = 'ltc-error-panel';
    errorPanel.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      max-height: 200px;
      overflow-y: auto;
      background: rgba(17, 25, 40, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 59, 48, 0.3);
      border-radius: 8px;
      padding: 12px;
      z-index: 999997;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      color: white;
    `;

    errorPanel.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 8px; color: #ff3b30;">
        Recent Errors (${recentErrors.length})
      </div>
      ${recentErrors.map(err => `
        <div style="margin-bottom: 8px; padding: 8px; background: rgba(255, 59, 48, 0.1); border-radius: 4px;">
          <div style="font-weight: 500; margin-bottom: 4px;">${err.message}</div>
          ${err.details ? `<div style="opacity: 0.7; font-size: 11px;">${err.details.substring(0, 100)}...</div>` : ''}
        </div>
      `).join('')}
      <button style="margin-top: 8px; padding: 6px 12px; width: 100%; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; cursor: pointer;">
        Dismiss All
      </button>
    `;

    errorPanel.querySelector('button')?.addEventListener('click', () => {
      this.errorNotifications.forEach(n => n.dismissed = true);
      errorPanel.remove();
    });

    root.appendChild(errorPanel);
  }

  /**
   * Store error for debugging
   */
  private async storeError(notification: ErrorNotification): Promise<void> {
    try {
      const errors = await chrome.storage.local.get('ltc_global_errors');
      const errorList = errors.ltc_global_errors || [];
      
      errorList.push(notification);
      
      // Keep only last 50 errors
      if (errorList.length > 50) {
        errorList.shift();
      }

      await chrome.storage.local.set({ ltc_global_errors: errorList });
    } catch (error) {
      // Ignore storage errors to prevent infinite loop
      this.logger.warn('GlobalErrorHandler: Failed to store error', error);
    }
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limit: number = 10): Promise<ErrorNotification[]> {
    try {
      const errors = await chrome.storage.local.get('ltc_global_errors');
      const errorList = errors.ltc_global_errors || [];
      return errorList.slice(-limit);
    } catch {
      return [];
    }
  }

  /**
   * Clear all errors
   */
  async clearErrors(): Promise<void> {
    this.errorNotifications = [];
    try {
      await chrome.storage.local.remove('ltc_global_errors');
    } catch {
      // Ignore
    }
    if (this.shadowHost) {
      const root = this.shadowHost.getRoot();
      root?.querySelector('.ltc-error-panel')?.remove();
    }
  }
}
