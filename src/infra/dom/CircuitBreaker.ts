/**
 * Circuit Breaker - 熔断器
 * 
 * Prevents cascading failures when DOM manipulation fails repeatedly
 */

import { defaultLogger, Logger } from '../../utils/logger';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  logger?: Logger;
}

export enum CircuitState {
  CLOSED = 'closed',    // Normal operation
  OPEN = 'open',        // Failing, reject requests
  HALF_OPEN = 'half_open' // Testing if recovered
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly logger: Logger;
  private resetTimer: number | null = null;
  private lastFailureTime: number = 0;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 seconds
    this.logger = options.logger ?? defaultLogger;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      this.logger.warn('CircuitBreaker: Circuit is OPEN, rejecting request');
      
      if (fallback) {
        return await Promise.resolve(fallback());
      }
      
      throw new Error('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      
      if (fallback) {
        this.logger.warn('CircuitBreaker: Using fallback after failure');
        return await Promise.resolve(fallback());
      }
      
      throw error;
    }
  }

  /**
   * Record success
   */
  private onSuccess(): void {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.logger.info('CircuitBreaker: Recovered, closing circuit');
      this.state = CircuitState.CLOSED;
    }
  }

  /**
   * Record failure
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    this.logger.warn(
      `CircuitBreaker: Failure recorded (${this.failureCount}/${this.failureThreshold})`
    );

    if (this.failureCount >= this.failureThreshold) {
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    if (this.state === CircuitState.OPEN) return;

    this.state = CircuitState.OPEN;
    this.logger.error('CircuitBreaker: Circuit OPENED due to repeated failures');

    // Schedule reset attempt
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }

    this.resetTimer = window.setTimeout(() => {
      this.attemptReset();
    }, this.resetTimeout);
  }

  /**
   * Attempt to reset circuit to half-open
   */
  private attemptReset(): void {
    this.state = CircuitState.HALF_OPEN;
    this.failureCount = 0;
    this.logger.info('CircuitBreaker: Attempting reset, moving to HALF_OPEN');
  }

  /**
   * Manually reset circuit
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = 0;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }

    this.logger.info('CircuitBreaker: Manually reset');
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get failure count
   */
  getFailureCount(): number {
    return this.failureCount;
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED;
  }
}
