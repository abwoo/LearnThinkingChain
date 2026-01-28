import { DomObserver } from './DomObserver';
import { ExponentialBackoff } from '../utils/backoff';
import { defaultLogger, Logger } from '../utils/logger';
import { elementIsAttached, getInputValue, InputElement } from '../utils/dom';

export interface InputInterceptorOptions {
  selectors: string[];
  sendButtonSelectors?: string[];
  backoff?: {
    minMs: number;
    maxMs: number;
    factor?: number;
    jitter?: number;
  };
  onReady?: (el: InputElement) => void;
  onSubmit?: (value: string, el: InputElement) => void;
  onInput?: (value: string, el: InputElement) => void;
  logger?: Logger;
}

export class InputInterceptor {
  private readonly selectors: string[];
  private readonly sendButtonSelectors: string[];
  private readonly onReady?: (el: InputElement) => void;
  private readonly onSubmit?: (value: string, el: InputElement) => void;
  private readonly onInput?: (value: string, el: InputElement) => void;
  private readonly logger: Logger;
  private readonly backoff: ExponentialBackoff;
  private readonly domObserver: DomObserver;
  private running = false;
  private inputEl: InputElement | null = null;
  private retryTimer: number | null = null;
  private lastSubmitAt = 0;

  constructor(options: InputInterceptorOptions) {
    this.selectors = options.selectors;
    this.sendButtonSelectors = options.sendButtonSelectors ?? [
      'button[aria-label*="Send"]',
      'button[aria-label*="发送"]',
      'button[aria-label*="提交"]',
      'button[data-testid="send-button"]',
      'button[data-test-id="send-button"]'
    ];
    this.onReady = options.onReady;
    this.onSubmit = options.onSubmit;
    this.onInput = options.onInput;
    this.logger = options.logger ?? defaultLogger;
    this.backoff = new ExponentialBackoff({
      minMs: options.backoff?.minMs ?? 300,
      maxMs: options.backoff?.maxMs ?? 8000,
      factor: options.backoff?.factor,
      jitter: options.backoff?.jitter
    });
    this.domObserver = new DomObserver(() => this.handleDomChange());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.domObserver.start();
    this.scheduleFind();
    document.addEventListener('click', this.handleSendClick, true);
  }

  stop(): void {
    this.running = false;
    this.domObserver.stop();
    this.detach();
    document.removeEventListener('click', this.handleSendClick, true);
    if (this.retryTimer) {
      window.clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  setValue(value: string): void {
    if (!this.inputEl) return;
    if (this.inputEl instanceof HTMLTextAreaElement || this.inputEl instanceof HTMLInputElement) {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(this.inputEl),
        'value'
      )?.set;
      if (setter) setter.call(this.inputEl, value);
      else this.inputEl.value = value;
      this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      this.inputEl.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    if (this.inputEl instanceof HTMLElement) {
      this.inputEl.innerText = value;
      this.inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      this.inputEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  private handleDomChange(): void {
    if (!this.running) return;
    if (this.inputEl && !elementIsAttached(this.inputEl)) {
      this.logger.warn('Input element detached, re-binding...');
      this.detach();
      this.scheduleFind(true);
      return;
    }
    if (!this.inputEl) {
      this.scheduleFind();
    }
  }

  private scheduleFind(forceReset = false): void {
    if (!this.running) return;
    if (this.inputEl) return;
    if (forceReset) this.backoff.reset();
    if (this.retryTimer) return;
    const delay = this.backoff.nextDelay();
    this.retryTimer = window.setTimeout(() => {
      this.retryTimer = null;
      this.findAndAttach();
    }, delay);
  }

  private findAndAttach(): void {
    if (!this.running || this.inputEl) return;
    const el = this.findInput();
    if (!el) {
      this.scheduleFind();
      return;
    }
    this.attach(el);
    this.backoff.reset();
  }

  private findInput(): InputElement | null {
    for (const selector of this.selectors) {
      const el = document.querySelector(selector);
      if (!el) continue;
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) return el;
      if (el instanceof HTMLElement) return el;
    }
    return null;
  }

  private attach(el: InputElement): void {
    this.inputEl = el;
    this.logger.info('Input element attached', el);
    this.onReady?.(el);
    el.addEventListener('keydown', this.handleKeydown, true);
    el.addEventListener('input', this.handleInput, true);
  }

  private detach(): void {
    if (!this.inputEl) return;
    this.inputEl.removeEventListener('keydown', this.handleKeydown, true);
    this.inputEl.removeEventListener('input', this.handleInput, true);
    this.inputEl = null;
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (!this.inputEl) return;
    if (event.isComposing) return;
    if (event.key !== 'Enter' || event.shiftKey) return;
    this.triggerSubmit();
  };

  private handleInput = (): void => {
    if (!this.inputEl) return;
    const value = getInputValue(this.inputEl);
    if (!value) return;
    this.onInput?.(value, this.inputEl);
  };

  private handleSendClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    const button = target.closest(this.sendButtonSelectors.join(','));
    if (!button) return;
    this.triggerSubmit();
  };

  private triggerSubmit(): void {
    if (!this.inputEl) return;
    const now = Date.now();
    if (now - this.lastSubmitAt < 1000) return;
    const value = getInputValue(this.inputEl);
    if (!value) return;
    this.lastSubmitAt = now;
    this.onSubmit?.(value, this.inputEl);
  }
}
