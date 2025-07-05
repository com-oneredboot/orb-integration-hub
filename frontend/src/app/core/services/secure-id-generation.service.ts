// file: frontend/src/app/core/services/secure-id-generation.service.ts
// author: Claude Code
// date: 2025-06-21
// description: Secure ID generation service that delegates UUID creation to backend services

import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of, firstValueFrom } from 'rxjs';
import { map, catchError, retry, timeout } from 'rxjs/operators';
import { AppErrorHandlerService } from './error-handler.service';

export interface SecureIdRequest {
  type: 'user' | 'session' | 'cognito' | 'transaction' | 'correlation';
  context?: string;
  metadata?: Record<string, any>;
}

export interface SecureIdResponse {
  id: string;
  type: string;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, any>;
}

export interface IdGenerationStats {
  totalGenerated: number;
  successRate: number;
  avgResponseTime: number;
  lastError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SecureIdGenerationService {
  private readonly API_ENDPOINT = '/api/secure/generate-id';
  private readonly FALLBACK_ENDPOINT = '/api/v1/ids/generate';
  private readonly REQUEST_TIMEOUT = 5000; // 5 seconds
  private readonly MAX_RETRIES = 2;

  // Statistics and monitoring
  private stats$ = new BehaviorSubject<IdGenerationStats>({
    totalGenerated: 0,
    successRate: 100,
    avgResponseTime: 0
  });

  // Local cache for emergency fallback (should be avoided)
  private emergencyFallbackEnabled = false;
  private fallbackWarningIssued = false;

  constructor(private errorHandler: AppErrorHandlerService) {
    console.debug('[SecureIdGenerationService] Service initialized');
  }

  /**
   * Generate a secure UUID from the backend service
   */
  public generateSecureId(request: SecureIdRequest): Observable<SecureIdResponse> {
    const startTime = Date.now();
    
    return from(this.requestSecureIdFromBackend(request)).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(this.MAX_RETRIES),
      map(response => {
        this.updateStats(true, Date.now() - startTime);
        return response;
      }),
      catchError(error => {
        this.updateStats(false, Date.now() - startTime, error);
        return this.handleIdGenerationError(request, error);
      })
    );
  }

  /**
   * Generate multiple secure IDs in batch
   */
  public generateSecureIdBatch(requests: SecureIdRequest[]): Observable<SecureIdResponse[]> {
    const startTime = Date.now();
    
    return from(this.requestSecureIdBatchFromBackend(requests)).pipe(
      timeout(this.REQUEST_TIMEOUT * 2), // Longer timeout for batch
      retry(this.MAX_RETRIES),
      map(responses => {
        this.updateStats(true, Date.now() - startTime);
        return responses;
      }),
      catchError(error => {
        this.updateStats(false, Date.now() - startTime, error);
        return this.handleBatchIdGenerationError(requests, error);
      })
    );
  }

  /**
   * Get service statistics for monitoring
   */
  public getStats(): Observable<IdGenerationStats> {
    return this.stats$.asObservable();
  }

  /**
   * Check if the secure ID service is available
   */
  public async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_ENDPOINT}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000)
      });
      return response.ok;
    } catch (error) {
      console.warn('[SecureIdGenerationService] Health check failed:', error);
      return false;
    }
  }

  /**
   * Request secure ID from backend service
   */
  private async requestSecureIdFromBackend(request: SecureIdRequest): Promise<SecureIdResponse> {
    try {
      console.debug('[SecureIdGenerationService] Requesting secure ID:', request);

      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Type': 'secure-id-generation',
          'X-Request-Context': request.context || 'unknown'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data.id || !data.type || !data.timestamp) {
        throw new Error('Invalid response format from secure ID service');
      }

      console.debug('[SecureIdGenerationService] Secure ID generated successfully');
      return data as SecureIdResponse;

    } catch (error) {
      console.error('[SecureIdGenerationService] Backend request failed:', error);
      throw error;
    }
  }

  /**
   * Request multiple secure IDs from backend service
   */
  private async requestSecureIdBatchFromBackend(requests: SecureIdRequest[]): Promise<SecureIdResponse[]> {
    try {
      console.debug('[SecureIdGenerationService] Requesting secure ID batch:', requests);

      const response = await fetch(`${this.API_ENDPOINT}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Type': 'secure-id-batch-generation',
          'X-Batch-Size': requests.length.toString()
        },
        body: JSON.stringify({ requests }),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT * 2)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data.ids) || data.ids.length !== requests.length) {
        throw new Error('Invalid batch response from secure ID service');
      }

      console.debug('[SecureIdGenerationService] Secure ID batch generated successfully');
      return data.ids as SecureIdResponse[];

    } catch (error) {
      console.error('[SecureIdGenerationService] Backend batch request failed:', error);
      throw error;
    }
  }

  /**
   * Handle ID generation errors with fallback strategies
   */
  private handleIdGenerationError(request: SecureIdRequest, error: any): Observable<SecureIdResponse> {
    const errorId = this.errorHandler.captureSecurityError(
      'generateSecureId',
      error,
      'SecureIdGenerationService',
      undefined
    );

    console.error('[SecureIdGenerationService] ID generation failed:', errorId);

    // Try fallback endpoint first
    return from(this.tryFallbackEndpoint(request)).pipe(
      catchError(fallbackError => {
        console.error('[SecureIdGenerationService] Fallback endpoint also failed:', fallbackError);
        
        // Last resort: Emergency client-side generation with warnings
        return this.emergencyClientSideGeneration(request);
      })
    );
  }

  /**
   * Handle batch ID generation errors
   */
  private handleBatchIdGenerationError(requests: SecureIdRequest[], error: any): Observable<SecureIdResponse[]> {
    const errorId = this.errorHandler.captureSecurityError(
      'generateSecureIdBatch',
      error,
      'SecureIdGenerationService',
      undefined
    );

    console.error('[SecureIdGenerationService] Batch ID generation failed:', errorId);

    // Generate individual IDs as fallback
    const fallbackObservables = requests.map(request => 
      this.generateSecureId(request).pipe(
        catchError(individualError => this.emergencyClientSideGeneration(request))
      )
    );

    // Convert to batch result
    return from(Promise.all(fallbackObservables.map(obs => firstValueFrom(obs))));
  }

  /**
   * Try fallback endpoint
   */
  private async tryFallbackEndpoint(request: SecureIdRequest): Promise<SecureIdResponse> {
    try {
      const response = await fetch(this.FALLBACK_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`Fallback endpoint failed: ${response.status}`);
      }

      const data = await response.json();
      console.warn('[SecureIdGenerationService] Using fallback endpoint for ID generation');
      
      return data as SecureIdResponse;
    } catch (error) {
      console.error('[SecureIdGenerationService] Fallback endpoint failed:', error);
      throw error;
    }
  }

  /**
   * Emergency client-side generation (last resort with security warnings)
   */
  private emergencyClientSideGeneration(request: SecureIdRequest): Observable<SecureIdResponse> {
    if (!this.fallbackWarningIssued) {
      console.error('🚨 SECURITY WARNING: Using client-side ID generation as emergency fallback!');
      console.error('🚨 This should NEVER happen in production and represents a security risk!');
      this.fallbackWarningIssued = true;

      // Report critical security incident
      this.errorHandler.captureSecurityError(
        'emergencyClientSideGeneration',
        new Error('Backend ID generation failed - using insecure client fallback'),
        'SecureIdGenerationService',
        undefined
      );
    }

    // Generate insecure client-side ID with clear warnings
    const insecureId = this.generateInsecureClientId();
    
    const response: SecureIdResponse = {
      id: insecureId,
      type: request.type,
      timestamp: Date.now(),
      metadata: {
        ...request.metadata,
        insecure: true,
        warning: 'Generated client-side - security risk',
        generated_by: 'emergency_fallback'
      }
    };

    return of(response);
  }

  /**
   * Generate insecure client-side ID (for emergency use only)
   */
  private generateInsecureClientId(): string {
    // Use crypto.randomUUID if available, otherwise fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Insecure fallback
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `insecure-${timestamp}-${random}`;
  }

  /**
   * Update service statistics
   */
  private updateStats(success: boolean, responseTime: number, error?: any): void {
    const currentStats = this.stats$.value;
    const newTotal = currentStats.totalGenerated + 1;
    
    const newStats: IdGenerationStats = {
      totalGenerated: newTotal,
      successRate: success 
        ? ((currentStats.successRate * (newTotal - 1)) + 100) / newTotal
        : ((currentStats.successRate * (newTotal - 1)) + 0) / newTotal,
      avgResponseTime: ((currentStats.avgResponseTime * (newTotal - 1)) + responseTime) / newTotal,
      lastError: error?.message
    };

    this.stats$.next(newStats);
  }

  /**
   * Validate that an ID appears to be backend-generated
   */
  public validateIdFormat(id: string): boolean {
    // Backend UUIDs should follow RFC 4122 format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) && !id.startsWith('insecure-');
  }
}