// file: apps/web/src/app/core/services/cognito.service.bug-exploration.spec.ts
// author: Kiro AI Assistant
// date: 2025-01-XX
// description: Bug condition exploration test for unnecessary Cognito API calls on startup
// CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists

import { TestBed } from '@angular/core/testing';
import { CognitoService } from './cognito.service';
import * as AmplifyAuth from 'aws-amplify/auth';

/**
 * Bug Condition Exploration Test
 * 
 * PURPOSE: Surface counterexamples that demonstrate unnecessary Cognito API calls
 * when no local tokens exist in IndexedDB.
 * 
 * EXPECTED OUTCOME: This test MUST FAIL on unfixed code
 * - Failure proves the bug exists (HTTP requests made when no tokens exist)
 * - Success after fix proves the bug is resolved
 * 
 * BUG DESCRIPTION:
 * - checkIsAuthenticated() and checkHasTokens() immediately call fetchAuthSession()
 * - fetchAuthSession() makes HTTP requests to Cognito even when no tokens exist
 * - Results in 400 "Bad Request" errors in console on app startup
 * 
 * ROOT CAUSE:
 * - No local storage check before calling fetchAuthSession()
 * - Missing early-exit path for "definitely not logged in" case
 */
describe('CognitoService - Bug Condition Exploration', () => {
  let service: CognitoService;
  let fetchAuthSessionSpy: jasmine.Spy;
  let consoleErrorSpy: jasmine.Spy;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CognitoService]
    });

    service = TestBed.inject(CognitoService);

    // Spy on fetchAuthSession to detect HTTP requests
    fetchAuthSessionSpy = jasmine.createSpy('fetchAuthSession').and.returnValue(
      Promise.reject({
        name: 'NotAuthorizedException',
        message: 'Bad Request',
        $metadata: { httpStatusCode: 400 }
      })
    );
    spyOn(AmplifyAuth, 'fetchAuthSession').and.callFake(fetchAuthSessionSpy);

    // Spy on console.error to detect 400 errors
    consoleErrorSpy = jasmine.createSpy('console.error');
    spyOn(console, 'error').and.callFake(consoleErrorSpy);
    spyOn(console, 'debug').and.stub(); // Suppress debug logs
  });

  afterEach(async () => {
    // Clean up IndexedDB after each test
    await clearIndexedDB();
  });

  /**
   * Helper: Clear all IndexedDB data to simulate fresh app start
   */
  async function clearIndexedDB(): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return; // Not in browser environment
    }

    try {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    } catch (error) {
      // IndexedDB.databases() not supported in all browsers
      // Try to delete known Amplify database
      try {
        indexedDB.deleteDatabase('amplify-datastore');
      } catch (e) {
        // Ignore errors
      }
    }
  }

  /**
   * Helper: Verify no HTTP requests were made to Cognito
   */
  function assertNoHttpRequestMade(): void {
    expect(fetchAuthSessionSpy).not.toHaveBeenCalled();
  }

  /**
   * Helper: Verify no console errors were logged
   */
  function assertNoConsoleErrors(): void {
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  }

  describe('Property 1: Fault Condition - No API Calls Without Local Tokens', () => {
    
    it('EXPLORATION TEST: checkIsAuthenticated() should NOT make HTTP requests when no local tokens exist', async () => {
      // GIVEN: Fresh app start with no tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: checkIsAuthenticated() is called (simulating app startup)
      const result = await service.checkIsAuthenticated();

      // THEN: Expected behavior (will FAIL on unfixed code)
      // 1. No HTTP request should be made to Cognito
      assertNoHttpRequestMade();
      
      // 2. Should return false immediately
      expect(result).toBe(false);
      
      // 3. No console errors should appear
      assertNoConsoleErrors();

      // COUNTEREXAMPLE DOCUMENTATION (when test fails):
      // - fetchAuthSession was called: ${fetchAuthSessionSpy.calls.count()} times
      // - Console errors logged: ${consoleErrorSpy.calls.count()} times
      // - This proves the bug exists: HTTP requests made when no tokens exist
    });

    it('EXPLORATION TEST: checkHasTokens() should NOT make HTTP requests when no local tokens exist', async () => {
      // GIVEN: Fresh app start with no tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: checkHasTokens() is called (simulating lightweight token check)
      const result = await service.checkHasTokens();

      // THEN: Expected behavior (will FAIL on unfixed code)
      // 1. No HTTP request should be made to Cognito
      assertNoHttpRequestMade();
      
      // 2. Should return false immediately
      expect(result).toBe(false);
      
      // 3. No console errors should appear
      assertNoConsoleErrors();

      // COUNTEREXAMPLE DOCUMENTATION (when test fails):
      // - fetchAuthSession was called: ${fetchAuthSessionSpy.calls.count()} times
      // - This proves checkHasTokens() is NOT lightweight
      // - It makes HTTP requests even when no tokens exist
    });

    it('EXPLORATION TEST: Multiple authentication checks should NOT accumulate HTTP requests', async () => {
      // GIVEN: Fresh app start with no tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: Multiple authentication checks are made (simulating app initialization)
      await service.checkIsAuthenticated();
      await service.checkHasTokens();
      await service.checkIsAuthenticated();

      // THEN: Expected behavior (will FAIL on unfixed code)
      // 1. No HTTP requests should be made to Cognito
      assertNoHttpRequestMade();
      
      // 2. No console errors should accumulate
      assertNoConsoleErrors();

      // COUNTEREXAMPLE DOCUMENTATION (when test fails):
      // - Total fetchAuthSession calls: ${fetchAuthSessionSpy.calls.count()}
      // - This proves the bug compounds with multiple checks
      // - Each check makes unnecessary HTTP requests
    });

    it('EXPLORATION TEST: App startup sequence should NOT trigger 400 errors', async () => {
      // GIVEN: Fresh app start with no tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: Simulating typical app startup sequence
      // 1. Auth guard checks authentication
      const isAuthenticated = await service.checkIsAuthenticated();
      
      // 2. Service checks for tokens
      const hasTokens = await service.checkHasTokens();
      
      // 3. Component checks authentication state
      const isAuthenticatedAgain = await service.checkIsAuthenticated();

      // THEN: Expected behavior (will FAIL on unfixed code)
      // 1. All checks should return false
      expect(isAuthenticated).toBe(false);
      expect(hasTokens).toBe(false);
      expect(isAuthenticatedAgain).toBe(false);
      
      // 2. No HTTP requests should be made
      assertNoHttpRequestMade();
      
      // 3. No 400 errors should appear in console
      assertNoConsoleErrors();

      // COUNTEREXAMPLE DOCUMENTATION (when test fails):
      // - This simulates real app startup behavior
      // - fetchAuthSession calls: ${fetchAuthSessionSpy.calls.count()}
      // - Console errors: ${consoleErrorSpy.calls.count()}
      // - Users see red error messages on every app load
    });
  });

  describe('Bug Condition Analysis', () => {
    
    it('ANALYSIS: Verify fetchAuthSession is called immediately without local storage check', async () => {
      // GIVEN: No tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: checkIsAuthenticated() is called
      const startTime = Date.now();
      await service.checkIsAuthenticated();
      const endTime = Date.now();

      // THEN: Analyze the behavior
      const executionTime = endTime - startTime;

      // EXPECTED (on unfixed code):
      // - fetchAuthSession is called immediately
      // - No local storage check happens first
      // - Execution time includes network request time
      
      if (fetchAuthSessionSpy.calls.count() > 0) {
        console.log('BUG CONFIRMED: fetchAuthSession was called without local storage check');
        console.log(`Execution time: ${executionTime}ms (includes network request)`);
        console.log('ROOT CAUSE: Missing hasLocalTokens() check before fetchAuthSession()');
      }

      // This test documents the root cause for the fix implementation
      expect(fetchAuthSessionSpy).toHaveBeenCalled(); // Will pass on unfixed code
    });

    it('ANALYSIS: Verify 400 error response from Cognito when no tokens exist', async () => {
      // GIVEN: No tokens in IndexedDB
      await clearIndexedDB();

      // Configure spy to simulate actual Cognito 400 response
      fetchAuthSessionSpy.and.returnValue(
        Promise.reject({
          name: 'NotAuthorizedException',
          message: 'Bad Request',
          $metadata: { httpStatusCode: 400 }
        })
      );

      // WHEN: checkIsAuthenticated() is called
      await service.checkIsAuthenticated();

      // THEN: Analyze the error
      if (fetchAuthSessionSpy.calls.count() > 0) {
        console.log('BUG CONFIRMED: HTTP request made to Cognito');
        console.log('RESULT: 400 Bad Request error (no tokens to validate)');
        console.log('IMPACT: Red error messages in console on app startup');
      }

      // This test documents the user-visible symptom
      expect(fetchAuthSessionSpy).toHaveBeenCalled(); // Will pass on unfixed code
    });
  });

  describe('Expected Fix Behavior (for reference)', () => {
    
    it('REFERENCE: After fix, checkIsAuthenticated() should check local storage first', async () => {
      // This test documents the expected behavior after the fix
      // It will FAIL on unfixed code and PASS after the fix
      
      // GIVEN: No tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: checkIsAuthenticated() is called
      const result = await service.checkIsAuthenticated();

      // THEN: Expected behavior after fix
      // 1. Should check IndexedDB for LastAuthUser key FIRST
      // 2. Should return false immediately if no LastAuthUser exists
      // 3. Should NOT call fetchAuthSession() at all
      // 4. Should NOT make any HTTP requests
      // 5. Should NOT log any console errors
      
      expect(result).toBe(false);
      assertNoHttpRequestMade();
      assertNoConsoleErrors();
    });

    it('REFERENCE: After fix, checkHasTokens() should be truly lightweight', async () => {
      // This test documents the expected behavior after the fix
      // It will FAIL on unfixed code and PASS after the fix
      
      // GIVEN: No tokens in IndexedDB
      await clearIndexedDB();

      // WHEN: checkHasTokens() is called
      const startTime = Date.now();
      const result = await service.checkHasTokens();
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // THEN: Expected behavior after fix
      // 1. Should be very fast (< 10ms) - only IndexedDB read
      // 2. Should NOT make HTTP requests
      // 3. Should return false immediately
      
      expect(result).toBe(false);
      expect(executionTime).toBeLessThan(10); // Lightweight = fast
      assertNoHttpRequestMade();
    });
  });
});
