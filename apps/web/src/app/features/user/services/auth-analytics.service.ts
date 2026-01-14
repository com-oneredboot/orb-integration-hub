// file: apps/web/src/app/features/user/services/auth-analytics.service.ts
// author: Corey Dale Peters
// date: 2025-06-21
// description: Analytics and conversion tracking service with A/B testing framework for authentication flow

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, timer } from 'rxjs';
import { map, filter, debounceTime, bufferTime, takeUntil } from 'rxjs/operators';

export interface AnalyticsEvent {
  name: string;
  category: 'auth_flow' | 'user_interaction' | 'conversion' | 'error' | 'performance';
  action: string;
  label?: string;
  value?: number;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  variant?: string; // For A/B testing
}

export interface ConversionFunnel {
  step: string;
  entered: number;
  completed: number;
  dropoffRate: number;
  averageTime: number;
}

export interface ABTestVariant {
  id: string;
  name: string;
  traffic: number; // Percentage of traffic (0-100)
  config: Record<string, any>;
  active: boolean;
}

export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  trafficAllocation: number; // Total traffic to include in test (0-100)
  startDate: Date;
  endDate?: Date;
  targetMetric: string;
}

export interface UserSegment {
  id: string;
  name: string;
  criteria: {
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    userAgent?: string;
    referrer?: string;
    geography?: string;
    newUser?: boolean;
    timeOfDay?: string;
    dayOfWeek?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AuthAnalyticsService implements OnDestroy {
  private sessionId = this.generateSessionId();
  private events: AnalyticsEvent[] = [];
  private eventQueue = new Subject<AnalyticsEvent>();
  private destroy$ = new Subject<void>();
  
  // A/B Testing
  private activeTests = new BehaviorSubject<ABTestConfig[]>([]);
  private userVariants = new Map<string, string>();
  private currentVariant$ = new BehaviorSubject<string>('control');
  
  // Conversion Tracking
  private funnelSteps = [
    'landing',
    'form_start',
    'email_entered',
    'phone_entered', 
    'verification_start',
    'mfa_setup',
    'profile_complete',
    'auth_complete'
  ];
  
  private stepStartTimes = new Map<string, number>();
  private conversionData = new BehaviorSubject<ConversionFunnel[]>([]);

  constructor() {
    this.initializeAnalytics();
    this.setupEventBuffering();
    this.initializeConversionTracking();
  }

  /**
   * Initialize analytics tracking
   */
  private initializeAnalytics(): void {
    // Track page load
    this.trackEvent({
      name: 'auth_flow_loaded',
      category: 'auth_flow',
      action: 'page_load',
      properties: {
        userAgent: navigator.userAgent,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer,
        timestamp: Date.now()
      }
    });

    // Track session start
    this.trackEvent({
      name: 'session_start',
      category: 'auth_flow',
      action: 'session_start',
      properties: {
        sessionId: this.sessionId,
        deviceType: this.getDeviceType(),
        isNewUser: this.isNewUser()
      }
    });
  }

  /**
   * Setup event buffering for efficient batch sending
   */
  private setupEventBuffering(): void {
    this.eventQueue.pipe(
      bufferTime(5000), // Buffer events for 5 seconds
      filter(events => events.length > 0),
      takeUntil(this.destroy$)
    ).subscribe(events => {
      this.sendEventBatch(events);
    });

    // Send remaining events before page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  /**
   * Initialize conversion funnel tracking
   */
  private initializeConversionTracking(): void {
    // Initialize funnel data
    const initialFunnelData: ConversionFunnel[] = this.funnelSteps.map(step => ({
      step,
      entered: 0,
      completed: 0,
      dropoffRate: 0,
      averageTime: 0
    }));
    
    this.conversionData.next(initialFunnelData);
  }

  /**
   * Track analytics event
   */
  trackEvent(event: Partial<AnalyticsEvent>): void {
    const fullEvent: AnalyticsEvent = {
      name: event.name || 'unknown_event',
      category: event.category || 'user_interaction',
      action: event.action || 'unknown_action',
      label: event.label,
      value: event.value,
      properties: event.properties || {},
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: event.userId,
      variant: this.currentVariant$.value
    };

    this.events.push(fullEvent);
    this.eventQueue.next(fullEvent);

    // Console log for development
    if (this.isDevelopment()) {
      console.log('Analytics Event:', fullEvent);
    }
  }

  /**
   * Track conversion funnel step
   */
  trackFunnelStep(step: string, action: 'enter' | 'complete' = 'enter'): void {
    if (action === 'enter') {
      this.stepStartTimes.set(step, Date.now());
    }

    this.trackEvent({
      name: `funnel_${step}_${action}`,
      category: 'conversion',
      action: `funnel_${action}`,
      label: step,
      properties: {
        funnelStep: step,
        action,
        timeInStep: action === 'complete' ? 
          Date.now() - (this.stepStartTimes.get(step) || Date.now()) : undefined
      }
    });

    this.updateConversionData(step, action);
  }

  /**
   * Track form field interactions
   */
  trackFieldInteraction(
    fieldName: string, 
    action: 'focus' | 'blur' | 'change' | 'error' | 'validation_success',
    value?: any
  ): void {
    this.trackEvent({
      name: `field_${action}`,
      category: 'user_interaction',
      action: `field_${action}`,
      label: fieldName,
      properties: {
        fieldName,
        action,
        hasValue: value !== undefined && value !== '',
        valueLength: typeof value === 'string' ? value.length : undefined
      }
    });
  }

  /**
   * Track validation errors
   */
  trackValidationError(fieldName: string, errorType: string, errorMessage: string): void {
    this.trackEvent({
      name: 'validation_error',
      category: 'error',
      action: 'validation_failed',
      label: `${fieldName}_${errorType}`,
      properties: {
        fieldName,
        errorType,
        errorMessage,
        attemptNumber: this.getValidationAttemptCount(fieldName)
      }
    });
  }

  /**
   * Track authentication errors
   */
  trackAuthError(errorType: string, errorCode?: string, errorMessage?: string): void {
    this.trackEvent({
      name: 'auth_error',
      category: 'error',
      action: 'auth_failed',
      label: errorType,
      properties: {
        errorType,
        errorCode,
        errorMessage,
        step: this.getCurrentStep(),
        attemptNumber: this.getAuthAttemptCount()
      }
    });
  }

  /**
   * Track successful authentication
   */
  trackAuthSuccess(method: string, timeToComplete: number): void {
    this.trackEvent({
      name: 'auth_success',
      category: 'conversion',
      action: 'auth_completed',
      label: method,
      value: timeToComplete,
      properties: {
        authMethod: method,
        timeToComplete,
        totalSteps: this.funnelSteps.length,
        variant: this.currentVariant$.value
      }
    });

    this.trackFunnelStep('auth_complete', 'complete');
  }

  /**
   * Track user engagement metrics
   */
  trackEngagement(metric: string, value: number, context?: Record<string, any>): void {
    this.trackEvent({
      name: 'engagement_metric',
      category: 'user_interaction',
      action: 'engagement',
      label: metric,
      value,
      properties: {
        metric,
        context
      }
    });
  }

  /**
   * A/B Testing Methods
   */

  /**
   * Initialize A/B test
   */
  initializeABTest(testConfig: ABTestConfig): void {
    const currentTests = this.activeTests.value;
    const existingTestIndex = currentTests.findIndex(test => test.testId === testConfig.testId);
    
    if (existingTestIndex >= 0) {
      currentTests[existingTestIndex] = testConfig;
    } else {
      currentTests.push(testConfig);
    }
    
    this.activeTests.next(currentTests);
    
    // Assign user to variant
    this.assignUserToVariant(testConfig);
  }

  /**
   * Assign user to A/B test variant
   */
  private assignUserToVariant(testConfig: ABTestConfig): void {
    const userId = this.getUserId() || this.sessionId;
    const hash = this.hashString(userId + testConfig.testId);
    const hashValue = hash % 100;

    // Check if user should be included in test
    if (hashValue >= testConfig.trafficAllocation) {
      this.userVariants.set(testConfig.testId, 'control');
      return;
    }

    // Determine variant based on traffic allocation
    let cumulativeTraffic = 0;
    for (const variant of testConfig.variants) {
      cumulativeTraffic += variant.traffic;
      if (hashValue < cumulativeTraffic && variant.active) {
        this.userVariants.set(testConfig.testId, variant.id);
        this.currentVariant$.next(variant.id);
        
        this.trackEvent({
          name: 'ab_test_assigned',
          category: 'conversion',
          action: 'variant_assigned',
          label: testConfig.testId,
          properties: {
            testId: testConfig.testId,
            variant: variant.id,
            variantName: variant.name
          }
        });
        
        return;
      }
    }

    // Fallback to control
    this.userVariants.set(testConfig.testId, 'control');
  }

  /**
   * Get current variant for a test
   */
  getVariant(testId: string): string {
    return this.userVariants.get(testId) || 'control';
  }

  /**
   * Get variant configuration
   */
  getVariantConfig(testId: string): Record<string, any> {
    const variant = this.getVariant(testId);
    const test = this.activeTests.value.find(t => t.testId === testId);
    
    if (!test) return {};
    
    const variantConfig = test.variants.find(v => v.id === variant);
    return variantConfig?.config || {};
  }

  /**
   * Check if user is in specific variant
   */
  isInVariant(testId: string, variantId: string): boolean {
    return this.getVariant(testId) === variantId;
  }

  /**
   * User Segmentation
   */

  /**
   * Check if user matches segment criteria
   */
  matchesSegment(segment: UserSegment): boolean {
    const criteria = segment.criteria;
    
    if (criteria.deviceType && criteria.deviceType !== this.getDeviceType()) {
      return false;
    }
    
    if (criteria.userAgent && !navigator.userAgent.includes(criteria.userAgent)) {
      return false;
    }
    
    if (criteria.referrer && !document.referrer.includes(criteria.referrer)) {
      return false;
    }
    
    if (criteria.newUser !== undefined && criteria.newUser !== this.isNewUser()) {
      return false;
    }
    
    if (criteria.timeOfDay) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
      if (criteria.timeOfDay !== timeOfDay) {
        return false;
      }
    }
    
    if (criteria.dayOfWeek) {
      const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      if (!criteria.dayOfWeek.includes(dayOfWeek)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Analytics Dashboard Data
   */

  /**
   * Get conversion funnel data
   */
  getConversionFunnel(): Observable<ConversionFunnel[]> {
    return this.conversionData.asObservable();
  }

  /**
   * Get real-time analytics data
   */
  getRealTimeData(): Observable<{
    activeUsers: number;
    eventsPerMinute: number;
    conversionRate: number;
    topErrors: { error: string; count: number }[];
  }> {
    return timer(0, 60000).pipe( // Update every minute
      map(() => {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentEvents = this.events.filter(e => e.timestamp > oneMinuteAgo);
        
        return {
          activeUsers: new Set(recentEvents.map(e => e.sessionId)).size,
          eventsPerMinute: recentEvents.length,
          conversionRate: this.calculateConversionRate(),
          topErrors: this.getTopErrors()
        };
      })
    );
  }

  /**
   * Export analytics data
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.convertToCSV(this.events);
    }
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Private helper methods
   */

  private generateSessionId(): string {
    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    const randomString = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return Date.now().toString(36) + randomString;
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private isNewUser(): boolean {
    return !localStorage.getItem('auth_returning_user');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  private isDevelopment(): boolean {
    return window.location.hostname === 'localhost' || 
           window.location.hostname.includes('dev');
  }

  private getCurrentStep(): string {
    // This would be implemented based on your step tracking logic
    return 'unknown';
  }

  private getValidationAttemptCount(fieldName: string): number {
    return this.events.filter(e => 
      e.name === 'validation_error' && 
      e.properties?.fieldName === fieldName
    ).length + 1;
  }

  private getAuthAttemptCount(): number {
    return this.events.filter(e => e.name === 'auth_error').length + 1;
  }

  private updateConversionData(step: string, action: 'enter' | 'complete'): void {
    const currentData = this.conversionData.value;
    const stepIndex = currentData.findIndex(s => s.step === step);
    
    if (stepIndex >= 0) {
      if (action === 'enter') {
        currentData[stepIndex].entered++;
      } else {
        currentData[stepIndex].completed++;
      }
      
      // Calculate dropoff rate
      if (currentData[stepIndex].entered > 0) {
        currentData[stepIndex].dropoffRate = 
          ((currentData[stepIndex].entered - currentData[stepIndex].completed) / 
           currentData[stepIndex].entered) * 100;
      }
    }
    
    this.conversionData.next([...currentData]);
  }

  private calculateConversionRate(): number {
    const funnelData = this.conversionData.value;
    const firstStep = funnelData[0];
    const lastStep = funnelData[funnelData.length - 1];
    
    if (firstStep.entered === 0) return 0;
    return (lastStep.completed / firstStep.entered) * 100;
  }

  private getTopErrors(): { error: string; count: number }[] {
    const errorCounts = new Map<string, number>();
    
    this.events
      .filter(e => e.category === 'error')
      .forEach(e => {
        const errorKey = e.label || e.name;
        errorCounts.set(errorKey, (errorCounts.get(errorKey) || 0) + 1);
      });
    
    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private sendEventBatch(events: AnalyticsEvent[]): void {
    // In a real implementation, this would send events to your analytics backend
    if (this.isDevelopment()) {
      console.log('Sending event batch:', events);
    }
    
    // Example: Send to analytics service
    // this.http.post('/api/analytics/events', { events }).subscribe();
  }

  private convertToCSV(events: AnalyticsEvent[]): string {
    if (events.length === 0) return '';
    
    const headers = Object.keys(events[0]).join(',');
    const rows = events.map(event => 
      Object.values(event).map(value => 
        typeof value === 'object' ? JSON.stringify(value) : value
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  private flush(): void {
    // Send any remaining events immediately
    if (this.events.length > 0) {
      this.sendEventBatch([...this.events]);
      this.events = [];
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.flush();
  }
}