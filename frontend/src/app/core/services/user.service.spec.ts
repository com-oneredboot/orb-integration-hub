// file: frontend/src/app/core/services/user.service.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the user service

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { UserService } from './user.service';
import { CognitoService } from './cognito.service';
import { User, UserGroup, UserStatus, UserQueryInput } from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let mockCognitoService: jasmine.SpyObj<CognitoService>;

  beforeEach(() => {
    mockCognitoService = jasmine.createSpyObj('CognitoService', ['currentUser']);
    mockCognitoService.currentUser = jasmine.createSpyObj('Observable', ['subscribe']);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideMockStore({}),
        { provide: CognitoService, useValue: mockCognitoService }
      ]
    });
    service = TestBed.inject(UserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
  
  describe('userExists', () => {
    it('should return true for emails containing "existing" or "test@example"', async () => {
      const result1 = await service.userExists({ email: 'existing_user@example.com' } as UserQueryInput);
      const result2 = await service.userExists({ email: 'test@example.com' } as UserQueryInput);
      
      expect(result1).toBeTrue();
      expect(result2).toBeTrue();
    });
    
    it('should return false for other email addresses', async () => {
      const result1 = await service.userExists({ email: 'new_user@example.com' } as UserQueryInput);
      const result2 = await service.userExists({ email: 'another@domain.com' } as UserQueryInput);
      
      expect(result1).toBeFalse();
      expect(result2).toBeFalse();
    });
    
    it('should return false if email is not provided', async () => {
      const result = await service.userExists({} as UserQueryInput);
      expect(result).toBeFalse();
    });
  });

  describe('isUserValid', () => {
    it('should return false if user is null', () => {
      expect(service.isUserValid(null as unknown as User)).toBeFalse();
    });

    it('should return true for valid users with all required attributes', () => {
      const validUser: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.ACTIVE,
        created_at: '2023-01-01T00:00:00Z'
      };

      expect(service.isUserValid(validUser)).toBeTrue();
    });

    it('should return false for users missing required attributes', () => {
      const userMissingFirstName: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: '',
        last_name: 'User',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.ACTIVE,
        created_at: '2023-01-01T00:00:00Z'
      };

      const userMissingLastName: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: '',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.ACTIVE,
        created_at: '2023-01-01T00:00:00Z'
      };

      const userMissingPhone: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '',
        groups: [UserGroup.USER],
        status: UserStatus.ACTIVE,
        created_at: '2023-01-01T00:00:00Z'
      };

      const userMissingEmail: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: '',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.ACTIVE,
        created_at: '2023-01-01T00:00:00Z'
      };

      expect(service.isUserValid(userMissingFirstName)).toBeFalse();
      expect(service.isUserValid(userMissingLastName)).toBeFalse();
      expect(service.isUserValid(userMissingPhone)).toBeFalse();
      expect(service.isUserValid(userMissingEmail)).toBeFalse();
    });

    it('should return false for users with inactive status', () => {
      const inactiveUser: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.INACTIVE,
        created_at: '2023-01-01T00:00:00Z'
      };

      const pendingUser: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.PENDING,
        created_at: '2023-01-01T00:00:00Z'
      };

      const suspendedUser: User = {
        user_id: '123',
        cognito_id: 'abc123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+12345678901',
        groups: [UserGroup.USER],
        status: UserStatus.SUSPENDED,
        created_at: '2023-01-01T00:00:00Z'
      };

      expect(service.isUserValid(inactiveUser)).toBeFalse();
      expect(service.isUserValid(pendingUser)).toBeFalse();
      expect(service.isUserValid(suspendedUser)).toBeFalse();
    });
  });
});