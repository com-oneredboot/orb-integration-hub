// file: apps/web/src/app/features/user/store/user.effects.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, delay, filter, finalize, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { from, of, EMPTY } from "rxjs";
import { Store } from '@ngrx/store';

// Application Imports
import { UserService } from "../../../core/services/user.service";
import { UserActions } from "./user.actions";
import * as fromUser from "./user.selectors";
import { AuthSteps } from "./user.state";
import { CognitoService } from "../../../core/services/cognito.service";
import { getError } from "../../../core/models/ErrorRegistryModel";
import { Users } from "../../../core/models/UsersModel";
import { RecoveryService } from "../../../core/services/recovery.service";
import { AuthProgressStorageService } from "../../../core/services/auth-progress-storage.service";
import { RecoveryAction } from "../../../core/models/RecoveryModel";
import { UserStatus } from "../../../core/enums/UserStatusEnum";
import { sanitizeEmail, sanitizeCognitoSub } from "../../../core/utils/log-sanitizer";

@Injectable()
export class UserEffects {

  // Smart Check Effect - replaces checkEmail$ for smart recovery flow
  smartCheck$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.smartCheck),
      switchMap(({ email }) => {
        return from(this.recoveryService.smartCheck(email)).pipe(
          switchMap(result => {
            // Save progress to local storage
            this.authProgressStorage.save({
              email,
              step: result.nextStep,
              timestamp: Date.now()
            });

            // If we need to resend verification code, do it
            if (result.recoveryAction === RecoveryAction.RESEND_VERIFICATION) {
              return from(this.recoveryService.resendVerificationCode(email)).pipe(
                map(() => UserActions.smartCheckSuccess({ result })),
                catchError(() => {
                  // Even if resend fails, continue with the flow
                  return of(UserActions.smartCheckSuccess({ result }));
                })
              );
            }

            return of(UserActions.smartCheckSuccess({ result }));
          }),
          catchError((error: Error) => {
            const errorObj = getError('ORB-SYS-001');
            return of(UserActions.smartCheckFailure({
              error: errorObj ? errorObj.message : error.message || 'Unexpected error'
            }));
          })
        );
      })
    )
  );

  // Resume from storage on page load
  resumeFromStorage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.resumeFromStorage),
      map(() => {
        const progress = this.authProgressStorage.get();
        if (progress && this.authProgressStorage.isValid(progress)) {
          return UserActions.resumeFromStorageSuccess({
            email: progress.email,
            step: progress.step
          });
        }
        return UserActions.resumeFromStorageNotFound();
      })
    )
  );

  // Validate resumed progress against backend
  validateResumedProgress$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.resumeFromStorageSuccess),
      switchMap(({ email }) => {
        // Trigger smart check to validate the stored state
        return of(UserActions.smartCheck({ email }));
      })
    )
  );

  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUser),
      switchMap(({ input, password }) => {
        // create the user
        return from(this.userService.userCreate(input, password)).pipe(
          map(response => {
            if (response.StatusCode === 200) {
              return UserActions.createUserSuccess();
            }
            
            // Check for "User already exists" in response message - trigger smart recovery
            const responseMessage = response.Message || '';
            if (responseMessage.includes('UsernameExistsException') || 
                responseMessage.includes('User already exists') ||
                responseMessage.includes('already exists')) {
              console.debug('[Effect][createUser$] User already exists, triggering smart check for:', sanitizeEmail(input.email));
              return UserActions.smartCheck({ email: input.email });
            }
            
            if (response.StatusCode === 401) {
              // Unauthorized: surface the error, do not dispatch createUserSuccess
              const errorObj = getError('ORB-API-002');
              return UserActions.createUserFailure({
                error: response.Message || (errorObj ? errorObj.message : 'Unauthorized')
              });
            }
            const errorObj = getError('ORB-API-002');
            return UserActions.createUserFailure({
              error: errorObj ? errorObj.message : 'GraphQL mutation error'
            });
          }),
          catchError(error => {
            // Check for UsernameExistsException - trigger smart recovery
            // Handle various error formats from Amplify/Cognito
            const errorMessage = error?.message || '';
            const errorString = String(error);
            const errorName = error?.name || '';
            const errorCode = error?.code || '';
            
            console.debug('[Effect][createUser$] catchError - error details:', {
              message: errorMessage,
              string: errorString,
              name: errorName,
              code: errorCode,
              fullError: JSON.stringify(error)
            });
            
            // Check all possible error indicators
            const isUsernameExists = 
              errorMessage.toLowerCase().includes('usernameexistsexception') || 
              errorMessage.toLowerCase().includes('user already exists') ||
              errorMessage.toLowerCase().includes('already exists') ||
              errorString.toLowerCase().includes('usernameexistsexception') ||
              errorString.toLowerCase().includes('already exists') ||
              errorName === 'UsernameExistsException' ||
              errorCode === 'UsernameExistsException';
            
            if (isUsernameExists) {
              console.debug('[Effect][createUser$] Caught UsernameExistsException, triggering smart check for:', sanitizeEmail(input.email));
              return of(UserActions.smartCheck({ email: input.email }));
            }
            
            const errorObj = getError('ORB-API-002');
            return of(UserActions.createUserFailure({
              error: errorObj ? errorObj.message : 'GraphQL mutation error'
            }));
          })
        );
      })
    )
  );

  // Create DynamoDB record only (user already exists in Cognito)
  createUserRecordOnly$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUserRecordOnly),
      switchMap(({ user }) => {
        console.log('[Effect][createUserRecordOnly$] Creating DynamoDB record for:', sanitizeEmail(user.email));
        
        // Use UsersCreate mutation to create the DynamoDB record
        // The user already exists in Cognito, so we just need the DynamoDB record
        const createInput = {
          userId: user.userId,
          cognitoId: user.cognitoId,
          cognitoSub: user.cognitoSub,
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phoneNumber: user.phoneNumber || '',
          phoneVerified: user.phoneVerified || false,
          emailVerified: user.emailVerified || true,
          mfaEnabled: user.mfaEnabled || true,
          mfaSetupComplete: user.mfaSetupComplete || true,
          groups: user.groups || ['USER'],
          status: user.status || 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return from(this.userService.createUserRecordOnly(createInput)).pipe(
          map(response => {
            if (response.StatusCode === 200 && response.Data) {
              console.log('[Effect][createUserRecordOnly$] DynamoDB record created successfully');
              return UserActions.createUserRecordOnlySuccess({ user: new Users(response.Data) });
            }
            console.error('[Effect][createUserRecordOnly$] Failed to create record:', response.Message);
            return UserActions.createUserRecordOnlyFailure({ 
              error: response.Message || 'Failed to create user record' 
            });
          }),
          catchError(error => {
            console.error('[Effect][createUserRecordOnly$] Error:', error);
            return of(UserActions.createUserRecordOnlyFailure({ 
              error: error instanceof Error ? error.message : 'Failed to create user record' 
            }));
          })
        );
      })
    )
  );

  // Complete auth flow after creating DynamoDB record
  handleCreateUserRecordOnlySuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUserRecordOnlySuccess),
      map(({ user }) => {
        console.log('[Effect][handleCreateUserRecordOnlySuccess$] Completing auth flow for:', sanitizeEmail(user.email));
        return UserActions.authFlowComplete({ user });
      })
    )
  );

  // Create user from Cognito (secure Lambda-backed operation)
  // This validates against Cognito and extracts all user data from there
  createUserFromCognito$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUserFromCognito),
      switchMap(({ cognitoSub }) => {
        console.log('[Effect][createUserFromCognito$] Creating user from Cognito with sub:', sanitizeCognitoSub(cognitoSub));
        
        return from(this.userService.createUserFromCognito(cognitoSub)).pipe(
          map(response => {
            console.log('[Effect][createUserFromCognito$] User created successfully:', sanitizeEmail(response.email));
            // Convert the response to a Users object
            const user = new Users({
              userId: response.userId,
              cognitoId: response.userId,
              cognitoSub: response.userId,
              email: response.email,
              firstName: response.firstName,
              lastName: response.lastName,
              status: response.status as UserStatus,
              emailVerified: response.emailVerified,
              phoneVerified: response.phoneVerified,
              mfaEnabled: response.mfaEnabled,
              mfaSetupComplete: response.mfaSetupComplete,
              groups: response.groups,
              createdAt: new Date(response.createdAt * 1000),
              updatedAt: new Date(response.updatedAt * 1000)
            });
            return UserActions.createUserFromCognitoSuccess({ user });
          }),
          catchError(error => {
            console.error('[Effect][createUserFromCognito$] Error:', error);
            return of(UserActions.createUserFromCognitoFailure({ 
              error: error instanceof Error ? error.message : 'Failed to create user from Cognito' 
            }));
          })
        );
      })
    )
  );

  // Complete auth flow after creating user from Cognito
  handleCreateUserFromCognitoSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUserFromCognitoSuccess),
      map(({ user }) => {
        console.log('[Effect][handleCreateUserFromCognitoSuccess$] Completing auth flow for:', sanitizeEmail(user.email));
        return UserActions.authFlowComplete({ user });
      })
    )
  );

  // Complete auth flow after successful sign-in
  handleSignInSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.signInSuccess),
      map(({ user }) => {
        console.log('[Effect][handleSignInSuccess$] Completing auth flow for:', sanitizeEmail(user.email));
        return UserActions.authFlowComplete({ user });
      })
    )
  );

  // Check email verification status in Cognito
  checkEmailVerificationStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkEmailVerificationStatus),
      switchMap(({ email }) => {
        return from(this.userService.checkCognitoEmailVerification(email)).pipe(
          map(isVerified => {
            return UserActions.checkEmailVerificationStatusSuccess({ isVerified, email });
          }),
          catchError(_error => {
            console.error('[Effect][checkEmailVerificationStatus$] Error:', _error);
            return of(UserActions.checkEmailVerificationStatusFailure({
              error: _error instanceof Error ? _error.message : 'Failed to check email verification status'
            }));
          })
        );
      })
    )
  );

  // Auto-update user table if email is verified in Cognito
  autoUpdateEmailVerification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkEmailVerificationStatusSuccess),
      filter((action): action is ReturnType<typeof UserActions.checkEmailVerificationStatusSuccess> => action.isVerified), // Only proceed if email is verified in Cognito
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      switchMap(([_action, currentUser]) => {
        if (!currentUser || currentUser.emailVerified) {
          // Skip if no user or already verified in our DB
          return EMPTY;
        }
        
        // Update the user record with verified email
        const updateInput = {
          userId: currentUser.userId,
          cognitoId: currentUser.cognitoId,
          cognitoSub: currentUser.cognitoSub,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          status: currentUser.status,
          createdAt: currentUser.createdAt,
          updatedAt: new Date(),
          phoneNumber: currentUser.phoneNumber,
          phoneVerified: currentUser.phoneVerified,
          emailVerified: true,
          groups: currentUser.groups,
          mfaEnabled: currentUser.mfaEnabled,
          mfaSetupComplete: currentUser.mfaSetupComplete
        };

        return from(this.userService.userUpdate(updateInput)).pipe(
          map(response => {
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }
            return UserActions.updateUserAfterEmailVerificationSuccess({ user: updatedUser });
          }),
          catchError(_error => {
            console.error('[Effect][autoUpdateEmailVerification$] Failed to auto-update email verification:', _error);
            return of(UserActions.updateUserAfterEmailVerificationFailure({ 
              error: _error instanceof Error ? _error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  verifyEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.verifyEmail),
      switchMap(({ code, email }) => {
        console.debug('[Effect][verifyEmail$] Starting email verification', { code: code ? '***' : 'empty', email: sanitizeEmail(email) });

        // Step 1: Confirm signup with Cognito first (no auth required)
        return from(this.cognitoService.emailVerify(email, code)).pipe(
          map(response => {
            console.debug('[Effect][verifyEmail$] Cognito confirmSignUp response', { 
              statusCode: response.StatusCode, 
              message: response.Message 
            });
            if (response.StatusCode === 200) {
              // Email verified with Cognito - user now needs to sign in
              return UserActions.verifyEmailSuccess({ email });
            }
            const errorObj = getError('ORB-AUTH-003');
            return UserActions.verifyEmailFailure({
              error: response.Message || (errorObj ? errorObj.message : 'Email verification failed')
            });
          }),
          catchError(_error => {
            console.error('[Effect][verifyEmail$] Cognito confirmSignUp error', _error);
            const errorObj = getError('ORB-AUTH-003');
            return of(UserActions.verifyEmailFailure({
              error: errorObj ? errorObj.message : 'Email verification failed'
            }));
          })
        );
      })
    )
  );

  // NOTE: User record update after email verification is handled during sign-in flow
  // The user doesn't have Cognito tokens yet after confirmSignUp, so we can't call
  // authenticated AppSync operations. The emailVerified flag will be synced when
  // the user signs in and we query/update their DynamoDB record.

  verifyCognitoPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.verifyCognitoPassword),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn( email, password )).pipe(
          map(response => {

            // error state
            if (response.StatusCode !== 200) {
              const errorObj = getError('ORB-AUTH-002');
              return UserActions.verifyCognitoPasswordFailure({
                error: errorObj ? errorObj.message : 'Invalid credentials'
              });
            }

            return UserActions.verifyCognitoPasswordSuccess({
              needsMFA: response.Data?.needsMFA,
              needsMFASetup: response.Data?.needsMFASetup,
              message: 'Successfully verified email and password',
              mfaSetupDetails: response.Data?.mfaSetupDetails
            });

          }),
          catchError(_error => {
            const errorObj = getError('ORB-AUTH-002');
            return of(UserActions.verifyCognitoPasswordFailure({
              error: errorObj ? errorObj.message : 'Invalid credentials'
            }));
          })
        )
      )
    )
  );

  // Auto-trigger signIn when step becomes SIGNIN (after password verification)
  autoSignIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.verifyCognitoPasswordSuccess),
      withLatestFrom(this.store.select(fromUser.selectCurrentEmail)),
      switchMap(([{ needsMFA, needsMFASetup }, email]) => {
        // Only auto-trigger signIn if no MFA is required
        if (!needsMFA && !needsMFASetup && email) {
          return of(UserActions.signIn({ 
            email, 
            password: '' // Password already verified, we just need to complete the sign-in
          }));
        }
        return EMPTY; // No action needed if MFA is required
      })
    )
  );

  // Check MFA status in Cognito
  checkMFAStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkMFAStatus),
      switchMap(() => {
        return from(this.userService.checkCognitoMFAStatus()).pipe(
          map(({ mfaEnabled, mfaSetupComplete }) => {
            return UserActions.checkMFAStatusSuccess({ mfaEnabled, mfaSetupComplete });
          }),
          catchError(_error => {
            console.error('[Effect][checkMFAStatus$] Error:', _error);
            return of(UserActions.checkMFAStatusFailure({
              error: _error instanceof Error ? _error.message : 'Failed to check MFA status'
            }));
          })
        );
      })
    )
  );

  // Auto-update user table if MFA is enabled in Cognito
  autoUpdateMFAStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkMFAStatusSuccess),
      filter((action): action is ReturnType<typeof UserActions.checkMFAStatusSuccess> => action.mfaEnabled && action.mfaSetupComplete), // Only proceed if MFA is enabled and setup
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      switchMap(([_action, currentUser]) => {
        if (!currentUser || (currentUser.mfaEnabled && currentUser.mfaSetupComplete)) {
          // Skip if no user or already enabled in our DB
          return EMPTY;
        }
        
        // Update the user record with MFA enabled status
        const updateInput = {
          userId: currentUser.userId,
          cognitoId: currentUser.cognitoId,
          cognitoSub: currentUser.cognitoSub,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          status: currentUser.status,
          createdAt: currentUser.createdAt,
          updatedAt: new Date(),
          phoneNumber: currentUser.phoneNumber,
          phoneVerified: currentUser.phoneVerified,
          emailVerified: currentUser.emailVerified,
          groups: currentUser.groups,
          mfaEnabled: true,
          mfaSetupComplete: true
        };

        return from(this.userService.userUpdate(updateInput)).pipe(
          map(response => {
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }
            return UserActions.updateUserAfterMFASetupSuccess({ user: updatedUser });
          }),
          catchError(_error => {
            console.error('[Effect][autoUpdateMFAStatus$] Failed to auto-update MFA status:', _error);
            return of(UserActions.updateUserAfterMFASetupFailure({ 
              error: _error instanceof Error ? _error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  setupMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.needsMFASetup),
      withLatestFrom(this.store.select(fromUser.selectMFADetails)),
      switchMap(([_action, existingMfaDetails]) => {
        
        // If we already have MFA setup details, use them (user should see QR code)
        if (existingMfaDetails?.secretKey && existingMfaDetails?.qrCode) {
          return of(UserActions.needsMFASetupSuccess());
        }
        
        // Otherwise, initiate fresh MFA setup through Cognito
        return from(this.cognitoService.setupMFA()).pipe(
          map(response => {
            if (response.StatusCode === 200 && response.Data?.mfaSetupDetails) {
              // Store the MFA setup details in the state for the UI to display
              return UserActions.verifyCognitoPasswordSuccess({
                message: 'MFA setup initiated',
                needsMFA: false,
                needsMFASetup: true,
                mfaSetupDetails: response.Data.mfaSetupDetails
              });
            }
            const errorObj = getError('ORB-AUTH-003');
            return UserActions.needsMFASetupFailure({
              error: errorObj ? errorObj.message : 'MFA setup failed'
            });
          }),
          catchError(_error => {
            console.error('[Effect][setupMFA$] MFA setup error:', _error);
            const errorObj = getError('ORB-AUTH-003');
            return of(UserActions.needsMFASetupFailure({
              error: errorObj ? errorObj.message : 'MFA setup failed'
            }));
          })
        );
      })
    )
  );

  // Update user record after successful MFA setup
  updateUserAfterMFASetup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.needsMFASetupSuccess),
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      switchMap(([_action, currentUser]) => {
        if (!currentUser) {
          return of(UserActions.updateUserAfterMFASetupFailure({ 
            error: 'Missing user data'
          }));
        }
        
        // Update the user record with MFA enabled
        const updateInput = {
          userId: currentUser.userId,
          cognitoId: currentUser.cognitoId,
          cognitoSub: currentUser.cognitoSub,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          status: currentUser.status,
          createdAt: currentUser.createdAt,
          updatedAt: new Date(),
          phoneNumber: currentUser.phoneNumber,
          phoneVerified: currentUser.phoneVerified,
          emailVerified: currentUser.emailVerified,
          groups: currentUser.groups,
          mfaEnabled: true,
          mfaSetupComplete: true
        };

        return from(this.userService.userUpdate(updateInput)).pipe(
          map(response => {
            // Extract the updated user from the response
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }

            return UserActions.updateUserAfterMFASetupSuccess({ user: updatedUser });
          }),
          catchError(_error => {
            console.error('Failed to update user after MFA setup:', _error);
            return of(UserActions.updateUserAfterMFASetupFailure({ 
              error: _error instanceof Error ? _error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  verifyMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.needsMFA),
      switchMap(({ code }) =>
        from(this.userService.mfaVerify(code)).pipe(
          map(response => {
            if (response.StatusCode === 200) {
              return UserActions.needsMFASuccess();
            }
            // Use the actual error message from the service
            return UserActions.needsMFAFailure({
              error: response.Message || 'MFA verification failed. Please try again.'
            });
          }),
          catchError(_error => {
            const errorMessage = _error instanceof Error ? _error.message : 'MFA verification failed. Please try again.';
            return of(UserActions.needsMFAFailure({
              error: errorMessage
            }));
          })
        )
      )
    )
  );

  // Handle MFA verification success - complete the auth flow
  handleMFASuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.needsMFASuccess),
      withLatestFrom(
        this.store.select(fromUser.selectCurrentUser),
        this.store.select(fromUser.selectCurrentEmail)
      ),
      switchMap(([, currentUser, email]) => {
        // If we already have the user, complete the flow
        if (currentUser) {
          console.log('[AuthEffects] MFA verification successful, completing auth flow for user:', sanitizeEmail(currentUser.email));
          return of(UserActions.authFlowComplete({ user: currentUser }));
        }
        
        // If no user but we have email, fetch the user from DynamoDB
        if (email) {
          console.log('[AuthEffects] MFA success, fetching user from DynamoDB for:', sanitizeEmail(email));
          return from(this.userService.userQueryByEmail(email)).pipe(
            switchMap(response => {
              console.debug('[AuthEffects] userQueryByEmail response: StatusCode', response.StatusCode);
              if (response.StatusCode === 200 && response.Data && response.Data.length > 0) {
                const user = new Users(response.Data[0]);
                console.log('[AuthEffects] User fetched successfully, completing auth flow');
                return of(UserActions.authFlowComplete({ user }));
              }
              
              // User not found in DynamoDB - need to create the record using secure Lambda
              // This uses CreateUserFromCognito which validates against Cognito and extracts all data from there
              console.log('[AuthEffects] User not found in DynamoDB (StatusCode:', response.StatusCode, ', Data length:', response.Data?.length, '), creating record via CreateUserFromCognito for:', sanitizeEmail(email));
              return from(this.cognitoService.getCognitoProfile()).pipe(
                switchMap(cognitoProfile => {
                  console.debug('[AuthEffects] getCognitoProfile result:', cognitoProfile);
                  if (!cognitoProfile) {
                    console.error('[AuthEffects] No Cognito profile available');
                    return of(UserActions.needsMFAFailure({ error: 'Unable to get user profile' }));
                  }
                  
                  const cognitoSub = cognitoProfile.sub as string || '';
                  if (!cognitoSub) {
                    console.error('[AuthEffects] No cognitoSub available in profile');
                    return of(UserActions.needsMFAFailure({ error: 'Unable to get user identifier' }));
                  }
                  
                  console.log('[AuthEffects] Creating DynamoDB record via CreateUserFromCognito with cognitoSub:', sanitizeCognitoSub(cognitoSub));
                  // Use the secure CreateUserFromCognito Lambda which validates against Cognito
                  // and extracts all user data from Cognito (prevents client-side data injection)
                  return of(UserActions.createUserFromCognito({ cognitoSub }));
                }),
                catchError(error => {
                  console.error('[AuthEffects] Error getting Cognito profile:', error);
                  return of(UserActions.needsMFAFailure({ error: 'Failed to create user record' }));
                })
              );
            }),
            catchError(error => {
              console.error('[AuthEffects] Error fetching user after MFA:', error);
              return of(UserActions.needsMFAFailure({ error: 'Failed to fetch user data' }));
            })
          );
        }
        
        console.error('[AuthEffects] MFA success but no current user or email available');
        return of(UserActions.needsMFAFailure({ error: 'User data not available' }));
      })
    )
  );

  // Add signIn effect - handles sign-in including MFA flows
  signIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.signIn),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn(email, password)).pipe(
          map(response => {
            console.debug('[Effect][signIn$] Response:', response);
            
            // Check for MFA setup required first
            if (response.StatusCode === 200 && response.Data?.needsMFASetup) {
              console.debug('[Effect][signIn$] MFA setup required, dispatching verifyCognitoPasswordSuccess');
              return UserActions.verifyCognitoPasswordSuccess({
                needsMFA: false,
                needsMFASetup: true,
                message: 'MFA setup required',
                mfaSetupDetails: response.Data.mfaSetupDetails
              });
            }
            
            // Check for MFA verification required
            if (response.StatusCode === 200 && response.Data?.needsMFA) {
              console.debug('[Effect][signIn$] MFA verification required, dispatching verifyCognitoPasswordSuccess');
              return UserActions.verifyCognitoPasswordSuccess({
                needsMFA: true,
                needsMFASetup: false,
                message: 'MFA verification required',
                mfaSetupDetails: response.Data.mfaSetupDetails
              });
            }
            
            // Check for successful sign-in with user
            if (response.StatusCode === 200 && response.Data?.isSignedIn && response.Data.user) {
              return UserActions.signInSuccess({ 
                user: response.Data.user, 
                message: response.Message || 'Sign in successful' 
              });
            }
            
            // Check for sign-in success without user record (user in Cognito but not DynamoDB)
            // The MFA flow will handle creating the record via CreateUserFromCognito
            if (response.StatusCode === 200 && response.Data?.isSignedIn && !response.Data.user) {
              console.debug('[Effect][signIn$] User signed in but no DynamoDB record - MFA flow will create it');
              // Continue with MFA flow which will create the user record
              return UserActions.verifyCognitoPasswordSuccess({
                needsMFA: false,
                needsMFASetup: false,
                message: 'Sign in successful, creating user record'
              });
            }
            
            const errorObj = getError('ORB-AUTH-002');
            return UserActions.signInFailure({
              error: response.Message || (errorObj ? errorObj.message : 'Sign in failed')
            });
          }),
          catchError(_error => {
            console.error('[Effect][signIn$] Error:', _error);
            const errorObj = getError('ORB-AUTH-002');
            return of(UserActions.signInFailure({
              error: errorObj ? errorObj.message : 'Sign in failed'
            }));
          })
        )
      )
    )
  );

  // Add signout effect
  signout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.signout),
      switchMap(() => {
        // Then attempt to sign out from Cognito service
        return from(this.cognitoService.signOut()).pipe(
          map(() => {
            return UserActions.signoutSuccess();
          }),
          catchError(_error => {
            console.error('Error during signout:', _error);
            // Even on error, we return success to ensure state is reset
            return of(UserActions.signoutSuccess());
          })
        );
      })
    )
  );

  // Navigate to signin page after successful signout
  signoutNavigation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.signoutSuccess),
      tap(() => {
        this.router.navigate(['/authenticate']);
      })
    ),
    { dispatch: false }
  );

  // Check phone required
  checkPhoneRequired$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkPhoneRequired),
      switchMap(() => {
        return of(UserActions.checkPhoneRequiredSuccess({ required: true }))
          .pipe(
            catchError(_error => of(UserActions.checkPhoneRequiredFailure({ 
              error: _error instanceof Error ? _error.message : 'Failed to check phone requirement'
            })))
          );
      })
    )
  );
  
  // Setup phone number
  setupPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.setupPhone),
      switchMap(({ phoneNumber }) => {
        return from(this.userService.sendSMSVerificationCode(phoneNumber)).pipe(
          map(response => {
            if (response.statusCode === 200) {
              return UserActions.setupPhoneSuccess({ 
                validationId: phoneNumber,
                expiresAt: Date.now() + 10 * 60 * 1000
              });
            }
            return UserActions.setupPhoneFailure({
              error: response.message || 'Failed to send verification code'
            });
          }),
          catchError(_error => of(UserActions.setupPhoneFailure({ 
            error: _error instanceof Error ? _error.message : 'Failed to set up phone verification'
          })))
        );
      })
    )
  );
  
  // Verify phone number
  verifyPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.verifyPhone),
      withLatestFrom(this.store.select(fromUser.selectPhoneValidationId)),
      switchMap(([{ code }, phoneNumber]) => {
        if (!phoneNumber) {
          return of(UserActions.verifyPhoneFailure({ 
            error: 'No phone number found for verification'
          }));
        }
        
        return from(this.userService.verifySMSCode(phoneNumber, code)).pipe(
          map(isValid => {
            if (isValid) {
              return UserActions.verifyPhoneSuccess();
            }
            return UserActions.verifyPhoneFailure({
              error: 'Invalid verification code'
            });
          }),
          catchError(_error => of(UserActions.verifyPhoneFailure({ 
            error: _error instanceof Error ? _error.message : 'Failed to verify phone code'
          })))
        );
      })
    )
  );

  // Update user record after successful phone verification
  updateUserAfterPhoneVerification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.verifyPhoneSuccess),
      withLatestFrom(
        this.store.select(fromUser.selectPhoneValidationId),
        this.store.select(fromUser.selectCurrentUser)
      ),
      switchMap(([_action, phoneNumber, currentUser]) => {
        if (!phoneNumber || !currentUser) {
          return of(UserActions.updateUserAfterPhoneVerificationFailure({ 
            error: 'Missing phone number or user data'
          }));
        }
        
        // Update the user record with verified phone number
        // Note: Status will be automatically calculated by DynamoDB stream trigger
        const updateInput = {
          userId: currentUser.userId,
          cognitoId: currentUser.cognitoId,
          cognitoSub: currentUser.cognitoSub,
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          status: currentUser.status,
          createdAt: currentUser.createdAt,
          updatedAt: new Date(),
          phoneNumber: phoneNumber,
          phoneVerified: true,
          groups: currentUser.groups,
          emailVerified: currentUser.emailVerified,
          mfaEnabled: currentUser.mfaEnabled,
          mfaSetupComplete: currentUser.mfaSetupComplete
        };

        return from(this.userService.userUpdate(updateInput)).pipe(
          map(response => {
            // Extract the updated user from the response
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }

            return UserActions.updateUserAfterPhoneVerificationSuccess({ user: updatedUser });
          }),
          catchError(_error => {
            console.error('Failed to update user after phone verification:', _error);
            return of(UserActions.updateUserAfterPhoneVerificationFailure({ 
              error: _error instanceof Error ? _error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  // Add missing refreshSession effect
  refreshSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.refreshSession),
      switchMap(() =>
        from(this.cognitoService.getCognitoProfile()).pipe(
          switchMap(cognitoProfile => {
            
            if (!cognitoProfile?.['email']) {
              throw new Error('No email found in Cognito profile');
            }
            
            // Get user data from our backend using the email from Cognito
            return from(this.userService.userExists({ email: cognitoProfile['email'] as string })).pipe(
              map(response => {
                
                // Handle backend user lookup - be resilient to failures
                if (response.StatusCode === 200 && response.Data && response.Data.length === 1) {
                  // Ideal case: user found in backend
                  const user = new Users(response.Data[0]);
                  return UserActions.refreshSessionSuccess({ user });
                }
                
                if (response.StatusCode === 500 && response.Data && response.Data.length > 1) {
                  // Multiple users found - this is a critical error we can't recover from
                  throw new Error('Multiple users found for email');
                }
                
                // For any other case (user not found, 500 error, network issues, etc.)
                // Continue with Cognito profile data to maintain user session
                
                // Create a minimal user object from Cognito profile
                const fallbackUser = new Users({
                  userId: (cognitoProfile.sub as string) || '', // Cognito user ID as fallback
                  cognitoSub: (cognitoProfile.sub as string) || '',
                  email: cognitoProfile['email'] as string,
                  firstName: (cognitoProfile['given_name'] as string) || '',
                  lastName: (cognitoProfile['family_name'] as string) || '',
                  emailVerified: cognitoProfile['email_verified'] === 'true',
                  groups: (cognitoProfile['cognito:groups'] as string[]) || []
                });
                
                return UserActions.refreshSessionSuccess({ user: fallbackUser });
              }),
              catchError(_backendError => {
                // Backend call failed completely (network error, etc.)
                // Continue with Cognito profile data
                
                const fallbackUser = new Users({
                  userId: (cognitoProfile.sub as string) || '',
                  cognitoSub: (cognitoProfile.sub as string) || '',
                  email: cognitoProfile['email'] as string,
                  firstName: (cognitoProfile['given_name'] as string) || '',
                  lastName: (cognitoProfile['family_name'] as string) || '',
                  emailVerified: cognitoProfile['email_verified'] === 'true',
                  groups: (cognitoProfile['cognito:groups'] as string[]) || []
                });
                
                return of(UserActions.refreshSessionSuccess({ user: fallbackUser }));
              })
            );
          }),
          catchError(_error => {
            console.error('Effect [RefreshSession]: Critical error (Cognito profile failed)', _error);
            const errorObj = getError('ORB-AUTH-001');
            return of(UserActions.refreshSessionFailure({
              error: errorObj ? errorObj.message : 'Session refresh failed'
            }));
          })
        )
      )
    )
  );

  // Auto-determine next verification step after session refresh
  determineNextStepAfterRefresh$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.refreshSessionSuccess),
      withLatestFrom(this.store.select(fromUser.selectCurrentStep)),
      filter(([, currentStep]) => {
        // Only run this logic if we're not in the middle of an auth flow
        // This prevents interference with active authentication steps
        const initialSteps = [AuthSteps.EMAIL, AuthSteps.PASSWORD, AuthSteps.SIGNIN, AuthSteps.COMPLETE];
        
        if (!initialSteps.includes(currentStep)) {
          return false;
        }
        return true;
      }),
      switchMap(([{ user }]) => {

        // Check email verification first
        if (!user.emailVerified) {
          return of(UserActions.checkEmailVerificationStatus({ email: user.email }));
        }

        // Check phone verification
        if (!user.phoneNumber || !user.phoneVerified) {
          return of(UserActions.setCurrentStep({ step: AuthSteps.PHONE_SETUP }));
        }

        // Check MFA status - this is async, so we let the MFA effects handle the step setting
        if (!user.mfaEnabled || !user.mfaSetupComplete) {
          return of(UserActions.checkMFAStatus());
        }

        // All verifications complete - trigger auth flow completion
        return of(UserActions.authFlowComplete({ user }));
      })
    )
  );

  // Handle email verification status check results
  handleEmailVerificationStatusCheck$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkEmailVerificationStatusSuccess),
      map(({ isVerified, email }) => {
        
        if (isVerified) {
          return UserActions.updateUserAfterEmailVerification({ email });
        } else {
          return UserActions.setCurrentStep({ step: AuthSteps.EMAIL_VERIFY });
        }
      })
    )
  );

  // Handle MFA status check results
  handleMFAStatusCheck$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkMFAStatusSuccess),
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      switchMap(([{ mfaEnabled, mfaSetupComplete }, currentUser]) => {
        
        if (!currentUser) {
          return of(UserActions.setCurrentStep({ step: AuthSteps.EMAIL }));
        }
        
        // Check if user record needs updating
        const userMfaEnabled = currentUser.mfaEnabled;
        const userMfaSetupComplete = currentUser.mfaSetupComplete;
        
        // If user record has nulls or doesn't match Cognito, update the record
        if (userMfaEnabled !== mfaEnabled || userMfaSetupComplete !== mfaSetupComplete) {
          return of(UserActions.updateUserAfterMFASetup());
        }
        
        // Now handle the flow based on actual Cognito status
        if (!mfaEnabled || !mfaSetupComplete) {
          return EMPTY; // Stay on current step
        } else {
          return of(UserActions.authFlowComplete({ user: currentUser }));
        }
      })
    )
  );

  // Continue flow after email verification user update
  continueAfterEmailVerificationUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUserAfterEmailVerificationSuccess),
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      map(([_action, user]) => {
        
        if (!user) {
          return UserActions.setCurrentStep({ step: AuthSteps.EMAIL });
        }

        // Check phone verification next
        if (!user.phoneNumber || !user.phoneVerified) {
          return UserActions.setCurrentStep({ step: AuthSteps.PHONE_SETUP });
        }

        // Check MFA status next
        if (!user.mfaEnabled || !user.mfaSetupComplete) {
          return UserActions.checkMFAStatus();
        }

        // All complete
        return UserActions.authFlowComplete({ user });
      })
    )
  );

  // Continue flow after MFA setup user update
  continueAfterMFASetupUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUserAfterMFASetupSuccess),
      map(({ user }) => {
        return UserActions.authFlowComplete({ user });
      })
    )
  );

  // ===== NEW FLOW CONTROL EFFECTS =====
  
  // Handle auth flow completion - determines where to redirect based on user state
  authFlowComplete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.authFlowComplete),
      map(({ user: _user }) => {
        return UserActions.redirectToDashboard();
      })
    )
  );

  // Handle dashboard redirects
  redirectToDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.redirectToDashboard),
      tap(() => {
        this.router.navigate(['/dashboard']);
      })
    ), { dispatch: false }
  );

  // Handle profile redirects (kept for potential future use)
  redirectToProfile$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.redirectToProfile),
      tap(() => {
        this.router.navigate(['/profile']);
      })
    ), { dispatch: false }
  );

  // Handle MFA setup flow initiation
  beginMFASetupFlow$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.beginMFASetupFlow),
      map(() => {
        return UserActions.setCurrentStep({ step: AuthSteps.MFA_SETUP });
      })
    )
  );

  // Handle MFA check process
  checkMFASetup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkMFASetup),
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      switchMap(([_action, user]) => {
        if (!user) {
          return of(UserActions.checkMFASetupFailure({ error: 'No user found' }));
        }

        console.log('[Auth Effect] Starting MFA check for user:', user.userId);

        // Update the user timestamp to trigger Lambda processing
        return from(this.userService.updateUserTimestamp(user)).pipe(
          switchMap(() => {
            console.log('[Auth Effect] User timestamp updated, starting refresh sequence...');
            
            // Create a sequence of refresh attempts with exponential backoff
            const refreshSequence = [
              of(null).pipe(delay(1000)), // Wait 1s
              of(null).pipe(delay(2000)), // Wait 2s more (3s total)
              of(null).pipe(delay(4000))  // Wait 4s more (7s total)
            ];

            // Execute refresh attempts in sequence
            return from(refreshSequence).pipe(
              switchMap((obs, index) => 
                obs.pipe(
                  tap(() => {
                    console.log(`[Auth Effect] Refresh attempt ${index + 1}`);
                    this.store.dispatch(UserActions.refreshSession());
                  })
                )
              ),
              // After all refreshes complete, mark as success
              finalize(() => {
                console.log('[Auth Effect] MFA check sequence completed');
                setTimeout(() => {
                  this.store.dispatch(UserActions.checkMFASetupSuccess());
                }, 1000); // Small delay to let final refresh complete
              }),
              // Don't emit any values, just handle side effects
              switchMap(() => EMPTY)
            );
          }),
          catchError(_error => {
            console.error('[Auth Effect] MFA check failed:', _error);
            return of(UserActions.checkMFASetupFailure({ 
              error: _error instanceof Error ? _error.message : 'Failed to check MFA setup'
            }));
          })
        );
      })
    )
  );


  constructor(
    private actions$: Actions,
    private userService: UserService,
    private cognitoService: CognitoService,
    private store: Store,
    private router: Router,
    private recoveryService: RecoveryService,
    private authProgressStorage: AuthProgressStorageService
  ) {}
}
