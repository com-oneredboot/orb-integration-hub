/**
 * ApplicationService Unit Tests
 *
 * Tests for application CRUD operations using v0.19.0 response format.
 *
 * @see .kiro/specs/applications-management/design.md
 * _Requirements: 6.1_
 */

import { TestBed } from '@angular/core/testing';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  let service: ApplicationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApplicationService],
    });
    service = TestBed.inject(ApplicationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('createDraft', () => {
    it('should throw error when ownerId is empty', () => {
      expect(() => service.createDraft('')).toThrowError(
        'Owner ID is required to create an application'
      );
    });

    it('should throw error when ownerId is undefined', () => {
      expect(() => service.createDraft(undefined as unknown as string)).toThrowError(
        'Owner ID is required to create an application'
      );
    });

    it('should return Observable when valid ownerId provided', () => {
      const result = service.createDraft('user-123');
      expect(result.subscribe).toBeDefined();
    });

    it('should accept optional organizationId parameter', () => {
      const result = service.createDraft('user-123', 'org-456');
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('createApplication', () => {
    it('should have createApplication method defined', () => {
      expect(service.createApplication).toBeDefined();
    });

    it('should return Observable when called with valid input', () => {
      const result = service.createApplication({
        name: 'Test App',
        organizationId: 'org-123',
        ownerId: 'user-123',
      });
      expect(result.subscribe).toBeDefined();
    });

    it('should accept partial input with defaults', () => {
      const result = service.createApplication({});
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('updateApplication', () => {
    it('should throw error when applicationId is missing', () => {
      expect(() => service.updateApplication({ name: 'Updated Name' })).toThrowError(
        'Application ID is required for updates'
      );
    });

    it('should throw error when applicationId is empty string', () => {
      expect(() =>
        service.updateApplication({ applicationId: '', name: 'Updated Name' })
      ).toThrowError('Application ID is required for updates');
    });

    it('should return Observable when valid applicationId provided', () => {
      const result = service.updateApplication({
        applicationId: 'app-123',
        name: 'Updated Name',
      });
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('deleteApplication', () => {
    it('should throw error when applicationId is empty', () => {
      expect(() => service.deleteApplication('')).toThrowError(
        'Application ID is required for deletion'
      );
    });

    it('should throw error when applicationId is undefined', () => {
      expect(() => service.deleteApplication(undefined as unknown as string)).toThrowError(
        'Application ID is required for deletion'
      );
    });

    it('should return Observable when valid applicationId provided', () => {
      const result = service.deleteApplication('app-123');
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('getApplicationsByOrganization', () => {
    it('should throw error when organizationId is empty', () => {
      expect(() => service.getApplicationsByOrganization('')).toThrowError(
        'Organization ID is required'
      );
    });

    it('should throw error when organizationId is undefined', () => {
      expect(() =>
        service.getApplicationsByOrganization(undefined as unknown as string)
      ).toThrowError('Organization ID is required');
    });

    it('should return Observable when valid organizationId provided', () => {
      const result = service.getApplicationsByOrganization('org-123');
      expect(result.subscribe).toBeDefined();
    });

    it('should accept optional limit parameter', () => {
      const result = service.getApplicationsByOrganization('org-123', 10);
      expect(result.subscribe).toBeDefined();
    });

    it('should accept optional nextToken parameter', () => {
      const result = service.getApplicationsByOrganization('org-123', 10, 'token-abc');
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('getApplication', () => {
    it('should throw error when applicationId is empty', () => {
      expect(() => service.getApplication('')).toThrowError('Application ID is required');
    });

    it('should throw error when applicationId is undefined', () => {
      expect(() => service.getApplication(undefined as unknown as string)).toThrowError(
        'Application ID is required'
      );
    });

    it('should return Observable when valid applicationId provided', () => {
      const result = service.getApplication('app-123');
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('return types', () => {
    it('createDraft should return Observable<IApplications>', () => {
      const result = service.createDraft('user-123');
      expect(result.subscribe).toBeDefined();
    });

    it('createApplication should return Observable<IApplications>', () => {
      const result = service.createApplication({
        applicationId: 'app-123',
        ownerId: 'user-123',
      });
      expect(result.subscribe).toBeDefined();
    });

    it('updateApplication should return Observable<IApplications>', () => {
      const result = service.updateApplication({ applicationId: 'app-123' });
      expect(result.subscribe).toBeDefined();
    });

    it('deleteApplication should return Observable<IApplications>', () => {
      const result = service.deleteApplication('app-123');
      expect(result.subscribe).toBeDefined();
    });

    it('getApplicationsByOrganization should return Observable<Connection<IApplications>>', () => {
      const result = service.getApplicationsByOrganization('org-123');
      expect(result.subscribe).toBeDefined();
    });

    it('getApplication should return Observable<IApplications | null>', () => {
      const result = service.getApplication('app-123');
      expect(result.subscribe).toBeDefined();
    });
  });
});
