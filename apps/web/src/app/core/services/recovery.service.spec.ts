// file: apps/web/src/app/core/services/recovery.service.spec.ts
// author: Corey Dale Peters
// date: 2026-01-17
// description: Property-based tests for RecoveryService

import { TestBed } from '@angular/core/testing';
import * as fc from 'fast-check';

import { RecoveryService } from './recovery.service';
import { UserService } from './user.service';
import { DebugLogService } from './debug-log.service';
import { AUTH_MESSAGES } from '../models/RecoveryModel';
import { AuthStep } from '../enums/AuthStepEnum';
import { CognitoUserStatus } from '../enums/CognitoUserStatusEnum';
import { RecoveryAction } from '../enums/RecoveryActionEnum';
import { Users } from '../models/UsersModel';
import { UserStatus } from '../enums/UserStatusEnum';

describe('RecoveryService', () => {
  let service: RecoveryService;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let debugLogServiceSpy: jasmine.SpyObj<DebugLogService>;

  // Arbitrary generators for property-based tests
  const emailArbitrary = fc.emailAddress();
  const cognitoStatusArbitrary = fc.constantFrom(
    CognitoUserStatus.Unconfirmed,
    CognitoUserStatus.Confirmed,
    CognitoUserStatus.ForceChangePassword,
    CognitoUserStatus.ResetRequired,
    CognitoUserStatus.Unknown,
    null
  );
  const dynamoExistsArbitrary = fc.boolean();

  // Helper to create mock user data
  const createMockUser = (): Users => new Users({
    userId: 'test-user-id',
    cognitoId: 'test-cognito-id',
    cognitoSub: 'test-sub-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: UserStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  beforeEach(() => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['checkEmailExists', 'userExists']);
    debugLogServiceSpy = jasmine.createSpyObj('DebugLogService', ['logApi', 'logAuth', 'logError']);

    TestBed.configureTestingModule({
      providers: [
        RecoveryService,
        { provide: UserService, useValue: userServiceSpy },
        { provide: DebugLogService, useValue: debugLogServiceSpy }
      ]
    });

    service = TestBed.inject(RecoveryService);
  });


  describe('Property 1: Idempotent smart check', () => {
    /**
     * Property: Given the same email and backend state, smartCheck should
     * return the same result every time.
     * Tag: [idempotent]
     */
    it('should return consistent results for same input state', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          cognitoStatusArbitrary,
          dynamoExistsArbitrary,
          async (email, cognitoStatus, dynamoExists) => {
            // Setup mocks with consistent state
            userServiceSpy.checkEmailExists.and.returnValue(Promise.resolve({
              exists: cognitoStatus !== null,
              cognitoStatus: cognitoStatus,
              cognitoSub: cognitoStatus ? 'test-sub-123' : null
            }));
            userServiceSpy.userExists.and.returnValue(Promise.resolve({
              StatusCode: dynamoExists ? 200 : 404,
              Message: dynamoExists ? 'Found' : 'Not found',
              Data: dynamoExists ? [createMockUser()] : []
            }));

            // Call twice
            const result1 = await service.smartCheck(email);
            const result2 = await service.smartCheck(email);

            // Results should be identical (excluding timestamps)
            expect(result1.recoveryAction).toBe(result2.recoveryAction);
            expect(result1.nextStep).toBe(result2.nextStep);
            expect(result1.cognitoStatus).toBe(result2.cognitoStatus);
            expect(result1.dynamoExists).toBe(result2.dynamoExists);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: State consistency', () => {
    /**
     * Property: The recovery action should always be consistent with the
     * Cognito and DynamoDB state combination.
     * Tag: [state-consistency]
     * 
     * Note: The checkEmailExists Lambda returns `exists: true` when the user
     * exists in DynamoDB, NOT when they exist in Cognito. So we need to mock
     * the `exists` field based on dynamoExists, not cognitoStatus.
     */
    it('should return correct action for each state combination', async () => {
      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          cognitoStatusArbitrary,
          dynamoExistsArbitrary,
          async (email, cognitoStatus, dynamoExists) => {
            // Mock checkEmailExists - exists field reflects DynamoDB state
            userServiceSpy.checkEmailExists.and.returnValue(Promise.resolve({
              exists: dynamoExists,
              cognitoStatus: cognitoStatus,
              cognitoSub: cognitoStatus ? 'test-sub-123' : null
            }));
            userServiceSpy.userExists.and.returnValue(Promise.resolve({
              StatusCode: dynamoExists ? 200 : 404,
              Message: dynamoExists ? 'Found' : 'Not found',
              Data: dynamoExists ? [createMockUser()] : []
            }));

            const result = await service.smartCheck(email);

            // Verify state consistency based on decision matrix
            // Note: cognitoStatus null means no Cognito user
            if (!cognitoStatus && !dynamoExists) {
              // Case 1: Neither system has the user - new signup
              expect(result.recoveryAction).toBe(RecoveryAction.NewSignup);
            } else if (!cognitoStatus && dynamoExists) {
              // Case 2: DynamoDB has user but Cognito doesn't - data integrity issue
              expect(result.recoveryAction).toBe(RecoveryAction.ContactSupport);
            } else if (cognitoStatus && !dynamoExists) {
              // Case 3: Cognito has user but DynamoDB doesn't - orphaned state
              expect([
                RecoveryAction.ResendVerification,
                RecoveryAction.CreateDynamoRecord,
                RecoveryAction.PasswordReset
              ]).toContain(result.recoveryAction);
            } else if (cognitoStatus && dynamoExists) {
              // Case 4: Both systems have the user - login flow
              expect([
                RecoveryAction.Login,
                RecoveryAction.PasswordReset,
                RecoveryAction.ResendVerification
              ]).toContain(result.recoveryAction);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 3: No jargon in user messages', () => {
    /**
     * Property: User messages should never contain technical jargon.
     * Tag: [no-jargon]
     */
    it('should not contain technical terms in user messages', async () => {
      const technicalTerms = [
        'cognito', 'dynamodb', 'dynamo', 'lambda', 'exception',
        'error code', 'stack trace', 'null', 'undefined', 'api',
        'http', 'status code', 'backend', 'database', 'aws', 'amplify'
      ];

      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          cognitoStatusArbitrary,
          dynamoExistsArbitrary,
          async (email, cognitoStatus, dynamoExists) => {
            userServiceSpy.checkEmailExists.and.returnValue(Promise.resolve({
              exists: cognitoStatus !== null,
              cognitoStatus: cognitoStatus,
              cognitoSub: cognitoStatus ? 'test-sub-123' : null
            }));
            userServiceSpy.userExists.and.returnValue(Promise.resolve({
              StatusCode: dynamoExists ? 200 : 404,
              Message: dynamoExists ? 'Found' : 'Not found',
              Data: dynamoExists ? [createMockUser()] : []
            }));

            const result = await service.smartCheck(email);
            const messageLower = result.userMessage.toLowerCase();

            for (const term of technicalTerms) {
              expect(messageLower).not.toContain(term);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have jargon-free AUTH_MESSAGES constants', () => {
      const technicalTerms = [
        'cognito', 'dynamodb', 'dynamo', 'lambda', 'exception',
        'error code', 'stack trace', 'null', 'undefined', 'api',
        'http', 'status code', 'backend', 'database', 'aws', 'amplify'
      ];

      const allMessages = Object.values(AUTH_MESSAGES);
      
      for (const message of allMessages) {
        const messageLower = message.toLowerCase();
        for (const term of technicalTerms) {
          expect(messageLower).not.toContain(term);
        }
      }
    });
  });

  describe('Property 6: Recovery action completeness', () => {
    /**
     * Property: Every state combination should map to a valid recovery action.
     * Tag: [completeness]
     */
    it('should always return a valid recovery action', async () => {
      const validActions = Object.values(RecoveryAction);

      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          cognitoStatusArbitrary,
          dynamoExistsArbitrary,
          async (email, cognitoStatus, dynamoExists) => {
            userServiceSpy.checkEmailExists.and.returnValue(Promise.resolve({
              exists: cognitoStatus !== null,
              cognitoStatus: cognitoStatus,
              cognitoSub: cognitoStatus ? 'test-sub-123' : null
            }));
            userServiceSpy.userExists.and.returnValue(Promise.resolve({
              StatusCode: dynamoExists ? 200 : 404,
              Message: dynamoExists ? 'Found' : 'Not found',
              Data: dynamoExists ? [createMockUser()] : []
            }));

            const result = await service.smartCheck(email);

            expect(validActions).toContain(result.recoveryAction);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return a valid next step', async () => {
      const validSteps = Object.values(AuthStep);

      await fc.assert(
        fc.asyncProperty(
          emailArbitrary,
          cognitoStatusArbitrary,
          dynamoExistsArbitrary,
          async (email, cognitoStatus, dynamoExists) => {
            userServiceSpy.checkEmailExists.and.returnValue(Promise.resolve({
              exists: cognitoStatus !== null,
              cognitoStatus: cognitoStatus,
              cognitoSub: cognitoStatus ? 'test-sub-123' : null
            }));
            userServiceSpy.userExists.and.returnValue(Promise.resolve({
              StatusCode: dynamoExists ? 200 : 404,
              Message: dynamoExists ? 'Found' : 'Not found',
              Data: dynamoExists ? [createMockUser()] : []
            }));

            const result = await service.smartCheck(email);

            expect(validSteps).toContain(result.nextStep);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Error handling', () => {
    it('should return safe defaults on network error', async () => {
      userServiceSpy.checkEmailExists.and.returnValue(
        Promise.reject(new Error('Network error'))
      );

      const result = await service.smartCheck('test@example.com');

      expect(result.recoveryAction).toBe(RecoveryAction.NewSignup);
      expect(result.nextStep).toBe(AuthStep.EmailEntry);
      expect(result.userMessage).toBe(AUTH_MESSAGES.NETWORK_ERROR);
    });
  });
});
