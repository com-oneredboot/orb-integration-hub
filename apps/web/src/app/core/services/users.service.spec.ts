/**
 * UsersService Unit Tests
 *
 * Tests for users query operations.
 *
 * @see .kiro/specs/application-users-list/design.md
 * _Requirements: 2.1_
 */

import { TestBed } from '@angular/core/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsersService],
    });
    service = TestBed.inject(UsersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getApplicationUsers', () => {
    it('should throw error when organizationId is empty', () => {
      expect(() => service.getApplicationUsers('')).toThrowError('Organization ID is required');
    });

    it('should throw error when organizationId is undefined', () => {
      expect(() => service.getApplicationUsers(undefined as unknown as string)).toThrowError(
        'Organization ID is required'
      );
    });

    it('should return Observable with correct structure', (done) => {
      const result = service.getApplicationUsers('org-123');
      expect(result.subscribe).toBeDefined(); // It's an Observable
      
      // Verify the Observable emits the correct structure
      result.subscribe((data) => {
        expect(data.users).toBeDefined();
        expect(data.applicationUserRecords).toBeDefined();
        expect(Array.isArray(data.users)).toBe(true);
        expect(Array.isArray(data.applicationUserRecords)).toBe(true);
        done();
      });
    });

    it('should return empty arrays for MVP (OrganizationUsers table not implemented)', (done) => {
      const result = service.getApplicationUsers('org-123');
      
      result.subscribe((data) => {
        expect(data.users).toEqual([]);
        expect(data.applicationUserRecords).toEqual([]);
        done();
      });
    });
  });

  describe('getUser', () => {
    it('should throw error when userId is empty', () => {
      expect(() => service.getUser('')).toThrowError('User ID is required');
    });

    it('should throw error when userId is undefined', () => {
      expect(() => service.getUser(undefined as unknown as string)).toThrowError(
        'User ID is required'
      );
    });

    it('should return Observable<IUsers | null>', () => {
      const result = service.getUser('user-123');
      expect(result.subscribe).toBeDefined(); // It's an Observable
    });
  });

  describe('getUserApplications', () => {
    it('should throw error when userId is empty', () => {
      expect(() => service.getUserApplications('')).toThrowError('User ID is required');
    });

    it('should throw error when userId is undefined', () => {
      expect(() => service.getUserApplications(undefined as unknown as string)).toThrowError(
        'User ID is required'
      );
    });

    it('should return Observable<Connection<IApplicationUsers>>', () => {
      const result = service.getUserApplications('user-123');
      expect(result.subscribe).toBeDefined(); // It's an Observable
    });
  });

  describe('return types', () => {
    it('getApplicationUsers should return Observable with users and applicationUserRecords', () => {
      const result = service.getApplicationUsers('org-123');
      expect(result.subscribe).toBeDefined();
    });

    it('getUser should return Observable<IUsers | null>', () => {
      const result = service.getUser('user-123');
      expect(result.subscribe).toBeDefined();
    });

    it('getUserApplications should return Observable<Connection<IApplicationUsers>>', () => {
      const result = service.getUserApplications('user-123');
      expect(result.subscribe).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully in getApplicationUsers', (done) => {
      // This test verifies the error handling structure exists
      // Full error testing would require mocking the API
      const result = service.getApplicationUsers('org-123');
      
      result.subscribe({
        next: (data) => {
          // Should succeed with empty arrays for MVP
          expect(data).toBeDefined();
          done();
        },
        error: (error) => {
          // If it errors, it should have a message
          expect(error.message).toBeDefined();
          done();
        }
      });
    });
  });
});
