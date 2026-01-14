// file: apps/web/src/app/features/user/services/auth-performance.service.ts
// author: Corey Dale Peters
// date: 2025-06-21
// description: Performance optimization service for authentication flow with lazy loading and caching

import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, timer, Observable, from } from 'rxjs';
import { debounceTime, throttleTime, shareReplay, switchMap, startWith } from 'rxjs';

export interface PerformanceMetrics {
  componentLoadTime: number;
  validationTime: number;
  formRenderTime: number;
  stepTransitionTime: number;
  imageLoadTime: number;
  totalPageLoadTime: number;
}

export interface CacheConfig {
  maxAge: number;
  maxSize: number;
  enableCompression: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthPerformanceService implements OnDestroy {
  private performanceMetrics = new BehaviorSubject<Partial<PerformanceMetrics>>({});
  private componentCache = new Map<string, any>();
  private imageCache = new Map<string, string>();
  private validationCache = new Map<string, any>();
  
  private readonly cacheConfig: CacheConfig = {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxSize: 50,
    enableCompression: true
  };

  // Performance monitoring
  private performanceObserver?: PerformanceObserver;
  private loadStartTime = Date.now();

  constructor() {
    this.initializePerformanceMonitoring();
    this.setupCacheCleanup();
  }

  /**
   * Initialize performance monitoring for auth flow
   */
  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.handlePerformanceEntry(entry);
        }
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure', 'paint'] 
      });
    }
  }

  /**
   * Handle performance entries from the observer
   */
  private handlePerformanceEntry(entry: PerformanceEntry): void {
    const currentMetrics = this.performanceMetrics.value;

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        currentMetrics.totalPageLoadTime = navEntry.loadEventEnd - navEntry.fetchStart;
        break;

      case 'resource':
        const resourceEntry = entry as PerformanceResourceTiming;
        if (resourceEntry.name.includes('image') || resourceEntry.name.includes('.png') || 
            resourceEntry.name.includes('.jpg') || resourceEntry.name.includes('.svg')) {
          currentMetrics.imageLoadTime = resourceEntry.responseEnd - resourceEntry.requestStart;
        }
        break;

      case 'measure':
        if (entry.name === 'component-load') {
          currentMetrics.componentLoadTime = entry.duration;
        } else if (entry.name === 'form-validation') {
          currentMetrics.validationTime = entry.duration;
        } else if (entry.name === 'step-transition') {
          currentMetrics.stepTransitionTime = entry.duration;
        }
        break;
    }

    this.performanceMetrics.next(currentMetrics);
  }

  /**
   * Measure component loading performance
   */
  measureComponentLoad<T>(componentLoader: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    performance.mark('component-load-start');

    return componentLoader().then(result => {
      performance.mark('component-load-end');
      performance.measure('component-load', 'component-load-start', 'component-load-end');
      
      const endTime = performance.now();
      this.updateMetric('componentLoadTime', endTime - startTime);
      
      return result;
    });
  }

  /**
   * Measure form validation performance
   */
  measureValidation<T>(validationFn: () => T): T {
    const startTime = performance.now();
    performance.mark('validation-start');

    const result = validationFn();

    performance.mark('validation-end');
    performance.measure('form-validation', 'validation-start', 'validation-end');
    
    const endTime = performance.now();
    this.updateMetric('validationTime', endTime - startTime);

    return result;
  }

  /**
   * Measure step transition performance
   */
  measureStepTransition(transitionFn: () => void): void {
    const startTime = performance.now();
    performance.mark('step-transition-start');

    transitionFn();

    // Use requestAnimationFrame to measure after DOM updates
    requestAnimationFrame(() => {
      performance.mark('step-transition-end');
      performance.measure('step-transition', 'step-transition-start', 'step-transition-end');
      
      const endTime = performance.now();
      this.updateMetric('stepTransitionTime', endTime - startTime);
    });
  }

  /**
   * Debounced validation to improve performance
   */
  createDebouncedValidation<T>(
    validationFn: (value: T) => Observable<any>,
    debounceMs = 300
  ): (value: T) => Observable<any> {
    const subject = new Subject<T>();
    
    const debouncedStream = subject.pipe(
      debounceTime(debounceMs),
      switchMap(value => this.getCachedValidation(value) || validationFn(value)),
      shareReplay(1)
    );

    return (value: T) => {
      subject.next(value);
      return debouncedStream;
    };
  }

  /**
   * Throttled validation for real-time feedback
   */
  createThrottledValidation<T>(
    validationFn: (value: T) => Observable<any>,
    throttleMs = 100
  ): (value: T) => Observable<any> {
    const subject = new Subject<T>();
    
    const throttledStream = subject.pipe(
      throttleTime(throttleMs),
      switchMap(value => this.getCachedValidation(value) || validationFn(value)),
      shareReplay(1)
    );

    return (value: T) => {
      subject.next(value);
      return throttledStream;
    };
  }

  /**
   * Cache validation results to avoid repeated calculations
   */
  private getCachedValidation<T>(value: T): Observable<any> | null {
    const key = JSON.stringify(value);
    const cached = this.validationCache.get(key);
    
    if (cached && this.isCacheValid(cached.timestamp)) {
      return from([cached.result]);
    }
    
    return null;
  }

  /**
   * Store validation result in cache
   */
  cacheValidationResult<T>(value: T, result: any): void {
    const key = JSON.stringify(value);
    
    if (this.validationCache.size >= this.cacheConfig.maxSize) {
      this.cleanupCache(this.validationCache);
    }
    
    this.validationCache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Preload images for better UX
   */
  preloadImages(imagePaths: string[]): Promise<void[]> {
    const startTime = performance.now();
    
    const loadPromises = imagePaths.map(path => {
      // Check cache first
      if (this.imageCache.has(path)) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.imageCache.set(path, path);
          resolve();
        };
        img.onerror = reject;
        img.src = path;
      });
    });

    return Promise.all(loadPromises).then(results => {
      const endTime = performance.now();
      this.updateMetric('imageLoadTime', endTime - startTime);
      return results;
    });
  }

  /**
   * Lazy load component with caching
   */
  lazyLoadComponent<T>(
    componentKey: string,
    loader: () => Promise<T>
  ): Promise<T> {
    // Check cache first
    const cached = this.componentCache.get(componentKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return Promise.resolve(cached.component);
    }

    return this.measureComponentLoad(loader).then(component => {
      // Cache the component
      if (this.componentCache.size >= this.cacheConfig.maxSize) {
        this.cleanupCache(this.componentCache);
      }

      this.componentCache.set(componentKey, {
        component,
        timestamp: Date.now()
      });

      return component;
    });
  }

  /**
   * Optimize bundle loading with intelligent prefetching
   */
  prefetchNextStep(nextStepComponent: string): Promise<any> {
    // Only prefetch if the user is likely to proceed
    return new Promise(resolve => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          this.lazyLoadComponent(nextStepComponent, () => 
            import(`../components/auth-flow/${nextStepComponent}`)
          ).then(resolve);
        });
      } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
          this.lazyLoadComponent(nextStepComponent, () => 
            import(`../components/auth-flow/${nextStepComponent}`)
          ).then(resolve);
        }, 100);
      }
    });
  }

  /**
   * Virtual scrolling helper for large lists
   */
  createVirtualScrolling(
    items: any[],
    itemHeight: number,
    containerHeight: number
  ): Observable<{ visibleItems: any[], startIndex: number, endIndex: number }> {
    return new Observable(observer => {
      const visibleItemCount = Math.ceil(containerHeight / itemHeight);
      const buffer = Math.ceil(visibleItemCount / 2);

      const scrollTop = 0;

      const calculateVisibleItems = () => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const endIndex = Math.min(items.length - 1, startIndex + visibleItemCount + 2 * buffer);
        const visibleItems = items.slice(startIndex, endIndex + 1);

        observer.next({
          visibleItems,
          startIndex,
          endIndex
        });
      };

      calculateVisibleItems();

      return () => {
        // Cleanup if needed
      };
    });
  }

  /**
   * Memory usage monitoring
   */
  getMemoryUsage(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  /**
   * Network-aware loading
   */
  getNetworkSpeed(): string {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  /**
   * Adaptive loading based on device capabilities
   */
  getOptimalLoadingStrategy(): {
    enablePreloading: boolean;
    enableAnimations: boolean;
    imageQuality: 'low' | 'medium' | 'high';
    maxConcurrentRequests: number;
  } {
    const networkSpeed = this.getNetworkSpeed();
    const memory = this.getMemoryUsage();
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;

    return {
      enablePreloading: networkSpeed !== 'slow-2g' && networkSpeed !== '2g',
      enableAnimations: !window.matchMedia('(prefers-reduced-motion: reduce)').matches && 
                       (!memory || memory.jsHeapSizeLimit > 2 * 1024 * 1024 * 1024),
      imageQuality: networkSpeed === '4g' ? 'high' : networkSpeed === '3g' ? 'medium' : 'low',
      maxConcurrentRequests: Math.min(6, Math.max(2, hardwareConcurrency))
    };
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): Observable<Partial<PerformanceMetrics>> {
    return this.performanceMetrics.asObservable();
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.componentCache.clear();
    this.imageCache.clear();
    this.validationCache.clear();
  }

  /**
   * Private helper methods
   */
  private updateMetric(key: keyof PerformanceMetrics, value: number): void {
    const currentMetrics = this.performanceMetrics.value;
    currentMetrics[key] = value;
    this.performanceMetrics.next(currentMetrics);
  }

  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.cacheConfig.maxAge;
  }

  private cleanupCache(cache: Map<string, any>): void {
    // Remove oldest entries (simple LRU implementation)
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    const entriesToRemove = Math.ceil(cache.size * 0.3); // Remove 30% of entries
    for (let i = 0; i < entriesToRemove; i++) {
      cache.delete(entries[i][0]);
    }
  }

  private setupCacheCleanup(): void {
    // Periodic cleanup every 5 minutes
    timer(0, 5 * 60 * 1000).subscribe(() => {
      this.cleanupExpiredEntries();
    });
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    [this.componentCache, this.validationCache].forEach(cache => {
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > this.cacheConfig.maxAge) {
          cache.delete(key);
        }
      }
    });
  }

  /**
   * Cleanup when service is destroyed
   */
  ngOnDestroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.clearAllCaches();
  }
}