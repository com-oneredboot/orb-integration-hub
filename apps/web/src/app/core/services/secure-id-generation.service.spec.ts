// file: apps/web/src/app/core/services/secure-id-generation.service.spec.ts
// author: Claude Code
// date: 2025-06-21
// description: Unit tests for SecureIdGenerationService

import { TestBed } from '@angular/core/testing';
import { SecureIdGenerationService, SecureIdRequest, SecureIdResponse } from './secure-id-generation.service';
import { AppErrorHandlerService } from './error-handler.service';

describe('SecureIdGenerationService', () => {
  let service: SecureIdGenerationService;
  let mockErrorHandler: jasmine.SpyObj<AppErrorHandlerService>;

  beforeEach(() => {
    const errorHandlerSpy = jasmine.createSpyObj('AppErrorHandlerService', ['captureSecurityError']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AppErrorHandlerService, useValue: errorHandlerSpy }
      ]
    });
    
    service = TestBed.inject(SecureIdGenerationService);
    mockErrorHandler = TestBed.inject(AppErrorHandlerService) as jasmine.SpyObj<AppErrorHandlerService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('validateIdFormat', () => {
    it('should validate proper UUID v4 format', () => {
      const validUuid = '550e8400-e29b-41d4-a716-446655440000';
      expect(service.validateIdFormat(validUuid)).toBe(true);
    });

    it('should reject invalid UUID formats', () => {
      const invalidUuids = [
        'invalid-uuid',
        '123456789',
        'insecure-12345-67890',
        '550e8400-e29b-41d4-a716',
        '550e8400-e29b-61d4-a716-446655440000' // invalid version
      ];

      invalidUuids.forEach(uuid => {
        expect(service.validateIdFormat(uuid)).toBe(false);
      });
    });

    it('should reject insecure client-generated IDs', () => {
      const insecureId = 'insecure-abc123-def456';
      expect(service.validateIdFormat(insecureId)).toBe(false);
    });
  });

  describe('generateSecureId', () => {
    it('should handle emergency fallback when backend fails', (done) => {
      const request: SecureIdRequest = {
        type: 'user',
        context: 'user_registration'
      };

      // Mock fetch to simulate backend failure
      spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network error')));

      service.generateSecureId(request).subscribe({
        next: (response: SecureIdResponse) => {
          expect(response).toBeTruthy();
          expect(response.type).toBe('user');
          expect(response.metadata?.['insecure']).toBe(true);
          expect(response.metadata?.['warning']).toContain('Generated client-side');
          expect(mockErrorHandler.captureSecurityError).toHaveBeenCalled();
          done();
        },
        error: (error) => {
          fail('Should not error in emergency fallback: ' + error);
          done();
        }
      });
    });
  });

  describe('generateSecureIdBatch', () => {
    it('should handle batch fallback to individual generation', (done) => {
      const requests: SecureIdRequest[] = [
        { type: 'user', context: 'registration' },
        { type: 'cognito', context: 'authentication' }
      ];

      // Mock fetch to simulate backend failure
      spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network error')));

      service.generateSecureIdBatch(requests).subscribe({
        next: (responses: SecureIdResponse[]) => {
          expect(responses).toBeTruthy();
          expect(responses.length).toBe(2);
          expect(responses[0].type).toBe('user');
          expect(responses[1].type).toBe('cognito');
          expect(mockErrorHandler.captureSecurityError).toHaveBeenCalled();
          done();
        },
        error: (error) => {
          fail('Should not error in batch fallback: ' + error);
          done();
        }
      });
    });
  });

  describe('getStats', () => {
    it('should provide statistics observable', (done) => {
      service.getStats().subscribe(stats => {
        expect(stats).toBeTruthy();
        expect(stats.totalGenerated).toBeDefined();
        expect(stats.successRate).toBeDefined();
        expect(stats.avgResponseTime).toBeDefined();
        done();
      });
    });
  });

  describe('checkServiceHealth', () => {
    it('should return false when health check fails', async () => {
      spyOn(window, 'fetch').and.returnValue(Promise.reject(new Error('Network error')));
      
      const isHealthy = await service.checkServiceHealth();
      expect(isHealthy).toBe(false);
    });

    it('should return true when health check succeeds', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' })
      };
      spyOn(window, 'fetch').and.returnValue(Promise.resolve(mockResponse as Response));
      
      const isHealthy = await service.checkServiceHealth();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Emergency Client Side Generation', () => {
    it('should generate unique IDs for emergency fallback', () => {
      // Access private method for testing
      const generateMethod = (service as unknown as { generateInsecureClientId: () => string }).generateInsecureClientId.bind(service);
      
      const id1 = generateMethod();
      const id2 = generateMethod();
      
      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
      expect(id1.startsWith('insecure-') || id1.match(/^[0-9a-f-]{36}$/)).toBeTruthy();
    });
  });
});