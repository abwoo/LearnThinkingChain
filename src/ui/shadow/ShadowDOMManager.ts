/**
 * Shadow DOM Manager - Shadow DOM 管理器
 * 
 * Ensures all UI toggles are injected via a resilient Shadow Root
 * that ignores host CSS
 */

import { ShadowHost } from './ShadowHost';
import { FloatingHub } from './FloatingHub';
import { defaultLogger, Logger } from '../../utils/logger';
import { GlobalErrorHandler } from '../../infra/dom/GlobalErrorHandler';

export interface UIElements {
  floatingHub?: FloatingHub;
  errorPanel?: HTMLElement;
  notificationPanel?: HTMLElement;
}

export class ShadowDOMManager {
  private readonly logger: Logger;
  private shadowHost: ShadowHost | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private uiElements: UIElements = {};
  private errorHandler: GlobalErrorHandler | null = null;
  private isMounted = false;

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  /**
   * Initialize and mount Shadow DOM
   */
  async initialize(errorHandler?: GlobalErrorHandler): Promise<boolean> {
    try {
      this.errorHandler = errorHandler || null;

      // Create shadow host
      this.shadowHost = new ShadowHost({
        id: 'ltc-shadow-manager',
        logger: this.logger
      });

      // Mount shadow root
      this.shadowRoot = this.shadowHost.mount();
      this.isMounted = true;

      // Set error handler's shadow host
      if (this.errorHandler) {
        this.errorHandler.setShadowHost(this.shadowHost);
      }

      // Inject base styles
      this.injectBaseStyles();

      // Setup mutation observer for resilience
      this.setupResilienceObserver();

      this.logger.info('ShadowDOMManager: Initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('ShadowDOMManager: Failed to initialize', error);
      return false;
    }
  }

  /**
   * Inject floating hub UI
   */
  injectFloatingHub(
    props: Parameters<FloatingHub['render']>[0]
  ): FloatingHub | null {
    if (!this.shadowRoot) {
      this.logger.error('ShadowDOMManager: Shadow root not mounted');
      return null;
    }

    try {
      // Remove existing floating hub if any
      if (this.uiElements.floatingHub) {
        this.uiElements.floatingHub.unmount();
      }

      // Create new floating hub
      const floatingHub = new FloatingHub(this.shadowRoot);
      floatingHub.render(props);
      this.uiElements.floatingHub = floatingHub;

      this.logger.debug('ShadowDOMManager: Floating hub injected');
      return floatingHub;
    } catch (error) {
      this.logger.error('ShadowDOMManager: Failed to inject floating hub', error);
      if (this.errorHandler) {
        this.errorHandler.handleError({
          type: 'dom_selection',
          message: 'Failed to inject floating hub',
          details: error,
          recoverable: true
        });
      }
      return null;
    }
  }

  /**
   * Inject error panel
   */
  injectErrorPanel(errors: Array<{ message: string; details?: string }>): void {
    if (!this.shadowRoot) return;

    try {
      // Remove existing error panel
      const existing = this.shadowRoot.querySelector('.ltc-error-panel');
      if (existing) existing.remove();

      if (errors.length === 0) return;

      const errorPanel = document.createElement('div');
      errorPanel.className = 'ltc-error-panel';
      errorPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        max-height: 300px;
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
        pointer-events: auto;
      `;

      errorPanel.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 8px; color: #ff3b30;">
          Errors (${errors.length})
        </div>
        ${errors.map(err => `
          <div style="margin-bottom: 8px; padding: 8px; background: rgba(255, 59, 48, 0.1); border-radius: 4px;">
            <div style="font-weight: 500; margin-bottom: 4px;">${this.escapeHtml(err.message)}</div>
            ${err.details ? `<div style="opacity: 0.7; font-size: 11px;">${this.escapeHtml(err.details.substring(0, 100))}...</div>` : ''}
          </div>
        `).join('')}
        <button class="ltc-dismiss-errors" style="margin-top: 8px; padding: 6px 12px; width: 100%; background: rgba(255, 255, 255, 0.1); color: white; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; cursor: pointer;">
          Dismiss All
        </button>
      `;

      errorPanel.querySelector('.ltc-dismiss-errors')?.addEventListener('click', () => {
        errorPanel.remove();
      });

      this.shadowRoot.appendChild(errorPanel);
      this.uiElements.errorPanel = errorPanel;

      this.logger.debug('ShadowDOMManager: Error panel injected');
    } catch (error) {
      this.logger.error('ShadowDOMManager: Failed to inject error panel', error);
    }
  }

  /**
   * Inject notification panel
   */
  injectNotification(
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    duration: number = 5000
  ): void {
    if (!this.shadowRoot) return;

    try {
      const notification = document.createElement('div');
      notification.className = 'ltc-notification';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        padding: 12px 16px;
        background: ${this.getNotificationColor(type)};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 999998;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        pointer-events: auto;
        animation: slideIn 0.3s ease-out;
      `;

      notification.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div>${this.escapeHtml(message)}</div>
          <button class="ltc-dismiss-notification" style="margin-left: 12px; background: transparent; border: none; color: white; cursor: pointer; font-size: 18px; line-height: 1;">×</button>
        </div>
      `;

      // Add animation keyframes if not already added
      if (!this.shadowRoot.querySelector('#ltc-notification-styles')) {
        const style = document.createElement('style');
        style.id = 'ltc-notification-styles';
        style.textContent = `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `;
        this.shadowRoot.appendChild(style);
      }

      notification.querySelector('.ltc-dismiss-notification')?.addEventListener('click', () => {
        notification.remove();
      });

      this.shadowRoot.appendChild(notification);

      // Auto-dismiss
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideIn 0.3s ease-out reverse';
          setTimeout(() => notification.remove(), 300);
        }
      }, duration);

      this.logger.debug('ShadowDOMManager: Notification injected', { type, message });
    } catch (error) {
      this.logger.error('ShadowDOMManager: Failed to inject notification', error);
    }
  }

  /**
   * Inject base styles that ignore host CSS
   */
  private injectBaseStyles(): void {
    if (!this.shadowRoot) return;

    const style = document.createElement('style');
    style.id = 'ltc-base-styles';
    style.textContent = `
      /* Reset all styles to prevent host CSS interference */
      * {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      }

      /* Ensure our UI elements are not affected by host styles */
      .ltc-container,
      .ltc-error-panel,
      .ltc-notification {
        all: initial !important;
        display: block !important;
        position: fixed !important;
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      }

      /* Prevent host CSS from affecting our elements */
      .ltc-container *,
      .ltc-error-panel *,
      .ltc-notification * {
        font-family: inherit !important;
      }
    `;

    this.shadowRoot.appendChild(style);
  }

  /**
   * Setup resilience observer to handle DOM changes
   */
  private setupResilienceObserver(): void {
    if (!this.shadowRoot) return;

    // Observe shadow root for any removals
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            // If floating hub was removed, re-inject it
            if (node.classList.contains('ltc-container') && this.uiElements.floatingHub) {
              this.logger.warn('ShadowDOMManager: Floating hub removed, re-injecting...');
              // Note: Would need to store props to re-inject
            }
          }
        });
      });
    });

    observer.observe(this.shadowRoot, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Get notification color by type
   */
  private getNotificationColor(type: string): string {
    const colors: Record<string, string> = {
      info: 'rgba(0, 122, 255, 0.95)',
      success: 'rgba(52, 199, 89, 0.95)',
      warning: 'rgba(255, 149, 0, 0.95)',
      error: 'rgba(255, 59, 48, 0.95)'
    };
    return colors[type] || colors.info;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Get shadow root
   */
  getShadowRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  /**
   * Check if mounted
   */
  isShadowMounted(): boolean {
    return this.isMounted && this.shadowRoot !== null;
  }

  /**
   * Unmount and cleanup
   */
  unmount(): void {
    if (this.shadowHost) {
      this.shadowHost.unmount();
      this.shadowHost = null;
    }
    this.shadowRoot = null;
    this.uiElements = {};
    this.isMounted = false;
    this.logger.info('ShadowDOMManager: Unmounted');
  }
}
