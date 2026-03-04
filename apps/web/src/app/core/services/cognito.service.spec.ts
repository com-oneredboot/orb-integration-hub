// file: apps/web/src/app/core/services/cognito.service.spec.ts
// author: Kiro AI Assistant
// date: 2025-01-XX
// description: Unit tests for CognitoService - hasLocalTokens() method
/* eslint-disable @typescript-eslint/no-explicit-any */

import { TestBed } from '@angular/core/testing';
import { CognitoService } from './cognito.service';

// Mock defaultStorage from aws-amplify
const mockDefaultStorage = {
  getItem: jasmine.createSpy('getItem')
};

// Mock aws-amplify/auth functions
jest.mock('aws-amplify/auth', () => ({
  confirmSignIn: jest.fn(),
  confirmSignUp: jest.fn(),
  fetchAuthSession: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn(),
  fetchMFAPreference: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  signUp: jest.fn(),
  resetPassword: jest.fn(),
  confirmResetPassword: jest.fn(),
  setUpTOTP: jest.fn()
}));

// Mock defaultStorage
jest.mock('@aws-amplify/core/internals/utils', () => ({
  defaultStorage: mockDefaultStorage
}));

describe('CognitoService - hasLocalTokens()', () => {
  let service: CognitoService;
  const mockClientId = 'test-client-id';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CognitoService]
    });

    service = TestBed.inject(CognitoService);
    
    // Reset spy
    mockDefaultStorage.getItem.calls.reset();
    
    // Mock environment
    (service as any).environment = {
      cognito: {
        userPoolClientId: mockClientId
      }
    };
  });

  afterEach(() => {
    mockDefaultStorage.getItem.calls.reset();
  });

  describe('No LastAuthUser key in IndexedDB', () => {
    it('should return false when LastAuthUser key does not exist', async () => {
      // Arrange: No LastAuthUser key
      mockDefaultStorage.getItem.and.returnValue(Promise.resolve(null));

      // Act: Call hasLocalTokens via reflection (private method)
      const result = await (service as any).hasLocalTokens();

      // Assert: Should return false
      expect(result).toBe(false);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.LastAuthUser`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('should return false when LastAuthUser key is undefined', async () => {
      // Arrange: LastAuthUser returns undefined
      mockDefaultStorage.getItem.and.returnValue(Promise.resolve(undefined));

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(1);
    });

    it('should return false when LastAuthUser key is empty string', async () => {
      // Arrange: LastAuthUser returns empty string
      mockDefaultStorage.getItem.and.returnValue(Promise.resolve(''));

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('LastAuthUser exists but no tokens', () => {
    it('should return false when LastAuthUser exists but both tokens are missing', async () => {
      // Arrange: LastAuthUser exists, but no tokens
      const lastAuthUser = 'test-user-123';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        return Promise.resolve(null); // No tokens
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.LastAuthUser`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.${lastAuthUser}.accessToken`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.${lastAuthUser}.idToken`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('LastAuthUser exists with only one token', () => {
    it('should return false when only accessToken exists', async () => {
      // Arrange: LastAuthUser and accessToken exist, but no idToken
      const lastAuthUser = 'test-user-123';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken')) {
          return Promise.resolve('mock-access-token');
        }
        return Promise.resolve(null); // No idToken
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(3);
    });

    it('should return false when only idToken exists', async () => {
      // Arrange: LastAuthUser and idToken exist, but no accessToken
      const lastAuthUser = 'test-user-123';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('idToken')) {
          return Promise.resolve('mock-id-token');
        }
        return Promise.resolve(null); // No accessToken
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(3);
    });

    it('should return false when accessToken is empty string', async () => {
      // Arrange: LastAuthUser exists, accessToken is empty, idToken exists
      const lastAuthUser = 'test-user-123';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken')) {
          return Promise.resolve(''); // Empty string
        }
        if (key.includes('idToken')) {
          return Promise.resolve('mock-id-token');
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when idToken is empty string', async () => {
      // Arrange: LastAuthUser exists, idToken is empty, accessToken exists
      const lastAuthUser = 'test-user-123';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken')) {
          return Promise.resolve('mock-access-token');
        }
        if (key.includes('idToken')) {
          return Promise.resolve(''); // Empty string
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('LastAuthUser exists with both tokens', () => {
    it('should return true when both accessToken and idToken exist', async () => {
      // Arrange: LastAuthUser, accessToken, and idToken all exist
      const lastAuthUser = 'test-user-123';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken')) {
          return Promise.resolve('mock-access-token');
        }
        if (key.includes('idToken')) {
          return Promise.resolve('mock-id-token');
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(true);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.LastAuthUser`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.${lastAuthUser}.accessToken`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.${lastAuthUser}.idToken`
      );
      expect(mockDefaultStorage.getItem).toHaveBeenCalledTimes(3);
    });

    it('should return true when both tokens exist with different user ID format', async () => {
      // Arrange: Test with UUID-style user ID
      const lastAuthUser = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken')) {
          return Promise.resolve('mock-access-token-uuid');
        }
        if (key.includes('idToken')) {
          return Promise.resolve('mock-id-token-uuid');
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('IndexedDB access errors', () => {
    it('should return true and fall back to API call when getItem throws error', async () => {
      // Arrange: Simulate IndexedDB error
      const consoleDebugSpy = spyOn(console, 'debug');
      mockDefaultStorage.getItem.and.returnValue(
        Promise.reject(new Error('IndexedDB access denied'))
      );

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert: Should return true to fall back to API call
      expect(result).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[CognitoService] Failed to check local storage, falling back to API call'
      );
    });

    it('should return true when storage quota exceeded', async () => {
      // Arrange: Simulate quota exceeded error
      const consoleDebugSpy = spyOn(console, 'debug');
      mockDefaultStorage.getItem.and.returnValue(
        Promise.reject(new Error('QuotaExceededError'))
      );

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalled();
    });

    it('should return true when storage is not available', async () => {
      // Arrange: Simulate storage not available
      const consoleDebugSpy = spyOn(console, 'debug');
      mockDefaultStorage.getItem.and.returnValue(
        Promise.reject(new Error('Storage is not available'))
      );

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });

  describe('Private browsing mode', () => {
    it('should return true when private browsing blocks IndexedDB', async () => {
      // Arrange: Simulate private browsing error
      const consoleDebugSpy = spyOn(console, 'debug');
      mockDefaultStorage.getItem.and.returnValue(
        Promise.reject(new Error('Failed to execute getItem on Storage'))
      );

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert: Should fall back to API call
      expect(result).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        '[CognitoService] Failed to check local storage, falling back to API call'
      );
    });

    it('should return true when SecurityError is thrown', async () => {
      // Arrange: Simulate security error (common in private browsing)
      const consoleDebugSpy = spyOn(console, 'debug');
      const securityError = new Error('SecurityError: The operation is insecure');
      securityError.name = 'SecurityError';
      mockDefaultStorage.getItem.and.returnValue(Promise.reject(securityError));

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(true);
      expect(consoleDebugSpy).toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle null clientId gracefully', async () => {
      // Arrange: Mock environment with null clientId
      (service as any).environment = {
        cognito: {
          userPoolClientId: null
        }
      };
      mockDefaultStorage.getItem.and.returnValue(Promise.resolve(null));

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert: Should return false (no tokens can exist with null clientId)
      expect(result).toBe(false);
    });

    it('should handle undefined clientId gracefully', async () => {
      // Arrange: Mock environment with undefined clientId
      (service as any).environment = {
        cognito: {
          userPoolClientId: undefined
        }
      };
      mockDefaultStorage.getItem.and.returnValue(Promise.resolve(null));

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle special characters in LastAuthUser', async () => {
      // Arrange: LastAuthUser with special characters
      const lastAuthUser = 'user+test@example.com';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken')) {
          return Promise.resolve('mock-access-token');
        }
        if (key.includes('idToken')) {
          return Promise.resolve('mock-id-token');
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert: Should handle special characters correctly
      expect(result).toBe(true);
      expect(mockDefaultStorage.getItem).toHaveBeenCalledWith(
        `CognitoIdentityServiceProvider.${mockClientId}.${lastAuthUser}.accessToken`
      );
    });

    it('should handle very long token values', async () => {
      // Arrange: Tokens with very long values (realistic JWT length)
      const lastAuthUser = 'test-user';
      const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + 'a'.repeat(1000);
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken') || key.includes('idToken')) {
          return Promise.resolve(longToken);
        }
        return Promise.resolve(null);
      });

      // Act
      const result = await (service as any).hasLocalTokens();

      // Assert: Should handle long tokens
      expect(result).toBe(true);
    });
  });

  describe('Performance considerations', () => {
    it('should complete quickly for no tokens case', async () => {
      // Arrange
      mockDefaultStorage.getItem.and.returnValue(Promise.resolve(null));
      const startTime = performance.now();

      // Act
      await (service as any).hasLocalTokens();
      const endTime = performance.now();

      // Assert: Should complete in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should complete quickly for tokens exist case', async () => {
      // Arrange
      const lastAuthUser = 'test-user';
      mockDefaultStorage.getItem.and.callFake((key: string) => {
        if (key.includes('LastAuthUser')) {
          return Promise.resolve(lastAuthUser);
        }
        if (key.includes('accessToken') || key.includes('idToken')) {
          return Promise.resolve('mock-token');
        }
        return Promise.resolve(null);
      });
      const startTime = performance.now();

      // Act
      await (service as any).hasLocalTokens();
      const endTime = performance.now();

      // Assert: Should complete in less than 100ms
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});
