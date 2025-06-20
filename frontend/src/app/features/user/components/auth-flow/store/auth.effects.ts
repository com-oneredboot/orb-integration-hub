// file: frontend/src/app/features/user/components/auth-flow/store/auth.effects.ts
// author: Corey Dale Peters
// date: 2024-12-20
// description: Contains all GraphQL queries and mutations for the User service

// 3rd Party Imports
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, filter, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { from, of, EMPTY } from "rxjs";
import { Store } from '@ngrx/store';

// Application Imports
import { UserService } from "../../../../../core/services/user.service";
import { UsersQueryByEmail } from "../../../../../core/graphql/Users.graphql";
import { AuthActions } from "./auth.actions";
import * as fromAuth from "./auth.selectors";
import { AuthSteps } from "./auth.state";
import { CognitoService } from "../../../../../core/services/cognito.service";
import { getError } from "../../../../../core/models/ErrorRegistryModel";
import { UsersQueryByEmailInput, UsersResponse, UsersListResponse, Users } from "../../../../../core/models/UsersModel";

@Injectable()
export class AuthEffects {

  checkEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkEmail),
      tap(action => console.debug('Effect [CheckEmail]: Starting', action)),
      switchMap(({ email }) => {
        console.debug('Effect [CheckEmail]: Making service call');
        const userInput: UsersQueryByEmailInput = { email: email };
        
        return from(this.userService.userExists(userInput)).pipe(
          tap(result => console.debug('Effect [CheckEmail]: Service returned', result)),
          map((result: UsersListResponse) => {
            const users = result.Data || [];
            if (result.StatusCode === 500 && users.length > 1) {
              // Duplicate user error
              console.error('Effect [CheckEmail]: Duplicate users found for email:', email, users);
              const errorObj = getError('ORB-AUTH-006'); // Use a suitable error code
              return AuthActions.checkEmailFailure({
                error: errorObj ? errorObj.message : 'Duplicate users found for this email.'
              });
            }
            if (result.StatusCode === 200 && users.length === 1) {
              // User exists
              return AuthActions.checkEmailSuccess({ userExists: true });
            }
            if (result.StatusCode === 200 && users.length === 0) {
              // User not found
              return AuthActions.checkEmailUserNotFound();
            }
            // Any other statusCode is an error
            const errorObj = getError('ORB-AUTH-005');
            return AuthActions.checkEmailFailure({ error: errorObj ? errorObj.message : 'User email check failed' });
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
            return of(AuthActions.checkEmailFailure({
              error: errorObj ? errorObj.message : 'Unexpected error'
            }));
          }),
          tap(resultAction => console.debug('Effect [CheckEmail]: Emitting action', resultAction))
        );
      }),
      catchError(error => {
        console.error('Effect [CheckEmail]: Outer error caught', error);
        const errorObj = getError('ORB-SYS-001');
        return of(AuthActions.checkEmailFailure({
          error: errorObj ? errorObj.message : 'Unexpected error'
        }));
      })
    )
  );

  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.createUser),
      switchMap(({ input, password }) => {
        // create the user
        return from(this.userService.userCreate(input, password)).pipe(
          map(response => {
            if (response.StatusCode === 200) {
              return AuthActions.createUserSuccess();
            }
            if (response.StatusCode === 401) {
              // Unauthorized: surface the error, do not dispatch createUserSuccess
              const errorObj = getError('ORB-API-002');
              return AuthActions.createUserFailure({
                error: response.Message || (errorObj ? errorObj.message : 'Unauthorized')
              });
            }
            const errorObj = getError('ORB-API-002');
            return AuthActions.createUserFailure({
              error: errorObj ? errorObj.message : 'GraphQL mutation error'
            });
          }),
          catchError(error => {
            const errorObj = getError('ORB-API-002');
            return of(AuthActions.createUserFailure({
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
      ofType(AuthActions.checkEmailVerificationStatus),
      tap(({ email }) => console.debug('[Effect][checkEmailVerificationStatus$] Start', { email })),
      switchMap(({ email }) => {
        return from(this.userService.checkCognitoEmailVerification(email)).pipe(
          map(isVerified => {
            console.debug('[Effect][checkEmailVerificationStatus$] Cognito verification status:', isVerified);
            return AuthActions.checkEmailVerificationStatusSuccess({ isVerified, email });
          }),
          catchError(error => {
            console.error('[Effect][checkEmailVerificationStatus$] Error:', error);
            return of(AuthActions.checkEmailVerificationStatusFailure({
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
      ofType(AuthActions.checkEmailVerificationStatusSuccess),
      filter((action): action is ReturnType<typeof AuthActions.checkEmailVerificationStatusSuccess> => action.isVerified), // Only proceed if email is verified in Cognito
      withLatestFrom(this.store.select(fromAuth.selectCurrentUser)),
      switchMap(([action, currentUser]) => {
        const { email } = action;
        if (!currentUser || currentUser.emailVerified) {
          // Skip if no user or already verified in our DB
          return EMPTY;
        }

        console.debug('[Effect][autoUpdateEmailVerification$] Auto-updating email verification for user:', currentUser.userId);
        
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
            console.debug('[Effect][autoUpdateEmailVerification$] User update response:', response);
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }
            return AuthActions.updateUserAfterEmailVerificationSuccess({ user: updatedUser });
          }),
          catchError(error => {
            console.error('[Effect][autoUpdateEmailVerification$] Failed to auto-update email verification:', error);
            return of(AuthActions.updateUserAfterEmailVerificationFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  verifyEmail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyEmail),
      tap(({ code, email }) => console.debug('[Effect][verifyEmail$] Start', { code, email })),
      switchMap(({ code, email }) => {

        return from(this.userService.userExists({ email })).pipe(
          tap(user => console.debug('[Effect][verifyEmail$] userExists result', user)),
          switchMap(user => {
            const users = Array.isArray(user.Data) ? user.Data : [];
            if (user.StatusCode === 500 && users.length > 1) {

              // Duplicate user error
              console.error('[Effect][verifyEmail$] Duplicate users found for email:', email, users);
              const errorObj = getError('ORB-AUTH-006');
              return of(AuthActions.verifyEmailFailure({
                error: errorObj ? errorObj.message : 'Duplicate users found for this email.'
              }));

            }

            if (!user || user.StatusCode !== 200 || users.length === 0) {
              const errorObj = getError('ORB-AUTH-003');
              console.error('[Effect][verifyEmail$] User not found or error', user);
              return of(AuthActions.verifyEmailFailure({
                error: errorObj ? errorObj.message : 'Email verification failed'
              }));
            }

            // Now verify the email with the userId
            return from(this.userService.emailVerify(code, email)).pipe(
              tap(response => console.debug('[Effect][verifyEmail$] emailVerify response', response)),
              map(response => {
                if (response.StatusCode === 200) {
                  return AuthActions.verifyEmailSuccess({ email });
                }
                const errorObj = getError('ORB-AUTH-003');
                console.error('[Effect][verifyEmail$] emailVerify failed', response);
                return AuthActions.verifyEmailFailure({
                  error: errorObj ? errorObj.message : 'Email verification failed'
                });
              }),
              catchError(error => {
                console.error('[Effect][verifyEmail$] emailVerify threw error', error);
                const errorObj = getError('ORB-AUTH-003');
                return of(AuthActions.verifyEmailFailure({
                  error: errorObj ? errorObj.message : 'Email verification failed'
                }));
              })
            );
          }),
          catchError(error => {
            console.error('[Effect][verifyEmail$] userExists threw error', error);
            const errorObj = getError('ORB-AUTH-003');
            return of(AuthActions.verifyEmailFailure({
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
      ofType(AuthActions.verifyEmailSuccess),
      withLatestFrom(this.store.select(fromAuth.selectCurrentUser)),
      switchMap(([action, currentUser]) => {
        const email = (action as any).email;
        
        if (!email || !currentUser) {
          return of(AuthActions.updateUserAfterEmailVerificationFailure({ 
            error: 'Missing email or user data'
          }));
        }

        console.debug('Effect: Updating user after email verification', { email, currentUser });
        
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
            console.debug('User update response after email verification:', response);
            
            // Extract the updated user from the response
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }

            return AuthActions.updateUserAfterEmailVerificationSuccess({ user: updatedUser });
          }),
          catchError(error => {
            console.error('Failed to update user after email verification:', error);
            return of(AuthActions.updateUserAfterEmailVerificationFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  verifyCognitoPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyCognitoPassword),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn( email, password )).pipe(
          map(response => {

            console.debug('verifyCognitoPassword response:', response);

            // error state
            if (response.StatusCode !== 200) {
              const errorObj = getError('ORB-AUTH-002');
              return AuthActions.verifyCognitoPasswordFailure({
                error: errorObj ? errorObj.message : 'Invalid credentials'
              });
            }

            return AuthActions.verifyCognitoPasswordSuccess({
              needsMFA: response.Data?.needsMFA,
              needsMFASetup: response.Data?.needsMFASetup,
              message: 'Successfully verified email and password',
              mfaSetupDetails: response.Data?.mfaSetupDetails
            });

          }),
          catchError(error => {
            const errorObj = getError('ORB-AUTH-002');
            return of(AuthActions.verifyCognitoPasswordFailure({
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
      ofType(AuthActions.verifyCognitoPasswordSuccess),
      withLatestFrom(this.store.select(fromAuth.selectCurrentEmail)),
      switchMap(([{ needsMFA, needsMFASetup }, email]) => {
        // Only auto-trigger signIn if no MFA is required
        if (!needsMFA && !needsMFASetup && email) {
          console.debug('Auto-triggering signIn after password verification');
          return of(AuthActions.signIn({ 
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
      ofType(AuthActions.checkMFAStatus),
      tap(() => console.debug('[Effect][checkMFAStatus$] Start')),
      switchMap(() => {
        return from(this.userService.checkCognitoMFAStatus()).pipe(
          map(({ mfaEnabled, mfaSetupComplete }) => {
            console.debug('[Effect][checkMFAStatus$] Cognito MFA status:', { mfaEnabled, mfaSetupComplete });
            return AuthActions.checkMFAStatusSuccess({ mfaEnabled, mfaSetupComplete });
          }),
          catchError(error => {
            console.error('[Effect][checkMFAStatus$] Error:', error);
            return of(AuthActions.checkMFAStatusFailure({
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
      ofType(AuthActions.checkMFAStatusSuccess),
      filter((action): action is ReturnType<typeof AuthActions.checkMFAStatusSuccess> => action.mfaEnabled && action.mfaSetupComplete), // Only proceed if MFA is enabled and setup
      withLatestFrom(this.store.select(fromAuth.selectCurrentUser)),
      switchMap(([action, currentUser]) => {
        const { mfaEnabled, mfaSetupComplete } = action;
        if (!currentUser || (currentUser.mfaEnabled && currentUser.mfaSetupComplete)) {
          // Skip if no user or already enabled in our DB
          return EMPTY;
        }

        console.debug('[Effect][autoUpdateMFAStatus$] Auto-updating MFA status for user:', currentUser.userId);
        
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
            console.debug('[Effect][autoUpdateMFAStatus$] User update response:', response);
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }
            return AuthActions.updateUserAfterMFASetupSuccess({ user: updatedUser });
          }),
          catchError(error => {
            console.error('[Effect][autoUpdateMFAStatus$] Failed to auto-update MFA status:', error);
            return of(AuthActions.updateUserAfterMFASetupFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  setupMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.needsMFASetup),
      switchMap(() =>
        from(this.userService.mfaSetup()).pipe(
          map(response => {
            if (response.StatusCode === 200) {
              return AuthActions.needsMFASetupSuccess();
            }
            const errorObj = getError('ORB-AUTH-003');
            return AuthActions.needsMFASetupFailure({
              error: errorObj ? errorObj.message : 'MFA setup failed'
            });
          }),
          catchError(error => {
            const errorObj = getError('ORB-AUTH-003');
            return of(AuthActions.needsMFASetupFailure({
              error: errorObj ? errorObj.message : 'MFA setup failed'
            }));
          })
        )
      )
    )
  );

  // Update user record after successful MFA setup
  updateUserAfterMFASetup$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.needsMFASetupSuccess),
      withLatestFrom(this.store.select(fromAuth.selectCurrentUser)),
      switchMap(([action, currentUser]) => {
        if (!currentUser) {
          return of(AuthActions.updateUserAfterMFASetupFailure({ 
            error: 'Missing user data'
          }));
        }

        console.debug('Effect: Updating user after MFA setup', { currentUser });
        
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
            console.debug('User update response after MFA setup:', response);
            
            // Extract the updated user from the response
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }

            return AuthActions.updateUserAfterMFASetupSuccess({ user: updatedUser });
          }),
          catchError(error => {
            console.error('Failed to update user after MFA setup:', error);
            return of(AuthActions.updateUserAfterMFASetupFailure({ 
              error: error instanceof Error ? error.message : 'Failed to update user record'
            }));
          })
        );
      })
    )
  );

  verifyMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.needsMFA),
      switchMap(({ code }) =>
        from(this.userService.mfaVerify(code)).pipe(
          map(response => {
            if (response.StatusCode === 200) {
              return AuthActions.needsMFASuccess();
            }
            const errorObj = getError('ORB-AUTH-003');
            return AuthActions.needsMFAFailure({
              error: errorObj ? errorObj.message : 'Email verification failed'
            });
          }),
          catchError(error => {
            const errorObj = getError('ORB-AUTH-003');
            return of(AuthActions.needsMFAFailure({
              error: errorObj ? errorObj.message : 'Email verification failed'
            }));
          })
        )
      )
    )
  );

  // Auto-trigger signIn after successful MFA verification to load user data into store
  autoSignInAfterMFA$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.needsMFASuccess),
      withLatestFrom(this.store.select(fromAuth.selectCurrentEmail)),
      switchMap(([, email]) => {
        if (email) {
          console.debug('Auto-triggering signIn after MFA verification to load user data');
          return of(AuthActions.signIn({ 
            email, 
            password: '' // Password already verified, we just need to complete the sign-in and load user data
          }));
        }
        return EMPTY; // No action needed if no email available
      })
    )
  );

  // Add signIn effect - this was missing!
  signIn$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signIn),
      tap(action => console.debug('Effect [SignIn]: Starting', action)),
      switchMap(({ email, password }) =>
        from(this.userService.userSignIn(email, password)).pipe(
          tap(response => console.debug('Effect [SignIn]: Response', response)),
          map(response => {
            if (response.StatusCode === 200 && response.Data?.isSignedIn) {
              console.debug('Effect [SignIn]: Success - dispatching signInSuccess');
              return AuthActions.signInSuccess({ 
                user: response.Data.user, 
                message: response.Message || 'Sign in successful' 
              });
            }
            console.error('Effect [SignIn]: Failed', response);
            const errorObj = getError('ORB-AUTH-002');
            return AuthActions.signInFailure({
              error: response.Message || (errorObj ? errorObj.message : 'Sign in failed')
            });
          }),
          catchError(error => {
            console.error('Effect [SignIn]: Error caught', error);
            const errorObj = getError('ORB-AUTH-002');
            return of(AuthActions.signInFailure({
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
      ofType(AuthActions.signout),
      switchMap(() => {
        // Then attempt to sign out from Cognito service
        return from(this.cognitoService.signOut()).pipe(
          map(() => {
            console.debug('Signout successful, returning success action');
            return AuthActions.signoutSuccess();
          }),
          catchError(error => {
            console.error('Error during signout:', error);
            // Even on error, we return success to ensure state is reset
            return of(AuthActions.signoutSuccess());
          })
        );
      })
    )
  );

  // Navigate to signin page after successful signout
  signoutNavigation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.signoutSuccess),
      tap(() => {
        console.debug('Signout success - navigating to authenticate page');
        this.router.navigate(['/authenticate']);
      })
    ),
    { dispatch: false }
  );

  // Check phone required
  checkPhoneRequired$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkPhoneRequired),
      tap(() => console.debug('Effect: Checking if phone setup is required')),
      switchMap(() => {
        return of(AuthActions.checkPhoneRequiredSuccess({ required: true }))
          .pipe(
            catchError(error => of(AuthActions.checkPhoneRequiredFailure({ 
              error: error instanceof Error ? error.message : 'Failed to check phone requirement'
            })))
          );
      })
    )
  );
  
  // Setup phone number
  setupPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.setupPhone),
      tap(action => console.debug('Effect: Setting up phone', action)),
      switchMap(({ phoneNumber }) => {
        return from(this.userService.sendSMSVerificationCode(phoneNumber)).pipe(
          map(response => {
            if (response.statusCode === 200) {
              return AuthActions.setupPhoneSuccess({ 
                validationId: phoneNumber,
                expiresAt: Date.now() + 10 * 60 * 1000
              });
            }
            return AuthActions.setupPhoneFailure({
              error: response.message || 'Failed to send verification code'
            });
          }),
          catchError(error => of(AuthActions.setupPhoneFailure({ 
            error: error instanceof Error ? error.message : 'Failed to set up phone verification'
          })))
        );
      })
    )
  );
  
  // Verify phone number
  verifyPhone$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyPhone),
      tap(action => console.debug('Effect: Verifying phone code', action)),
      withLatestFrom(this.store.select(fromAuth.selectPhoneValidationId)),
      switchMap(([{ code }, phoneNumber]) => {
        if (!phoneNumber) {
          return of(AuthActions.verifyPhoneFailure({ 
            error: 'No phone number found for verification'
          }));
        }
        
        return from(this.userService.verifySMSCode(phoneNumber, code)).pipe(
          map(isValid => {
            console.debug('🔍 SMS verification result in effect:', isValid);
            if (isValid) {
              console.debug('🔍 Dispatching verifyPhoneSuccess');
              // First mark verification success, then trigger user update
              return AuthActions.verifyPhoneSuccess();
            }
            console.debug('🔍 Dispatching verifyPhoneFailure - invalid code');
            return AuthActions.verifyPhoneFailure({
              error: 'Invalid verification code'
            });
          }),
          catchError(error => of(AuthActions.verifyPhoneFailure({ 
            error: error instanceof Error ? error.message : 'Failed to verify phone code'
          })))
        );
      })
    )
  );

  // Update user record after successful phone verification
  updateUserAfterPhoneVerification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.verifyPhoneSuccess),
      withLatestFrom(
        this.store.select(fromAuth.selectPhoneValidationId),
        this.store.select(fromAuth.selectCurrentUser)
      ),
      switchMap(([action, phoneNumber, currentUser]) => {
        if (!phoneNumber || !currentUser) {
          return of(AuthActions.updateUserAfterPhoneVerificationFailure({ 
            error: 'Missing phone number or user data'
          }));
        }

        console.debug('Effect: Updating user after phone verification', { phoneNumber, currentUser });
        
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
            console.debug('User update response:', response);
            
            // Extract the updated user from the response
            const updatedUser = response.Data;
            if (!updatedUser) {
              throw new Error('User update succeeded but no user data returned');
            }

            return AuthActions.updateUserAfterPhoneVerificationSuccess({ user: updatedUser });
          }),
          catchError(error => {
            console.error('Failed to update user after phone verification:', error);
            return of(AuthActions.updateUserAfterPhoneVerificationFailure({ 
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
      ofType(AuthActions.refreshSession),
      tap(() => console.debug('Effect [RefreshSession]: Starting')),
      switchMap(() =>
        from(this.cognitoService.getCognitoProfile()).pipe(
          switchMap(cognitoProfile => {
            console.debug('Effect [RefreshSession]: Cognito profile', cognitoProfile);
            
            if (!cognitoProfile?.email) {
              throw new Error('No email found in Cognito profile');
            }
            
            // Get user data from our backend using the email from Cognito
            return from(this.userService.userExists({ email: cognitoProfile.email })).pipe(
              map(response => {
                console.debug('Effect [RefreshSession]: User lookup response', response);
                
                // Handle backend user lookup - be resilient to failures
                if (response.StatusCode === 200 && response.Data && response.Data.length === 1) {
                  // Ideal case: user found in backend
                  const user = new Users(response.Data[0]);
                  console.debug('Effect [RefreshSession]: User object created from backend', user);
                  return AuthActions.refreshSessionSuccess({ user });
                }
                
                if (response.StatusCode === 500 && response.Data && response.Data.length > 1) {
                  // Multiple users found - this is a critical error we can't recover from
                  throw new Error('Multiple users found for email');
                }
                
                // For any other case (user not found, 500 error, network issues, etc.)
                // Continue with Cognito profile data to maintain user session
                console.warn('Effect [RefreshSession]: Backend user lookup failed, continuing with Cognito profile only', {
                  statusCode: response.StatusCode,
                  dataLength: response.Data?.length,
                  email: cognitoProfile.email
                });
                
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
                
                console.debug('Effect [RefreshSession]: Created fallback user from Cognito profile', fallbackUser);
                return AuthActions.refreshSessionSuccess({ user: fallbackUser });
              }),
              catchError(backendError => {
                // Backend call failed completely (network error, etc.)
                // Continue with Cognito profile data
                console.warn('Effect [RefreshSession]: Backend user lookup threw error, continuing with Cognito profile only', backendError);
                
                const fallbackUser = new Users({
                  userId: cognitoProfile.sub || '',
                  cognitoSub: cognitoProfile.sub || '',
                  email: cognitoProfile.email,
                  firstName: cognitoProfile.given_name || '',
                  lastName: cognitoProfile.family_name || '',
                  emailVerified: cognitoProfile.email_verified === 'true',
                  groups: cognitoProfile['cognito:groups'] || []
                });
                
                console.debug('Effect [RefreshSession]: Created fallback user after backend error', fallbackUser);
                return of(AuthActions.refreshSessionSuccess({ user: fallbackUser }));
              })
            );
          }),
          catchError(error => {
            console.error('Effect [RefreshSession]: Critical error (Cognito profile failed)', error);
            const errorObj = getError('ORB-AUTH-001');
            return of(AuthActions.refreshSessionFailure({
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
      ofType(AuthActions.refreshSessionSuccess),
      withLatestFrom(this.store.select(fromAuth.selectCurrentStep)),
      filter(([, currentStep]) => {
        // Only run this logic if we're not in the middle of an auth flow
        // This prevents interference with active authentication steps
        const initialSteps = [AuthSteps.EMAIL, AuthSteps.PASSWORD, AuthSteps.SIGNIN, AuthSteps.COMPLETE];
        
        console.debug('[Effect][determineNextStepAfterRefresh$] Current step check:', currentStep, 'isInitialStep:', initialSteps.includes(currentStep));
        
        if (!initialSteps.includes(currentStep)) {
          console.debug('[Effect][determineNextStepAfterRefresh$] User is in auth flow, not interfering with step:', currentStep);
          return false;
        }
        return true;
      }),
      switchMap(([{ user }]) => {
        console.debug('[Effect][determineNextStepAfterRefresh$] Initial session load, determining correct step for user:', user);

        // Check email verification first
        if (!user.emailVerified) {
          console.debug('[Effect][determineNextStepAfterRefresh$] Email not verified, checking Cognito status');
          return of(AuthActions.checkEmailVerificationStatus({ email: user.email }));
        }

        // Check phone verification
        if (!user.phoneNumber || !user.phoneVerified) {
          console.debug('[Effect][determineNextStepAfterRefresh$] Phone not verified, setting up phone');
          return of(AuthActions.setCurrentStep({ step: AuthSteps.PHONE_SETUP }));
        }

        // Check MFA status - this is async, so we let the MFA effects handle the step setting
        if (!user.mfaEnabled || !user.mfaSetupComplete) {
          console.debug('[Effect][determineNextStepAfterRefresh$] MFA not complete in user record, checking actual Cognito MFA status - letting MFA effects handle step');
          return of(AuthActions.checkMFAStatus());
        }

        // All verifications complete - this should redirect to dashboard
        // But we'll let the component handle the redirect
        console.debug('🚨 [Effect][determineNextStepAfterRefresh$] All verifications complete - DISPATCHING setCurrentStep COMPLETE');
        return of(AuthActions.setCurrentStep({ step: AuthSteps.COMPLETE }));
      })
    )
  );

  // Handle email verification status check results
  handleEmailVerificationStatusCheck$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkEmailVerificationStatusSuccess),
      map(({ isVerified, email }) => {
        console.debug('[Effect][handleEmailVerificationStatusCheck$] Email verification status:', { isVerified, email });
        
        if (isVerified) {
          // Email is already verified in Cognito, auto-update user record
          console.debug('[Effect][handleEmailVerificationStatusCheck$] Email already verified, updating user');
          return AuthActions.updateUserAfterEmailVerification({ email });
        } else {
          // Email not verified, show verification step
          console.debug('[Effect][handleEmailVerificationStatusCheck$] Email not verified, showing verification step');
          return AuthActions.setCurrentStep({ step: AuthSteps.EMAIL_VERIFY });
        }
      })
    )
  );

  // Handle MFA status check results - COMPLETELY NEW VERSION
  handleMFAStatusCheck$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkMFAStatusSuccess),
      tap(() => console.log('🚀🚀🚀 BRAND NEW EFFECT RUNNING 🚀🚀🚀')),
      switchMap(({ mfaEnabled, mfaSetupComplete }) => {
        console.log('🚀 [BRAND NEW handleMFAStatusCheck$] MFA status received:', { mfaEnabled, mfaSetupComplete });
        
        if (!mfaEnabled || !mfaSetupComplete) {
          console.log('🚀 [BRAND NEW handleMFAStatusCheck$] MFA not setup - DISPATCHING setCurrentStep MFA_SETUP');
          return of(AuthActions.setCurrentStep({ step: AuthSteps.MFA_SETUP }));
        } else {
          console.log('🚀 [BRAND NEW handleMFAStatusCheck$] MFA already setup - proceeding to complete');
          return of(AuthActions.setCurrentStep({ step: AuthSteps.COMPLETE }));
        }
      })
    )
  );

  // Continue flow after email verification user update
  continueAfterEmailVerificationUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.updateUserAfterEmailVerificationSuccess),
      withLatestFrom(this.store.select(fromAuth.selectCurrentUser)),
      map(([action, user]) => {
        console.debug('[Effect][continueAfterEmailVerificationUpdate$] Email verification updated, continuing flow');
        
        if (!user) {
          console.warn('[Effect][continueAfterEmailVerificationUpdate$] No user found');
          return AuthActions.setCurrentStep({ step: AuthSteps.EMAIL });
        }

        // Check phone verification next
        if (!user.phoneNumber || !user.phoneVerified) {
          console.debug('[Effect][continueAfterEmailVerificationUpdate$] Phone not verified, setting up phone');
          return AuthActions.setCurrentStep({ step: AuthSteps.PHONE_SETUP });
        }

        // Check MFA status next
        if (!user.mfaEnabled || !user.mfaSetupComplete) {
          console.debug('[Effect][continueAfterEmailVerificationUpdate$] MFA not complete, checking MFA status');
          return AuthActions.checkMFAStatus();
        }

        // All complete
        console.debug('[Effect][continueAfterEmailVerificationUpdate$] All verifications complete');
        return AuthActions.setCurrentStep({ step: AuthSteps.COMPLETE });
      })
    )
  );

  // Continue flow after MFA setup user update
  continueAfterMFASetupUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.updateUserAfterMFASetupSuccess),
      map(() => {
        console.debug('[Effect][continueAfterMFASetupUpdate$] MFA setup updated, flow complete');
        return AuthActions.setCurrentStep({ step: AuthSteps.COMPLETE });
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

