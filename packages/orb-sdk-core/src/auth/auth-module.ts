/**
 * Authentication module for the Orb SDK.
 *
 * Handles all authentication flows including sign up, sign in, MFA,
 * and verification.
 *
 * @module auth/auth-module
 */

import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ResendConfirmationCodeCommand,
  InitiateAuthCommand,
  RespondToAuthChallengeCommand,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  type ChallengeNameType,
} from '@aws-sdk/client-cognito-identity-provider';
import { jwtDecode } from 'jwt-decode';

import type {
  SignUpParams,
  SignUpResult,
  SignInParams,
  SignInResult,
  MFASetupResult,
  AuthTokens,
  User,
} from './types';
import type { TokenManager } from './token-manager';
import type { EventEmitter } from '../events/event-emitter';
import {
  AuthenticationError,
  ValidationError,
  ServiceUnavailableError,
  ErrorCode,
} from '../errors/errors';

/**
 * JWT payload with Cognito claims.
 */
interface CognitoIdTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  phone_number?: string;
  phone_number_verified?: boolean;
  'cognito:groups'?: string[];
  [key: string]: unknown;
}

/**
 * Auth module configuration.
 */
export interface AuthModuleConfig {
  /** AWS region */
  region: string;
  /** Cognito User Pool ID */
  userPoolId: string;
  /** Cognito User Pool Client ID */
  userPoolClientId: string;
  /** Token manager instance */
  tokenManager: TokenManager;
  /** Event emitter instance */
  eventEmitter: EventEmitter;
}

/**
 * Authentication module for handling all auth flows.
 *
 * @example
 * ```typescript
 * const auth = new AuthModule({
 *   region: 'us-east-1',
 *   userPoolId: 'us-east-1_xxxxxxxx',
 *   userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
 *   tokenManager,
 *   eventEmitter,
 * });
 *
 * // Sign up
 * await auth.signUp({ email: 'user@example.com', password: 'Password123!' });
 *
 * // Confirm sign up
 * await auth.confirmSignUp('user@example.com', '123456');
 *
 * // Sign in
 * const result = await auth.signIn({ email: 'user@example.com', password: 'Password123!' });
 * ```
 */
export class AuthModule {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;
  private readonly userPoolClientId: string;
  private readonly tokenManager: TokenManager;
  private readonly eventEmitter: EventEmitter;

  constructor(config: AuthModuleConfig) {
    this.client = new CognitoIdentityProviderClient({ region: config.region });
    this.userPoolId = config.userPoolId;
    this.userPoolClientId = config.userPoolClientId;
    this.tokenManager = config.tokenManager;
    this.eventEmitter = config.eventEmitter;
  }

  /**
   * Sign up a new user.
   *
   * @param params - Sign up parameters
   * @returns Sign up result
   * @throws {ValidationError} If email or password is invalid
   * @throws {AuthenticationError} If email already exists
   */
  async signUp(params: SignUpParams): Promise<SignUpResult> {
    this.validateEmail(params.email);
    this.validatePassword(params.password);

    try {
      const command = new SignUpCommand({
        ClientId: this.userPoolClientId,
        Username: params.email,
        Password: params.password,
        UserAttributes: [
          { Name: 'email', Value: params.email },
          ...Object.entries(params.attributes ?? {}).map(([key, value]) => ({
            Name: key,
            Value: value,
          })),
        ],
      });

      const response = await this.client.send(command);

      return {
        userConfirmed: response.UserConfirmed ?? false,
        codeDeliveryDetails: response.CodeDeliveryDetails !== undefined
          ? {
              destination: response.CodeDeliveryDetails.Destination ?? '',
              deliveryMedium:
                (response.CodeDeliveryDetails.DeliveryMedium as 'EMAIL' | 'SMS') ?? 'EMAIL',
              attributeName: response.CodeDeliveryDetails.AttributeName ?? 'email',
            }
          : undefined,
        userSub: response.UserSub ?? '',
      };
    } catch (error) {
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Confirm sign up with verification code.
   *
   * @param email - User's email
   * @param code - Verification code
   * @throws {AuthenticationError} If code is invalid or expired
   */
  async confirmSignUp(email: string, code: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.userPoolClientId,
        Username: email,
        ConfirmationCode: code,
      });

      await this.client.send(command);
    } catch (error) {
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Resend confirmation code.
   *
   * @param email - User's email
   * @throws {AuthenticationError} If rate limit exceeded
   */
  async resendConfirmationCode(email: string): Promise<void> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.userPoolClientId,
        Username: email,
      });

      await this.client.send(command);
    } catch (error) {
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Sign in a user.
   *
   * @param params - Sign in parameters
   * @returns Sign in result (may include challenge)
   * @throws {AuthenticationError} If credentials are invalid
   */
  async signIn(params: SignInParams): Promise<SignInResult> {
    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: this.userPoolClientId,
        AuthParameters: {
          USERNAME: params.email,
          PASSWORD: params.password,
        },
      });

      const response = await this.client.send(command);

      // Check for challenges
      if (response.ChallengeName !== undefined) {
        return this.handleChallenge(response.ChallengeName, response.Session);
      }

      // Authentication complete
      if (response.AuthenticationResult !== undefined) {
        const tokens = this.extractTokens(response.AuthenticationResult);
        await this.tokenManager.storeTokens(tokens);

        const user = this.extractUserFromToken(tokens.idToken);
        this.eventEmitter.emit('signIn', { user, tokens });
        this.eventEmitter.emit('authStateChange', {
          status: 'authenticated',
          user,
          tokens,
        });

        return {
          isSignedIn: true,
          tokens,
        };
      }

      throw new AuthenticationError(
        'Unexpected authentication response',
        ErrorCode.INVALID_CREDENTIALS
      );
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Verify MFA code.
   *
   * @param code - TOTP code
   * @param session - Challenge session
   * @returns Authentication tokens
   * @throws {AuthenticationError} If code is invalid
   */
  async verifyMFA(code: string, session: string): Promise<AuthTokens> {
    try {
      const command = new RespondToAuthChallengeCommand({
        ClientId: this.userPoolClientId,
        ChallengeName: 'SOFTWARE_TOKEN_MFA',
        Session: session,
        ChallengeResponses: {
          SOFTWARE_TOKEN_MFA_CODE: code,
          USERNAME: '', // Will be filled from session
        },
      });

      const response = await this.client.send(command);

      if (response.AuthenticationResult === undefined) {
        throw new AuthenticationError(
          'MFA verification failed',
          ErrorCode.INVALID_MFA_CODE
        );
      }

      const tokens = this.extractTokens(response.AuthenticationResult);
      await this.tokenManager.storeTokens(tokens);

      const user = this.extractUserFromToken(tokens.idToken);
      this.eventEmitter.emit('signIn', { user, tokens });
      this.eventEmitter.emit('authStateChange', {
        status: 'authenticated',
        user,
        tokens,
      });

      return tokens;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Set up MFA for the current user.
   *
   * @returns MFA setup details
   */
  async setupMFA(): Promise<MFASetupResult> {
    const tokens = await this.tokenManager.getTokens();
    if (tokens === null) {
      throw new AuthenticationError(
        'Not authenticated',
        ErrorCode.SESSION_EXPIRED
      );
    }

    try {
      const command = new AssociateSoftwareTokenCommand({
        AccessToken: tokens.accessToken,
      });

      const response = await this.client.send(command);

      if (response.SecretCode === undefined) {
        throw new AuthenticationError(
          'Failed to get MFA secret',
          ErrorCode.MFA_SETUP_REQUIRED
        );
      }

      // Generate QR code URI
      const user = this.extractUserFromToken(tokens.idToken);
      const qrCodeUri = `otpauth://totp/Orb:${user.email}?secret=${response.SecretCode}&issuer=Orb`;

      return {
        secretCode: response.SecretCode,
        qrCodeUri,
        session: response.Session ?? '',
      };
    } catch (error) {
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Confirm MFA setup with initial code.
   *
   * @param code - TOTP code
   */
  async confirmMFASetup(code: string): Promise<void> {
    const tokens = await this.tokenManager.getTokens();
    if (tokens === null) {
      throw new AuthenticationError(
        'Not authenticated',
        ErrorCode.SESSION_EXPIRED
      );
    }

    try {
      const command = new VerifySoftwareTokenCommand({
        AccessToken: tokens.accessToken,
        UserCode: code,
      });

      await this.client.send(command);
    } catch (error) {
      throw this.mapCognitoError(error);
    }
  }

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    const tokens = await this.tokenManager.getTokens();

    if (tokens !== null) {
      try {
        const command = new GlobalSignOutCommand({
          AccessToken: tokens.accessToken,
        });
        await this.client.send(command);
      } catch {
        // Ignore errors during sign out
      }
    }

    await this.tokenManager.clearTokens();
    this.eventEmitter.emit('signOut', {});
    this.eventEmitter.emit('authStateChange', { status: 'unauthenticated' });
  }

  /**
   * Get the current authenticated user.
   *
   * @returns Current user or null if not authenticated
   */
  async getCurrentUser(): Promise<User | null> {
    const tokens = await this.tokenManager.getTokens();
    if (tokens === null) {
      return null;
    }

    try {
      return this.extractUserFromToken(tokens.idToken);
    } catch {
      return null;
    }
  }

  /**
   * Handle authentication challenge.
   */
  private handleChallenge(
    challengeName: ChallengeNameType,
    session?: string
  ): SignInResult {
    switch (challengeName) {
      case 'SOFTWARE_TOKEN_MFA':
        return {
          isSignedIn: false,
          challengeName: 'MFA_REQUIRED',
          session,
        };
      case 'MFA_SETUP':
        return {
          isSignedIn: false,
          challengeName: 'MFA_SETUP',
          session,
        };
      case 'NEW_PASSWORD_REQUIRED':
        return {
          isSignedIn: false,
          challengeName: 'NEW_PASSWORD_REQUIRED',
          session,
        };
      default:
        return {
          isSignedIn: false,
          challengeName: 'CUSTOM_CHALLENGE',
          session,
        };
    }
  }

  /**
   * Extract tokens from Cognito response.
   */
  private extractTokens(result: {
    AccessToken?: string;
    IdToken?: string;
    RefreshToken?: string;
    ExpiresIn?: number;
    TokenType?: string;
  }): AuthTokens {
    if (
      result.AccessToken === undefined ||
      result.IdToken === undefined ||
      result.RefreshToken === undefined
    ) {
      throw new AuthenticationError(
        'Invalid authentication response',
        ErrorCode.INVALID_CREDENTIALS
      );
    }

    return {
      accessToken: result.AccessToken,
      idToken: result.IdToken,
      refreshToken: result.RefreshToken,
      expiresIn: result.ExpiresIn ?? 3600,
      tokenType: 'Bearer',
    };
  }

  /**
   * Extract user information from ID token.
   */
  private extractUserFromToken(idToken: string): User {
    const decoded = jwtDecode<CognitoIdTokenPayload>(idToken);

    return {
      userId: decoded.sub,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      phoneNumber: decoded.phone_number,
      phoneVerified: decoded.phone_number_verified,
      groups: decoded['cognito:groups'] ?? [],
    };
  }

  /**
   * Validate email format.
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError(
        'Invalid email format',
        ErrorCode.INVALID_EMAIL_FORMAT,
        { field: 'email' }
      );
    }
  }

  /**
   * Validate password requirements.
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new ValidationError(
        'Password must be at least 8 characters',
        ErrorCode.PASSWORD_TOO_WEAK,
        { field: 'password' }
      );
    }
  }

  /**
   * Map Cognito errors to SDK errors.
   */
  private mapCognitoError(error: unknown): Error {
    if (error instanceof Error) {
      const name = error.name;

      switch (name) {
        case 'UsernameExistsException':
          return new AuthenticationError(
            'An account with this email already exists',
            ErrorCode.EMAIL_ALREADY_EXISTS,
            { recoverable: true, suggestion: 'Try signing in instead.' }
          );
        case 'UserNotFoundException':
          return new AuthenticationError(
            'Invalid credentials',
            ErrorCode.INVALID_CREDENTIALS,
            { recoverable: true }
          );
        case 'NotAuthorizedException':
          return new AuthenticationError(
            'Invalid credentials',
            ErrorCode.INVALID_CREDENTIALS,
            { recoverable: true }
          );
        case 'UserNotConfirmedException':
          return new AuthenticationError(
            'Please verify your email before signing in',
            ErrorCode.USER_NOT_CONFIRMED,
            { recoverable: true, suggestion: 'Check your email for a verification code.' }
          );
        case 'CodeMismatchException':
          return new AuthenticationError(
            'Invalid verification code',
            ErrorCode.INVALID_VERIFICATION_CODE,
            { recoverable: true }
          );
        case 'ExpiredCodeException':
          return new AuthenticationError(
            'Verification code has expired',
            ErrorCode.CODE_EXPIRED,
            { recoverable: true, suggestion: 'Request a new verification code.' }
          );
        case 'LimitExceededException':
        case 'TooManyRequestsException':
          return new AuthenticationError(
            'Too many requests. Please try again later.',
            ErrorCode.RATE_LIMIT_EXCEEDED,
            { recoverable: true }
          );
        case 'ServiceUnavailable':
          return new ServiceUnavailableError();
        default:
          return new AuthenticationError(
            error.message,
            ErrorCode.INVALID_CREDENTIALS,
            { cause: error }
          );
      }
    }

    return new AuthenticationError(
      'An unexpected error occurred',
      ErrorCode.INVALID_CREDENTIALS
    );
  }
}
