// file: frontend/src/app/core/services/rate-limiting.service.ts
// author: Claude Code
// date: 2025-06-21
// description: Rate limiting service for authentication attempts with exponential backoff and brute force protection

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { map, filter } from 'rxjs/operators';

type AttemptType = 'email_check' | 'password_verify' | 'mfa_verify' | 'phone_verify';

interface RateLimitAttempt {
  timestamp: number;
  identifier: string;
  attemptType: AttemptType;
  success: boolean;
  userAgent?: string;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  exponentialBase: number;
  maxDelayMs: number;
  lockoutDurationMs: number;
  progressiveThresholds: number[];
}

interface RateLimitState {
  isLocked: boolean;
  remainingAttempts: number;
  nextAttemptAllowedAt: number;
  lockoutEndsAt: number;
  currentDelayMs: number;
  totalFailedAttempts: number;
}

interface AttackPattern {
  identifier: string;
  attempts: RateLimitAttempt[];
  consecutiveFailures: number;
  lastAttemptTime: number;
  isUnderAttack: boolean;
  lockoutLevel: number;
}

@Injectable({
  providedIn: 'root'
})
export class RateLimitingService {
  private readonly STORAGE_KEY_PREFIX = 'auth_rate_limit_';
  private readonly ATTACK_PATTERNS_KEY = 'auth_attack_patterns';
  
  // Rate limiting configurations for different attempt types
  private readonly configs: Record<AttemptType, RateLimitConfig> = {
    email_check: {
      maxAttempts: 10,
      windowMs: 15 * 60 * 1000, // 15 minutes
      exponentialBase: 2,
      maxDelayMs: 30 * 1000, // 30 seconds max delay
      lockoutDurationMs: 15 * 60 * 1000, // 15 minute lockout
      progressiveThresholds: [3, 5, 7, 10]
    },
    password_verify: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      exponentialBase: 2,
      maxDelayMs: 60 * 1000, // 1 minute max delay
      lockoutDurationMs: 30 * 60 * 1000, // 30 minute lockout
      progressiveThresholds: [2, 3, 4, 5]
    },
    mfa_verify: {
      maxAttempts: 3,
      windowMs: 10 * 60 * 1000, // 10 minutes
      exponentialBase: 3,
      maxDelayMs: 120 * 1000, // 2 minutes max delay
      lockoutDurationMs: 60 * 60 * 1000, // 1 hour lockout
      progressiveThresholds: [1, 2, 3]
    },
    phone_verify: {
      maxAttempts: 3,
      windowMs: 10 * 60 * 1000, // 10 minutes
      exponentialBase: 2,
      maxDelayMs: 60 * 1000, // 1 minute max delay
      lockoutDurationMs: 30 * 60 * 1000, // 30 minute lockout
      progressiveThresholds: [1, 2, 3]
    }
  };

  private rateLimitStates$ = new BehaviorSubject<Map<string, RateLimitState>>(new Map());
  private attackPatterns$ = new BehaviorSubject<Map<string, AttackPattern>>(new Map());

  constructor() {
    this.initializeRateLimiting();
    this.startCleanupTimer();
  }

  /**
   * Check if an attempt is allowed for the given identifier and type
   */
  public async isAttemptAllowed(
    identifier: string, 
    attemptType: AttemptType
  ): Promise<{ allowed: boolean; delayMs: number; reason?: string }> {
    const config = this.configs[attemptType];
    const rateLimitKey = this.getRateLimitKey(identifier, attemptType);
    const currentTime = Date.now();

    // Check for existing rate limit state
    let state = this.getRateLimitState(rateLimitKey);
    
    // Check if still in lockout period
    if (state.isLocked && currentTime < state.lockoutEndsAt) {
      const remainingLockoutMs = state.lockoutEndsAt - currentTime;
      return {
        allowed: false,
        delayMs: remainingLockoutMs,
        reason: `Account temporarily locked. Try again in ${Math.ceil(remainingLockoutMs / 1000)} seconds.`
      };
    }

    // Check if still within delay period from last failed attempt
    if (currentTime < state.nextAttemptAllowedAt) {
      const remainingDelayMs = state.nextAttemptAllowedAt - currentTime;
      return {
        allowed: false,
        delayMs: remainingDelayMs,
        reason: `Too many attempts. Wait ${Math.ceil(remainingDelayMs / 1000)} seconds before trying again.`
      };
    }

    // Clean expired lockout if time has passed
    if (state.isLocked && currentTime >= state.lockoutEndsAt) {
      state = this.resetRateLimitState(rateLimitKey);
    }

    // Check attack pattern for sophisticated attack detection
    const attackPattern = this.getAttackPattern(identifier);
    if (attackPattern.isUnderAttack) {
      const enhancedDelayMs = this.calculateAttackDelayMs(attackPattern, config);
      return {
        allowed: false,
        delayMs: enhancedDelayMs,
        reason: 'Suspicious activity detected. Extended delay applied.'
      };
    }

    return { allowed: true, delayMs: 0 };
  }

  /**
   * Record an authentication attempt
   */
  public recordAttempt(
    identifier: string,
    attemptType: AttemptType,
    success: boolean,
    userAgent?: string
  ): void {
    const config = this.configs[attemptType];
    const rateLimitKey = this.getRateLimitKey(identifier, attemptType);
    const currentTime = Date.now();

    // Create attempt record
    const attempt: RateLimitAttempt = {
      timestamp: currentTime,
      identifier,
      attemptType,
      success,
      userAgent
    };

    // Update attack pattern
    this.updateAttackPattern(identifier, attempt);

    // If successful, reset rate limiting for this type
    if (success) {
      this.resetRateLimitState(rateLimitKey);
      console.debug(`[RateLimitingService] Successful ${attemptType} for ${identifier} - rate limit reset`);
      return;
    }

    // Handle failed attempt
    let state = this.getRateLimitState(rateLimitKey);
    state.totalFailedAttempts++;
    
    // Calculate progressive delay based on failed attempts
    const delayMs = this.calculateExponentialDelay(state.totalFailedAttempts, config);
    state.nextAttemptAllowedAt = currentTime + delayMs;
    state.currentDelayMs = delayMs;

    // Check if lockout threshold reached
    if (state.totalFailedAttempts >= config.maxAttempts) {
      state.isLocked = true;
      state.lockoutEndsAt = currentTime + config.lockoutDurationMs;
      state.remainingAttempts = 0;
      console.warn(`[RateLimitingService] Account lockout triggered for ${identifier} (${attemptType})`);
    } else {
      state.remainingAttempts = config.maxAttempts - state.totalFailedAttempts;
    }

    // Persist state
    this.setRateLimitState(rateLimitKey, state);
    
    console.debug(`[RateLimitingService] Failed ${attemptType} for ${identifier}`, {
      remainingAttempts: state.remainingAttempts,
      delayMs: delayMs,
      isLocked: state.isLocked
    });
  }

  /**
   * Get current rate limit status for an identifier and type
   */
  public getRateLimitStatus(
    identifier: string,
    attemptType: AttemptType
  ): Observable<RateLimitState> {
    const rateLimitKey = this.getRateLimitKey(identifier, attemptType);
    return this.rateLimitStates$.pipe(
      map(states => states.get(rateLimitKey) || this.createInitialState()),
      filter(state => !!state)
    );
  }

  /**
   * Check if identifier is under attack
   */
  public isUnderAttack(identifier: string): boolean {
    const pattern = this.getAttackPattern(identifier);
    return pattern.isUnderAttack;
  }

  /**
   * Get attack statistics for monitoring
   */
  public getAttackStatistics(): Observable<{
    totalAttackedIdentifiers: number;
    activeAttacks: number;
    totalBlockedAttempts: number;
    recentAttackPatterns: AttackPattern[];
  }> {
    return this.attackPatterns$.pipe(
      map(patterns => {
        const patternArray = Array.from(patterns.values());
        const currentTime = Date.now();
        const recentThreshold = currentTime - (24 * 60 * 60 * 1000); // 24 hours

        const activeAttacks = patternArray.filter(p => 
          p.isUnderAttack && p.lastAttemptTime > recentThreshold
        );

        const totalBlockedAttempts = patternArray.reduce((total, pattern) => 
          total + pattern.attempts.filter(a => !a.success).length, 0
        );

        return {
          totalAttackedIdentifiers: patternArray.length,
          activeAttacks: activeAttacks.length,
          totalBlockedAttempts,
          recentAttackPatterns: activeAttacks.slice(0, 10) // Top 10 recent attacks
        };
      })
    );
  }

  /**
   * Clear rate limiting for identifier (admin function)
   */
  public clearRateLimit(identifier: string, attemptType?: AttemptType): void {
    if (attemptType) {
      const rateLimitKey = this.getRateLimitKey(identifier, attemptType);
      this.resetRateLimitState(rateLimitKey);
    } else {
      // Clear all rate limits for identifier
      const attemptTypes: AttemptType[] = ['email_check', 'password_verify', 'mfa_verify', 'phone_verify'];
      attemptTypes.forEach(type => {
        const rateLimitKey = this.getRateLimitKey(identifier, type);
        this.resetRateLimitState(rateLimitKey);
      });
    }
    
    // Reset attack pattern
    const patterns = this.attackPatterns$.value;
    patterns.delete(identifier);
    this.attackPatterns$.next(patterns);
    
    console.info(`[RateLimitingService] Rate limit cleared for ${identifier}`);
  }

  /**
   * Initialize rate limiting system
   */
  private initializeRateLimiting(): void {
    console.debug('[RateLimitingService] Initializing rate limiting protection');
    
    // Load existing attack patterns from storage
    this.loadAttackPatternsFromStorage();
    
    // Perform cleanup of expired entries
    this.cleanupExpiredEntries();
  }

  /**
   * Generate rate limit key for storage
   */
  private getRateLimitKey(identifier: string, attemptType: string): string {
    return `${this.STORAGE_KEY_PREFIX}${attemptType}_${identifier}`;
  }

  /**
   * Get rate limit state from memory/storage
   */
  private getRateLimitState(rateLimitKey: string): RateLimitState {
    const states = this.rateLimitStates$.value;
    let state = states.get(rateLimitKey);
    
    if (!state) {
      // Try to load from localStorage
      const stored = this.loadFromStorage(rateLimitKey);
      state = stored || this.createInitialState();
      states.set(rateLimitKey, state);
      this.rateLimitStates$.next(states);
    }
    
    return { ...state }; // Return copy to prevent mutations
  }

  /**
   * Set rate limit state in memory and storage
   */
  private setRateLimitState(rateLimitKey: string, state: RateLimitState): void {
    const states = this.rateLimitStates$.value;
    states.set(rateLimitKey, state);
    this.rateLimitStates$.next(states);
    
    // Persist to storage
    this.saveToStorage(rateLimitKey, state);
  }

  /**
   * Reset rate limit state
   */
  private resetRateLimitState(rateLimitKey: string): RateLimitState {
    const newState = this.createInitialState();
    this.setRateLimitState(rateLimitKey, newState);
    this.removeFromStorage(rateLimitKey);
    return newState;
  }

  /**
   * Create initial rate limit state
   */
  private createInitialState(): RateLimitState {
    return {
      isLocked: false,
      remainingAttempts: 0,
      nextAttemptAllowedAt: 0,
      lockoutEndsAt: 0,
      currentDelayMs: 0,
      totalFailedAttempts: 0
    };
  }

  /**
   * Calculate exponential delay with jitter
   */
  private calculateExponentialDelay(attemptCount: number, config: RateLimitConfig): number {
    const baseDelay = 1000; // 1 second base
    const exponentialDelay = baseDelay * Math.pow(config.exponentialBase, attemptCount - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000; // 0-1 second jitter
    
    // Cap at maximum delay
    const totalDelay = Math.min(exponentialDelay + jitter, config.maxDelayMs);
    
    return Math.floor(totalDelay);
  }

  /**
   * Update attack pattern for sophisticated detection
   */
  private updateAttackPattern(identifier: string, attempt: RateLimitAttempt): void {
    const patterns = this.attackPatterns$.value;
    let pattern = patterns.get(identifier);
    
    if (!pattern) {
      pattern = {
        identifier,
        attempts: [],
        consecutiveFailures: 0,
        lastAttemptTime: 0,
        isUnderAttack: false,
        lockoutLevel: 0
      };
    }
    
    // Add attempt to history
    pattern.attempts.push(attempt);
    pattern.lastAttemptTime = attempt.timestamp;
    
    // Keep only recent attempts (last hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    pattern.attempts = pattern.attempts.filter(a => a.timestamp > oneHourAgo);
    
    // Update consecutive failures
    if (attempt.success) {
      pattern.consecutiveFailures = 0;
      pattern.isUnderAttack = false;
      pattern.lockoutLevel = 0;
    } else {
      pattern.consecutiveFailures++;
    }
    
    // Detect attack patterns
    pattern.isUnderAttack = this.detectAttackPattern(pattern);
    
    patterns.set(identifier, pattern);
    this.attackPatterns$.next(patterns);
    
    // Persist attack patterns
    this.saveAttackPatternsToStorage();
  }

  /**
   * Detect sophisticated attack patterns
   */
  private detectAttackPattern(pattern: AttackPattern): boolean {
    const recentAttempts = pattern.attempts.filter(a => 
      a.timestamp > Date.now() - (15 * 60 * 1000) // Last 15 minutes
    );
    
    // High frequency attempts
    if (recentAttempts.length > 10) {
      return true;
    }
    
    // Multiple consecutive failures
    if (pattern.consecutiveFailures >= 5) {
      return true;
    }
    
    // Rapid succession attempts (more than 1 per second)
    const rapidAttempts = recentAttempts.filter((attempt, index) => {
      if (index === 0) return false;
      const prevAttempt = recentAttempts[index - 1];
      return attempt.timestamp - prevAttempt.timestamp < 1000;
    });
    
    if (rapidAttempts.length > 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Get attack pattern for identifier
   */
  private getAttackPattern(identifier: string): AttackPattern {
    const patterns = this.attackPatterns$.value;
    return patterns.get(identifier) || {
      identifier,
      attempts: [],
      consecutiveFailures: 0,
      lastAttemptTime: 0,
      isUnderAttack: false,
      lockoutLevel: 0
    };
  }

  /**
   * Calculate enhanced delay for attack patterns
   */
  private calculateAttackDelayMs(pattern: AttackPattern, config: RateLimitConfig): number {
    const baseDelayMs = config.maxDelayMs;
    const attackMultiplier = Math.min(pattern.lockoutLevel + 1, 5); // Max 5x multiplier
    return Math.min(baseDelayMs * attackMultiplier, 300000); // Max 5 minutes
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    // Clean up every 5 minutes
    timer(0, 5 * 60 * 1000).subscribe(() => {
      this.cleanupExpiredEntries();
    });
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const currentTime = Date.now();
    const states = this.rateLimitStates$.value;
    const patterns = this.attackPatterns$.value;
    
    // Clean expired rate limit states
    for (const [key, state] of states.entries()) {
      if (state.lockoutEndsAt > 0 && currentTime > state.lockoutEndsAt + (60 * 60 * 1000)) {
        states.delete(key);
        this.removeFromStorage(key);
      }
    }
    
    // Clean old attack patterns
    for (const [identifier, pattern] of patterns.entries()) {
      const lastActivity = pattern.lastAttemptTime;
      if (currentTime - lastActivity > (24 * 60 * 60 * 1000)) { // 24 hours
        patterns.delete(identifier);
      }
    }
    
    this.rateLimitStates$.next(states);
    this.attackPatterns$.next(patterns);
    this.saveAttackPatternsToStorage();
  }

  /**
   * Storage operations
   */
  private saveToStorage(key: string, state: RateLimitState): void {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn('[RateLimitingService] Failed to save to localStorage:', error);
    }
  }

  private loadFromStorage(key: string): RateLimitState | null {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('[RateLimitingService] Failed to load from localStorage:', error);
      return null;
    }
  }

  private removeFromStorage(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('[RateLimitingService] Failed to remove from localStorage:', error);
    }
  }

  private saveAttackPatternsToStorage(): void {
    try {
      const patterns = Array.from(this.attackPatterns$.value.entries());
      localStorage.setItem(this.ATTACK_PATTERNS_KEY, JSON.stringify(patterns));
    } catch (error) {
      console.warn('[RateLimitingService] Failed to save attack patterns:', error);
    }
  }

  private loadAttackPatternsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.ATTACK_PATTERNS_KEY);
      if (stored) {
        const patternsArray: [string, AttackPattern][] = JSON.parse(stored);
        const patterns = new Map<string, AttackPattern>(patternsArray);
        this.attackPatterns$.next(patterns);
      }
    } catch (error) {
      console.warn('[RateLimitingService] Failed to load attack patterns:', error);
    }
  }
}