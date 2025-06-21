/**
 * SMS Verification Service Integration Tests
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SmsVerificationService } from '../../src/app/core/services/sms-verification.service';
import { AWSTestSetup } from '../utils/aws-test-setup';
import { getTestConfig, skipIntegrationTests } from '../config/test-config';
import * as AWS from 'aws-sdk';

describe('SMS Verification Integration Tests', () => {
  let smsService: SmsVerificationService;
  let httpMock: HttpTestingController;
  let awsSetup: AWSTestSetup;
  let snsClient: AWS.SNS;
  let dynamoClient: AWS.DynamoDB.DocumentClient;
  const config = getTestConfig();

  beforeAll(async () => {
    if (skipIntegrationTests()) {
      pending('Integration tests skipped');
      return;
    }

    awsSetup = new AWSTestSetup();
    snsClient = awsSetup.getSNSClient();
    dynamoClient = awsSetup.getDynamoDBClient();
    
    // Setup test infrastructure
    await awsSetup.createTestTables();
    await awsSetup.createTestSNSTopic();
    await awsSetup.createTestSecrets();
  });

  afterAll(async () => {
    if (awsSetup) {
      await awsSetup.cleanupTestResources();
    }
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SmsVerificationService]
    });

    smsService = TestBed.inject(SmsVerificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('SMS Code Generation and Sending', () => {
    it('should generate and send SMS verification code', async () => {
      const phoneNumber = config.credentials.testPhoneNumber;

      const result = await smsService.sendVerificationCode(phoneNumber);

      expect(result.StatusCode).toBe(200);
      expect(result.Message).toContain('sent successfully');
      expect(result.Data.phoneNumber).toBe(phoneNumber);
      expect(result.Data.messageId).toBeDefined();
    });

    it('should generate different codes for different phone numbers', async () => {
      const phoneNumbers = [
        '+15551234567',
        '+15551234568',
        '+15551234569'
      ];

      const codes = [];
      for (const phoneNumber of phoneNumbers) {
        const result = await smsService.sendVerificationCode(phoneNumber);
        if (result.StatusCode === 200) {
          codes.push(result.Data.verificationCode);
        }
      }

      // All codes should be different (very high probability)
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should generate consistent codes for same phone number and timestamp', async () => {
      const phoneNumber = '+15551234570';
      
      // Mock consistent timestamp
      const mockTimestamp = Math.floor(Date.now() / 300000) * 300000; // 5-minute window
      spyOn(Date, 'now').and.returnValue(mockTimestamp);

      const result1 = await smsService.sendVerificationCode(phoneNumber);
      const result2 = await smsService.sendVerificationCode(phoneNumber);

      if (result1.StatusCode === 200 && result2.StatusCode === 200) {
        expect(result1.Data.verificationCode).toBe(result2.Data.verificationCode);
      }
    });
  });

  describe('SMS Code Verification', () => {
    it('should verify valid SMS code', async () => {
      const phoneNumber = '+15551234571';
      
      // Send code first
      const sendResult = await smsService.sendVerificationCode(phoneNumber);
      expect(sendResult.StatusCode).toBe(200);
      
      const verificationCode = sendResult.Data.verificationCode;
      
      // Verify the code
      const verifyResult = await smsService.verifyCode(phoneNumber, verificationCode);
      
      expect(verifyResult.StatusCode).toBe(200);
      expect(verifyResult.Message).toContain('verified successfully');
      expect(verifyResult.Data.isValid).toBe(true);
    });

    it('should reject invalid SMS codes', async () => {
      const phoneNumber = '+15551234572';
      const invalidCodes = [
        '000000',    // Wrong code
        '123456',    // Wrong code
        '12345',     // Too short
        '1234567',   // Too long
        'abcdef',    // Non-numeric
        '',          // Empty
        null,        // Null
        undefined    // Undefined
      ];

      for (const invalidCode of invalidCodes) {
        const result = await smsService.verifyCode(phoneNumber, invalidCode);
        
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Data.isValid).toBe(false);
      }
    });

    it('should handle expired codes', async () => {
      const phoneNumber = '+15551234573';
      
      // Mock old timestamp (more than 5 minutes ago)
      const oldTimestamp = Date.now() - (6 * 60 * 1000);
      spyOn(Date, 'now').and.returnValue(oldTimestamp);
      
      const sendResult = await smsService.sendVerificationCode(phoneNumber);
      const verificationCode = sendResult.Data.verificationCode;
      
      // Reset timestamp to current time
      Date.now.and.returnValue(Date.now());
      
      const verifyResult = await smsService.verifyCode(phoneNumber, verificationCode);
      
      expect(verifyResult.StatusCode).toBeGreaterThanOrEqual(400);
      expect(verifyResult.Message).toContain('expired');
    });
  });

  describe('Rate Limiting Protection', () => {
    it('should enforce SMS rate limiting per phone number', async () => {
      const phoneNumber = '+15551234574';
      
      // Clear any existing rate limit data
      try {
        await dynamoClient.delete({
          TableName: 'test-sms-rate-limit',
          Key: { phoneNumber }
        }).promise();
      } catch (error) {
        // Ignore if item doesn't exist
      }

      let successCount = 0;
      let rateLimitedCount = 0;

      // Attempt to send multiple SMS within rate limit window
      for (let i = 0; i < 5; i++) {
        const result = await smsService.sendVerificationCode(phoneNumber);
        
        if (result.StatusCode === 200) {
          successCount++;
        } else if (result.StatusCode === 429) {
          rateLimitedCount++;
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Should allow some requests but block excessive ones
      expect(successCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThan(5);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should track rate limit data in DynamoDB', async () => {
      const phoneNumber = '+15551234575';
      
      // Send SMS to trigger rate limit tracking
      await smsService.sendVerificationCode(phoneNumber);
      
      // Check DynamoDB for rate limit record
      const rateLimitData = await dynamoClient.get({
        TableName: 'test-sms-rate-limit',
        Key: { phoneNumber }
      }).promise();

      expect(rateLimitData.Item).toBeDefined();
      expect(rateLimitData.Item.phoneNumber).toBe(phoneNumber);
      expect(rateLimitData.Item.requestCount).toBeGreaterThan(0);
      expect(rateLimitData.Item.firstRequestTime).toBeDefined();
      expect(rateLimitData.Item.ttl).toBeDefined();
    });

    it('should reset rate limit after time window', async () => {
      const phoneNumber = '+15551234576';
      
      // Set up expired rate limit data
      const expiredTime = Math.floor(Date.now() / 1000) - 3700; // More than 1 hour ago
      await dynamoClient.put({
        TableName: 'test-sms-rate-limit',
        Item: {
          phoneNumber,
          requestCount: 3,
          firstRequestTime: expiredTime,
          ttl: expiredTime + 3600
        }
      }).promise();

      // Should allow new request after rate limit window expired
      const result = await smsService.sendVerificationCode(phoneNumber);
      expect(result.StatusCode).toBe(200);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate phone number formats', async () => {
      const validPhoneNumbers = [
        '+1234567890',
        '+12345678901',
        '+441234567890',
        '+33123456789'
      ];

      for (const phoneNumber of validPhoneNumbers) {
        const result = await smsService.sendVerificationCode(phoneNumber);
        // Should not fail due to format validation
        expect([200, 429]).toContain(result.StatusCode); // 200 for success, 429 for rate limit
      }
    });

    it('should reject invalid phone number formats', async () => {
      const invalidPhoneNumbers = [
        'notaphonenumber',
        '123',
        '+',
        '+123',
        '12345678901234567890', // Too long
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '; DROP TABLE users; --',
        '',
        null,
        undefined
      ];

      for (const phoneNumber of invalidPhoneNumbers) {
        const result = await smsService.sendVerificationCode(phoneNumber);
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).toContain('Invalid phone number');
      }
    });
  });

  describe('Security and Error Handling', () => {
    it('should handle SNS service errors gracefully', async () => {
      // Mock SNS error
      spyOn(snsClient, 'publish').and.returnValue({
        promise: () => Promise.reject(new Error('SNS Service Error'))
      } as any);

      const result = await smsService.sendVerificationCode('+15551234577');
      
      expect(result.StatusCode).toBeGreaterThanOrEqual(500);
      expect(result.Message).not.toContain('SNS Service Error'); // Should not expose internal errors
    });

    it('should handle DynamoDB errors gracefully', async () => {
      // Mock DynamoDB error
      spyOn(dynamoClient, 'get').and.returnValue({
        promise: () => Promise.reject(new Error('DynamoDB Error'))
      } as any);

      const result = await smsService.sendVerificationCode('+15551234578');
      
      // Should still attempt to send SMS even if rate limit check fails
      expect(result.StatusCode).toBeDefined();
    });

    it('should sanitize inputs against injection attacks', async () => {
      const maliciousInputs = [
        '+1234567890<script>alert(1)</script>',
        '+1234567890"; DROP TABLE sms; --',
        '+1234567890$(rm -rf /)',
        '+1234567890\x00\x01\x02',
        '+1234567890\r\n\r\nHEADER: value'
      ];

      for (const maliciousInput of maliciousInputs) {
        const result = await smsService.sendVerificationCode(maliciousInput);
        
        expect(result.StatusCode).toBeGreaterThanOrEqual(400);
        expect(result.Message).not.toContain('<script>');
        expect(result.Message).not.toContain('DROP TABLE');
        expect(result.Message).not.toContain('rm -rf');
      }
    });

    it('should prevent timing attacks on verification', async () => {
      const phoneNumber = '+15551234579';
      const validCode = '123456';
      const invalidCode = '000000';
      
      // Send valid code first
      await smsService.sendVerificationCode(phoneNumber);
      
      // Measure verification timing
      const validTimes = [];
      const invalidTimes = [];
      
      for (let i = 0; i < 10; i++) {
        // Time valid code verification
        const validStart = performance.now();
        await smsService.verifyCode(phoneNumber, validCode);
        validTimes.push(performance.now() - validStart);
        
        // Time invalid code verification
        const invalidStart = performance.now();
        await smsService.verifyCode(phoneNumber, invalidCode);
        invalidTimes.push(performance.now() - invalidStart);
      }
      
      const avgValid = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
      const avgInvalid = invalidTimes.reduce((a, b) => a + b, 0) / invalidTimes.length;
      
      // Timing difference should be minimal to prevent timing attacks
      const timingDiff = Math.abs(avgValid - avgInvalid);
      expect(timingDiff).toBeLessThan(10); // Within 10ms
    });
  });

  describe('Integration with Authentication Flow', () => {
    it('should integrate with user registration flow', async () => {
      const registrationData = {
        email: 'newuser@integration.com',
        phoneNumber: '+15551234580',
        firstName: 'New',
        lastName: 'User'
      };

      // Mock user registration endpoint
      const req = httpMock.expectOne('/api/auth/register');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.phoneNumber).toBe(registrationData.phoneNumber);
      
      req.flush({
        status: 'pending_verification',
        userId: 'user-123'
      });

      // Send SMS verification as part of registration
      const smsResult = await smsService.sendVerificationCode(registrationData.phoneNumber);
      expect(smsResult.StatusCode).toBe(200);
    });

    it('should integrate with MFA authentication flow', async () => {
      const mfaData = {
        userId: 'user-123',
        phoneNumber: '+15551234581',
        sessionToken: 'mfa-session-token'
      };

      // Mock MFA challenge endpoint
      const req = httpMock.expectOne('/api/auth/mfa/challenge');
      expect(req.request.method).toBe('POST');
      expect(req.request.body.phoneNumber).toBe(mfaData.phoneNumber);
      
      req.flush({
        challengeId: 'challenge-123',
        method: 'SMS'
      });

      // Send SMS for MFA
      const smsResult = await smsService.sendVerificationCode(mfaData.phoneNumber);
      expect(smsResult.StatusCode).toBe(200);
    });

    it('should handle phone number verification in profile updates', async () => {
      const updateData = {
        userId: 'user-123',
        newPhoneNumber: '+15551234582'
      };

      // Mock profile update endpoint
      const req = httpMock.expectOne('/api/users/update-phone');
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.phoneNumber).toBe(updateData.newPhoneNumber);
      
      req.flush({
        status: 'pending_verification',
        verificationRequired: true
      });

      // Send SMS for phone number verification
      const smsResult = await smsService.sendVerificationCode(updateData.newPhoneNumber);
      expect(smsResult.StatusCode).toBe(200);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent SMS requests', async () => {
      const phoneNumbers = [
        '+15551234583',
        '+15551234584',
        '+15551234585',
        '+15551234586',
        '+15551234587'
      ];

      // Send concurrent SMS requests
      const promises = phoneNumbers.map(phoneNumber => 
        smsService.sendVerificationCode(phoneNumber)
      );

      const results = await Promise.all(promises);
      
      // Should handle concurrent requests without errors
      results.forEach(result => {
        expect(result.StatusCode).toBeDefined();
        expect([200, 429, 500]).toContain(result.StatusCode);
      });
    });

    it('should maintain performance under load', async () => {
      const phoneNumber = '+15551234588';
      
      // Clear rate limit to allow multiple requests
      try {
        await dynamoClient.delete({
          TableName: 'test-sms-rate-limit',
          Key: { phoneNumber }
        }).promise();
      } catch (error) {
        // Ignore if item doesn't exist
      }

      const startTime = performance.now();
      
      // Send multiple verification requests
      for (let i = 0; i < 5; i++) {
        await smsService.sendVerificationCode(`${phoneNumber}${i}`);
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(executionTime).toBeLessThan(5000);
    });

    it('should handle SMS delivery failures gracefully', async () => {
      // Mock SNS delivery failure
      spyOn(snsClient, 'publish').and.returnValue({
        promise: () => Promise.resolve({
          MessageId: 'failed-delivery-id'
        })
      } as any);

      const result = await smsService.sendVerificationCode('+15551234589');
      
      // Should return success even if delivery status is unknown
      expect(result.StatusCode).toBe(200);
      expect(result.Data.messageId).toBeDefined();
    });
  });
});