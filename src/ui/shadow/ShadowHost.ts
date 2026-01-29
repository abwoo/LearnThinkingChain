/**
 * Shadow Host - Shadow DOM 宿主
 * 
 * Manages Shadow DOM root for UI injection, preventing CSS leaks
 */

import { defaultLogger, Logger } from '../../utils/logger';

export interface ShadowHostOptions {
  id?: string;
  styles?: string;
  logger?: Logger;
}

export class ShadowHost {
  private readonly id: string;
  private readonly logger: Logger;
  private hostElement: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private styles: string;

  constructor(options: ShadowHostOptions = {}) {
    this.id = options.id || 'ltc-shadow-host';
    this.logger = options.logger ?? defaultLogger;
    this.styles = options.styles || this.getDefaultStyles();
  }

  /**
   * Mount Shadow DOM to document
   */
  mount(): ShadowRoot {
    if (this.shadowRoot) {
      this.logger.warn('ShadowHost: Already mounted');
      return this.shadowRoot;
    }

    // Create host element
    this.hostElement = document.createElement('div');
    this.hostElement.id = this.id;
    this.hostElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999999;
    `;

    // Create shadow root
    this.shadowRoot = this.hostElement.attachShadow({ mode: 'open' });

    // Inject styles
    const styleElement = document.createElement('style');
    styleElement.textContent = this.styles;
    this.shadowRoot.appendChild(styleElement);

    // Append to document
    document.body.appendChild(this.hostElement);

    this.logger.info('ShadowHost: Mounted successfully');
    return this.shadowRoot;
  }

  /**
   * Unmount Shadow DOM
   */
  unmount(): void {
    if (this.hostElement && this.hostElement.parentNode) {
      this.hostElement.parentNode.removeChild(this.hostElement);
      this.hostElement = null;
      this.shadowRoot = null;
      this.logger.info('ShadowHost: Unmounted');
    }
  }

  /**
   * Get shadow root
   */
  getRoot(): ShadowRoot | null {
    return this.shadowRoot;
  }

  /**
   * Append element to shadow root
   */
  appendChild(element: HTMLElement): void {
    if (!this.shadowRoot) {
      throw new Error('ShadowHost: Not mounted');
    }
    this.shadowRoot.appendChild(element);
  }

  /**
   * Get default styles
   */
  private getDefaultStyles(): string {
    return `
      :host {
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        --glass-bg: rgba(17, 25, 40, 0.85);
        --glass-border: rgba(255, 255, 255, 0.15);
        --glass-blur: blur(25px) saturate(180%);
        --accent-blue: #007aff;
        --text-primary: #ffffff;
        --text-secondary: rgba(255, 255, 255, 0.7);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .ltc-root {
        pointer-events: none;
      }

      .ltc-hub {
        pointer-events: auto;
        position: fixed;
        top: 0;
        left: 0;
        width: 320px;
        min-height: 140px;
        background: var(--glass-bg);
        backdrop-filter: var(--glass-blur);
        -webkit-backdrop-filter: var(--glass-blur);
        border: 1px solid var(--glass-border);
        border-radius: 20px;
        color: var(--text-primary);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        overflow: hidden;
        transition: all 0.3s ease;
        display: flex;
        flex-direction: column;
      }

      .ltc-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        cursor: grab;
        background: rgba(255, 255, 255, 0.02);
        border-bottom: 1px solid transparent;
      }

      .ltc-header:active {
        cursor: grabbing;
      }

      .ltc-brand {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ltc-icon {
        color: var(--accent-blue);
        font-size: 14px;
      }

      .ltc-drag-handle {
        width: 30px;
        height: 4px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
      }

      .ltc-controls {
        padding: 12px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .ltc-trend {
        padding: 8px 12px;
        font-size: 11px;
        color: var(--text-secondary);
        background: rgba(255, 255, 255, 0.06);
        border-radius: 8px;
      }

      .ltc-expand-btn {
        margin: 0 12px 10px 12px;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-primary);
        border: 1px solid var(--glass-border);
        border-radius: 10px;
        cursor: pointer;
        font-size: 12px;
      }

      .ltc-panel {
        padding: 12px 18px 16px 18px;
        border-top: 1px solid var(--glass-border);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .ltc-section-title {
        font-size: 11px;
        letter-spacing: 0.6px;
        color: var(--text-secondary);
        text-transform: uppercase;
      }

      .ltc-protocol {
        white-space: pre-wrap;
        font-size: 11px;
        line-height: 1.4;
        background: rgba(255, 255, 255, 0.06);
        padding: 8px 10px;
        border-radius: 8px;
        color: var(--text-primary);
      }

      .ltc-path-map {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--text-secondary);
        flex-wrap: wrap;
      }

      .ltc-path-arrow {
        opacity: 0.6;
      }

      .ltc-history-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 160px;
        overflow-y: auto;
      }

      .ltc-history-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 10px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        font-size: 11px;
      }

      .ltc-history-item strong {
        color: var(--text-primary);
        font-weight: 600;
      }

      .ltc-history-item span {
        color: var(--text-secondary);
      }

      .ltc-empty {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.85);
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.04);
        border-radius: 6px;
      }

      .ltc-toggle-group {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .ltc-switch {
        position: relative;
        display: inline-block;
        width: 44px;
        height: 24px;
      }

      .ltc-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .ltc-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.2);
        transition: 0.3s;
        border-radius: 24px;
      }

      .ltc-slider:before {
        position: absolute;
        content: "";
        height: 18px;
        width: 18px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
      }

      input:checked + .ltc-slider {
        background-color: var(--accent-blue);
      }

      input:checked + .ltc-slider:before {
        transform: translateX(20px);
      }

      .ltc-select {
        flex: 1;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid var(--glass-border);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 12px;
        cursor: pointer;
        min-height: 32px;
        line-height: 1.4;
        appearance: none;
        -webkit-appearance: none;
        padding-right: 28px;
      }

      .ltc-select:focus {
        outline: none;
        border-color: var(--accent-blue);
      }

      .ltc-select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .ltc-select option {
        color: #ffffff;
        background: #0b1220;
      }

      .ltc-select-wrap {
        position: relative;
        flex: 1;
        display: flex;
        align-items: center;
      }

      .ltc-select-caret {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 11px;
        color: var(--text-secondary);
        pointer-events: none;
      }

      .ltc-status {
        padding: 8px 12px;
        background: rgba(0, 122, 255, 0.1);
        border-radius: 8px;
        font-size: 11px;
        text-align: center;
        color: var(--accent-blue);
      }

      .ltc-status.error {
        background: rgba(255, 59, 48, 0.1);
        color: #ff3b30;
      }

      .ltc-status.success {
        background: rgba(52, 199, 89, 0.1);
        color: #34c759;
      }
    `;
  }

  /**
   * Set custom styles
   */
  setStyles(styles: string): void {
    this.styles = styles;
    if (this.shadowRoot) {
      const styleElement = this.shadowRoot.querySelector('style');
      if (styleElement) {
        styleElement.textContent = styles;
      }
    }
  }
}
