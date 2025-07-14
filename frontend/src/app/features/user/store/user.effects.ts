// file: frontend/src/app/features/user/store/user.effects.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, map, switchMap, tap, withLatestFrom, delay, finalize } from 'rxjs/operators';
import { from, of, EMPTY } from "rxjs";
import { Store } from '@ngrx/store';

// Application Imports
import { UserService } from "../../../core/services/user.service";
import { UsersQueryByEmail } from "../../../core/graphql/Users.graphql";
import { UserActions } from "./user.actions";
import * as fromUser from "./user.selectors";
import { AuthSteps } from "./user.state";
import { CognitoService } from "../../../core/services/cognito.service";
import { getError } from "../../../core/models/ErrorRegistryModel";
import { UsersQueryByEmailInput, UsersResponse, UsersListResponse, Users } from "../../../core/models/UsersModel";

@Injectable()
export class UserEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.checkEmail),
      switchMap(({ email }) => {
        const userInput: UsersQueryByEmailInput = { email: email };
        
        return from(this.userService.userExists(userInput)).pipe(
          map((result: UsersListResponse) => {
            const users = result.Data || [];
            if (result.StatusCode === 500 && users.length > 1) {
              // Duplicate user error
              console.error('Duplicate users found for email:', email, users);
              const errorObj = getError('ORB-AUTH-006'); // Use a suitable error code
              return UserActions.checkEmailFailure({
                error: errorObj ? errorObj.message : 'Duplicate users found for this email.'
              });
            }
            if (result.StatusCode === 200 && users.length === 1) {
              // User exists
              return UserActions.checkEmailSuccess({ userExists: true });
            }
            if (result.StatusCode === 200 && users.length === 0) {
              // User not found
              return UserActions.checkEmailUserNotFound();
            }
            // Any other statusCode is an error
            const errorObj = getError('ORB-AUTH-005');
            return UserActions.checkEmailFailure({ error: errorObj ? errorObj.message : 'User email check failed' });
          }),
          catchError((error: Error) => {
            // Map network errors to ORB-API-004, others to ORB-SYS-001
            let errorCode = 'ORB-SYS-001';
            const message = error.message || '';
            if (
              message.includes('Unable to connect to the server') ||
              message.includes('ERR_NAME_NOT_RESOLVED') ||
              message.includes('NetworkError') ||
              message.includes('Failed to fetch') ||
              message.includes('network timeout') ||
              message.includes('Could not connect')
            ) {
              errorCode = 'ORB-API-004';
            }
            const errorObj = getError(errorCode);
            return of(UserActions.checkEmailFailure({
              error: errorObj ? errorObj.message : 'Unexpected error'
            }));
          })
        );
      }),
      catchError(error => {
        console.error('Effect [CheckEmail]: Error caught', error);
        const errorObj = getError('ORB-SYS-001');
        return of(UserActions.checkEmailFailure({
          error: errorObj ? errorObj.message : 'Unexpected error'
        }));
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
            const errorObj = getError('ORB-API-002');
            return of(UserActions.createUserFailure({
              error: errorObj ? errorObj.message : 'GraphQL mutation error'
            }));
          })
        );
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
          catchError(error => {
            console.error('[Effect][checkEmailVerificationStatus$] Error:', error);
            return of(UserActions.checkEmailVerificationStatusFailure({
              error: error instanceof Error ? error.message : 'Failed to check email verification status'
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
      switchMap(([action, currentUser]) => {
        const { email } = action;
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
          updatedAt: new Date().toISOString(),
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
          catchError(error => {
            console.error('[Effect][autoUpdateEmailVerification$] Failed to auto-update email verification:', error);
            return of(UserActions.updateUserAfterEmailVerificationFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
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

        return from(this.userService.userExists({ email })).pipe(
          switchMap(user => {
            const users = Array.isArray(user.Data) ? user.Data : [];
            if (user.StatusCode === 500 && users.length > 1) {

              // Duplicate user error
              console.error('Duplicate users found for email:', email, users);
              const errorObj = getError('ORB-AUTH-006');
              return of(UserActions.verifyEmailFailure({
                error: errorObj ? errorObj.message : 'Duplicate users found for this email.'
              }));

            }

            if (!user || user.StatusCode !== 200 || users.length === 0) {
              const errorObj = getError('ORB-AUTH-003');
              return of(UserActions.verifyEmailFailure({
                error: errorObj ? errorObj.message : 'Email verification failed'
              }));
            }

            // Now verify the email with the userId
            return from(this.userService.emailVerify(code, email)).pipe(
              map(response => {
                if (response.StatusCode === 200) {
                  return UserActions.verifyEmailSuccess({ email });
                }
                const errorObj = getError('ORB-AUTH-003');
                return UserActions.verifyEmailFailure({
                  error: errorObj ? errorObj.message : 'Email verification failed'
                });
              }),
              catchError(error => {
                const errorObj = getError('ORB-AUTH-003');
                return of(UserActions.verifyEmailFailure({
                  error: errorObj ? errorObj.message : 'Email verification failed'
                }));
              })
            );
          }),
          catchError(error => {
            const errorObj = getError('ORB-AUTH-003');
            return of(UserActions.verifyEmailFailure({
              error: errorObj ? errorObj.message : 'Email verification failed'
            }));
          })
        );
      })
    )
  );

  // Update user record after successful email verification
  updateUserAfterEmailVerification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.verifyEmailSuccess),
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      switchMap(([action, currentUser]) => {
        const email = (action as any).email;
        
        if (!email || !currentUser) {
          return of(UserActions.updateUserAfterEmailVerificationFailure({ 
            error: 'Missing email or user data'
          }));
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
          updatedAt: new Date().toISOString(),
          phoneNumber: currentUser.phoneNumber,
          phoneVerified: currentUser.phoneVerified,
          emailVerified: true,
          groups: currentUser.groups,
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

            return UserActions.updateUserAfterEmailVerificationSuccess({ user: updatedUser });
          }),
          catchError(error => {
            console.error('Failed to update user after email verification:', error);
            return of(UserActions.updateUserAfterEmailVerificationFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

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
          catchError(error => {
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
          catchError(error => {
            console.error('[Effect][checkMFAStatus$] Error:', error);
            return of(UserActions.checkMFAStatusFailure({
              error: error instanceof Error ? error.message : 'Failed to check MFA status'
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
      switchMap(([action, currentUser]) => {
        const { mfaEnabled, mfaSetupComplete } = action;
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
          updatedAt: new Date().toISOString(),
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
          catchError(error => {
            console.error('[Effect][autoUpdateMFAStatus$] Failed to auto-update MFA status:', error);
            return of(UserActions.updateUserAfterMFASetupFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
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
      switchMap(([action, existingMfaDetails]) => {
        
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
          catchError(error => {
            console.error('[Effect][setupMFA$] MFA setup error:', error);
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
      switchMap(([action, currentUser]) => {
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
          updatedAt: new Date().toISOString(),
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
          catchError(error => {
            console.error('Failed to update user after MFA setup:', error);
            return of(UserActions.updateUserAfterMFASetupFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
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
            const errorObj = getError('ORB-AUTH-003');
            return UserActions.needsMFAFailure({
              error: errorObj ? errorObj.message : 'Email verification failed'
            });
          }),
          catchError(error => {
            const errorObj = getError('ORB-AUTH-003');
            return of(UserActions.needsMFAFailure({
              error: errorObj ? errorObj.message : 'Email verification failed'
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
      withLatestFrom(this.store.select(fromUser.selectCurrentUser)),
      map(([, currentUser]) => {
        if (!currentUser) {
          console.error('[AuthEffects] MFA success but no current user available');
          return UserActions.needsMFAFailure({ error: 'User data not available' });
        }
        
        console.log('[AuthEffects] MFA verification successful, completing auth flow for user:', currentUser.email);
        return UserActions.authFlowComplete({ user: currentUser });
      })
    )
  );

  // Add signIn effect - this was missing!
  signIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.signIn),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn(email, password)).pipe(
          map(response => {
            if (response.StatusCode === 200 && response.Data?.isSignedIn) {
              return UserActions.signInSuccess({ 
                user: response.Data.user, 
                message: response.Message || 'Sign in successful' 
              });
            }
            const errorObj = getError('ORB-AUTH-002');
            return UserActions.signInFailure({
              error: response.Message || (errorObj ? errorObj.message : 'Sign in failed')
            });
          }),
          catchError(error => {
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
          catchError(error => {
            console.error('Error during signout:', error);
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
            catchError(error => of(UserActions.checkPhoneRequiredFailure({ 
              error: error instanceof Error ? error.message : 'Failed to check phone requirement'
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
          catchError(error => of(UserActions.setupPhoneFailure({ 
            error: error instanceof Error ? error.message : 'Failed to set up phone verification'
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
          catchError(error => of(UserActions.verifyPhoneFailure({ 
            error: error instanceof Error ? error.message : 'Failed to verify phone code'
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
      switchMap(([action, phoneNumber, currentUser]) => {
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
          updatedAt: new Date().toISOString(),
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
          catchError(error => {
            console.error('Failed to update user after phone verification:', error);
            return of(UserActions.updateUserAfterPhoneVerificationFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
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
            
            if (!cognitoProfile?.email) {
              throw new Error('No email found in Cognito profile');
            }
            
            // Get user data from our backend using the email from Cognito
            return from(this.userService.userExists({ email: cognitoProfile.email })).pipe(
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
                  userId: cognitoProfile.sub || '', // Cognito user ID as fallback
                  cognitoSub: cognitoProfile.sub || '',
                  email: cognitoProfile.email,
                  firstName: cognitoProfile.given_name || '',
                  lastName: cognitoProfile.family_name || '',
                  emailVerified: cognitoProfile.email_verified === 'true',
                  groups: cognitoProfile['cognito:groups'] || []
                });
                
                return UserActions.refreshSessionSuccess({ user: fallbackUser });
              }),
              catchError(backendError => {
                // Backend call failed completely (network error, etc.)
                // Continue with Cognito profile data
                
                const fallbackUser = new Users({
                  userId: cognitoProfile.sub || '',
                  cognitoSub: cognitoProfile.sub || '',
                  email: cognitoProfile.email,
                  firstName: cognitoProfile.given_name || '',
                  lastName: cognitoProfile.family_name || '',
                  emailVerified: cognitoProfile.email_verified === 'true',
                  groups: cognitoProfile['cognito:groups'] || []
                });
                
                return of(UserActions.refreshSessionSuccess({ user: fallbackUser }));
              })
            );
          }),
          catchError(error => {
            console.error('Effect [RefreshSession]: Critical error (Cognito profile failed)', error);
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
      map(([action, user]) => {
        
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
      map(({ user }) => {
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
      switchMap(([action, user]) => {
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
          catchError(error => {
            console.error('[Auth Effect] MFA check failed:', error);
            return of(UserActions.checkMFASetupFailure({ 
              error: error instanceof Error ? error.message : 'Failed to check MFA setup'
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
    private router: Router
  ) {}
}
