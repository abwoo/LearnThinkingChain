/**
 * Request Interceptor - 请求拦截器
 * 
 * Captures user input at the capture phase, preventing original React events
 * until PromptMiddleware resolves
 */

import { defaultLogger, Logger } from '../../utils/logger';
import { getInputValue, InputElement } from '../../utils/dom';

export interface InterceptorOptions {
  inputSelectors: string[];
  submitSelectors: string[];
  onIntercept: (value: string, element: InputElement) => Promise<string | null>;
  logger?: Logger;
  maxRetries?: number;
  retryDelay?: number;
}

export interface InterceptionResult {
  intercepted: boolean;
  processedValue: string | null;
  originalValue: string;
}

export class RequestInterceptor {
  private readonly inputSelectors: string[];
  private readonly submitSelectors: string[];
  private readonly onIntercept: (value: string, element: InputElement) => Promise<string | null>;
  private readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly retryDelay: number;

  private inputElement: InputElement | null = null;
  private isProcessing = false;
  private pendingValue: string | null = null;
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;

  // Event handlers (bound methods)
  private handleKeydownCapture: (e: KeyboardEvent) => void;
  private handleSubmitCapture: (e: MouseEvent | KeyboardEvent) => void;
  private handleInputCapture: (e: Event) => void;

  constructor(options: InterceptorOptions) {
    this.inputSelectors = options.inputSelectors;
    this.submitSelectors = options.submitSelectors;
    this.onIntercept = options.onIntercept;
    this.logger = options.logger ?? defaultLogger;
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelay = options.retryDelay ?? 100;

    // Bind event handlers
    this.handleKeydownCapture = this.onKeydownCapture.bind(this);
    this.handleSubmitCapture = this.onSubmitCapture.bind(this);
    this.handleInputCapture = this.onInputCapture.bind(this);
  }

  /**
   * Start intercepting input events
   */
  start(): void {
    this.logger.info('RequestInterceptor: Starting interception');
    
    // Use capture phase to intercept before React
    document.addEventListener('keydown', this.handleKeydownCapture, true);
    document.addEventListener('click', this.handleSubmitCapture, true);
    document.addEventListener('submit', this.handleSubmitCapture, true);
    
    // Monitor for input element changes
    this.observeInputElement();
  }

  /**
   * Stop intercepting
   */
  stop(): void {
    this.logger.info('RequestInterceptor: Stopping interception');
    
    document.removeEventListener('keydown', this.handleKeydownCapture, true);
    document.removeEventListener('click', this.handleSubmitCapture, true);
    document.removeEventListener('submit', this.handleSubmitCapture, true);
    
    this.inputElement = null;
    this.isProcessing = false;
    this.pendingValue = null;
  }

  /**
   * Capture phase handler for keydown (Enter key)
   */
  private onKeydownCapture(event: KeyboardEvent): void {
    // Only intercept Enter key (without Shift)
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (event.isComposing) return;

    // Check if target is an input element
    const target = event.target as HTMLElement;
    if (!this.isInputElement(target)) return;

    // Stop propagation immediately
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();

    this.logger.debug('RequestInterceptor: Intercepted Enter key');

    // Process interception
    this.processInterception(target as InputElement, event);
  }

  /**
   * Capture phase handler for submit actions
   */
  private onSubmitCapture(event: MouseEvent | KeyboardEvent): void {
    const target = event.target as HTMLElement;
    
    // Check if it's a submit button
    const submitButton = target.closest?.(this.submitSelectors.join(', '));
    if (!submitButton) return;

    // Stop propagation
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();

    this.logger.debug('RequestInterceptor: Intercepted submit button click');

    // Find associated input element
    const input = this.findInputElement();
    if (input) {
      this.processInterception(input, event);
    }
  }

  /**
   * Capture phase handler for input events
   */
  private onInputCapture(event: Event): void {
    const target = event.target as HTMLElement;
    if (this.isInputElement(target)) {
      this.inputElement = target as InputElement;
    }
  }

  /**
   * Process intercepted input through middleware
   */
  private async processInterception(
    element: InputElement,
    originalEvent: Event
  ): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('RequestInterceptor: Already processing, ignoring duplicate');
      return;
    }

    const originalValue = getInputValue(element);
    if (!originalValue || originalValue.trim().length === 0) {
      // Allow empty submissions to pass through
      this.allowEvent(originalEvent);
      return;
    }

    // Check if already wrapped
    if (originalValue.includes('<<<LTC_START>>>')) {
      this.logger.debug('RequestInterceptor: Already wrapped, allowing through');
      this.allowEvent(originalEvent);
      return;
    }

    this.isProcessing = true;
    this.pendingValue = originalValue;

    try {
      // Call middleware
      const processedValue = await this.onIntercept(originalValue, element);

      if (processedValue === null) {
        // Middleware rejected, allow original
        this.logger.debug('RequestInterceptor: Middleware rejected, allowing original');
        this.allowEvent(originalEvent);
        this.resetProcessing();
        return;
      }

      // Update input with processed value
      this.setInputValue(element, processedValue);

      // Wait a tick for React to see the change
      await new Promise(resolve => setTimeout(resolve, 50));

      // Re-dispatch the event to allow React to handle it
      this.logger.debug('RequestInterceptor: Re-dispatching event with processed value');
      this.replayEvent(originalEvent, element);

      this.resetProcessing();
      this.failureCount = 0; // Reset on success

    } catch (error) {
      this.logger.error('RequestInterceptor: Error processing interception', error);
      this.failureCount++;

      // Circuit breaker: if too many failures, fallback
      if (this.failureCount >= this.MAX_FAILURES) {
        this.logger.error('RequestInterceptor: Circuit breaker triggered, falling back');
        this.allowEvent(originalEvent);
      }

      this.resetProcessing();
    }
  }

  /**
   * Allow original event to proceed
   */
  private allowEvent(event: Event): void {
    // Remove our listeners temporarily
    document.removeEventListener('keydown', this.handleKeydownCapture, true);
    document.removeEventListener('click', this.handleSubmitCapture, true);
    document.removeEventListener('submit', this.handleSubmitCapture, true);

    // Re-dispatch the event
    const newEvent = new (event.constructor as any)(
      event.type,
      {
        ...(event as any),
        bubbles: true,
        cancelable: true
      }
    );
    
    (event.target as HTMLElement).dispatchEvent(newEvent);

    // Re-attach listeners
    setTimeout(() => {
      document.addEventListener('keydown', this.handleKeydownCapture, true);
      document.addEventListener('click', this.handleSubmitCapture, true);
      document.addEventListener('submit', this.handleSubmitCapture, true);
    }, 100);
  }

  /**
   * Replay event after processing
   */
  private replayEvent(originalEvent: Event, element: InputElement): void {
    // Create a new synthetic event
    const eventType = originalEvent.type;
    const eventInit: any = {
      bubbles: true,
      cancelable: true
    };

    if (originalEvent instanceof KeyboardEvent) {
      eventInit.key = (originalEvent as KeyboardEvent).key;
      eventInit.code = (originalEvent as KeyboardEvent).code;
      eventInit.shiftKey = (originalEvent as KeyboardEvent).shiftKey;
      eventInit.ctrlKey = (originalEvent as KeyboardEvent).ctrlKey;
      eventInit.altKey = (originalEvent as KeyboardEvent).altKey;
    }

    const syntheticEvent = new (originalEvent.constructor as any)(eventType, eventInit);
    element.dispatchEvent(syntheticEvent);
  }

  /**
   * Set input value (handles both contenteditable and input/textarea)
   */
  private setInputValue(element: InputElement, value: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(element),
        'value'
      )?.set;
      
      if (setter) {
        setter.call(element, value);
      } else {
        element.value = value;
      }

      // Trigger React's onChange
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element instanceof HTMLElement && element.isContentEditable) {
      element.textContent = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /**
   * Check if element matches input selectors
   */
  private isInputElement(element: HTMLElement): boolean {
    return this.inputSelectors.some(selector => {
      try {
        return element.matches(selector) || element.closest(selector) !== null;
      } catch {
        return false;
      }
    });
  }

  /**
   * Find input element using selectors
   */
  private findInputElement(): InputElement | null {
    for (const selector of this.inputSelectors) {
      try {
        const el = document.querySelector(selector);
        if (el && (el instanceof HTMLInputElement || 
                    el instanceof HTMLTextAreaElement || 
                    (el instanceof HTMLElement && el.isContentEditable))) {
          return el as InputElement;
        }
      } catch {
        continue;
      }
    }
    return null;
  }

  /**
   * Observe for input element changes (MutationObserver)
   */
  private observeInputElement(): void {
    const observer = new MutationObserver(() => {
      if (!this.inputElement || !document.contains(this.inputElement)) {
        this.inputElement = this.findInputElement();
        if (this.inputElement) {
          this.logger.debug('RequestInterceptor: Input element re-attached');
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Reset processing state
   */
  private resetProcessing(): void {
    this.isProcessing = false;
    this.pendingValue = null;
  }
}
