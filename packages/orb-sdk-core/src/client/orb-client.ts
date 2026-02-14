/**
 * Main Orb SDK client.
 *
 * @module client/orb-client
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

import { AuthModule } from '../auth/auth-module';
import { TokenManager } from '../auth/token-manager';
import { LocalStorageTokenStorage, MemoryTokenStorage } from '../auth/token-storage';
import type { SignUpParams, SignUpResult, SignInParams, SignInResult, AuthTokens, User } from '../auth/types';
import { AuthorizationModule } from '../authorization/authorization-module';
import { EventEmitter } from '../events/event-emitter';
import type { AuthState, AuthStateCallback, Unsubscribe } from '../events/types';
import { ValidationError, ErrorCode } from '../errors/errors';

/**
 * Orb SDK client configuration.
 */
export interface OrbClientConfig {
  /** AWS region */
  region: string;
  /** Cognito User Pool ID */
  userPoolId: string;
  /** Cognito User Pool Client ID */
  userPoolClientId: string;
  /** AppSync GraphQL endpoint */
  apiEndpoint: string;
  /** Environment name */
  environment?: 'dev' | 'staging' | 'prod';
  /** Use in-memory storage instead of localStorage */
  useMemoryStorage?: boolean;
}

/**
 * Main entry point for the Orb SDK.
 *
 * Provides authentication, authorization, and API access to the
 * orb-integration-hub platform.
 *
 * @example
 * ```typescript
 * const client = new OrbClient({
 *   region: 'us-east-1',
 *   userPoolId: 'us-east-1_xxxxxxxx',
 *   userPoolClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
 *   apiEndpoint: 'https://xxxxxxxxxx.appsync-api.us-east-1.amazonaws.com/graphql',
 * });
 *
 * // Sign in
 * const result = await client.signIn('user@example.com', 'password');
 *
 * // Check permissions
 * const canRead = await client.authorization.hasPermission('read:users');
 *
 * // Subscribe to auth state changes
 * client.onAuthStateChange((state) => {
 *   if (state.status === 'authenticated') {
 *     console.log('User:', state.user);
 *   }
 * });
 * ```
 */
export class OrbClient {
  /** Authentication module */
  public readonly auth: AuthModule;

  /** Authorization module */
  public readonly authorization: AuthorizationModule;

  /** Token manager */
  public readonly tokenManager: TokenManager;

  private readonly config: OrbClientConfig;
  private readonly eventEmitter: EventEmitter;
  private readonly cognitoClient: CognitoIdentityProviderClient;

  constructor(config: OrbClientConfig) {
    this.validateConfig(config);
    this.config = config;

    // Initialize event emitter
    this.eventEmitter = new EventEmitter();

    // Initialize Cognito client
    this.cognitoClient = new CognitoIdentityProviderClient({
      region: config.region,
    });

    // Initialize token manager with appropriate storage
    const storage = config.useMemoryStorage === true
      ? new MemoryTokenStorage()
      : typeof localStorage !== 'undefined'
        ? new LocalStorageTokenStorage()
        : new MemoryTokenStorage();

    this.tokenManager = new TokenManager({
      storage,
      eventEmitter: this.eventEmitter,
      refreshFn: (refreshToken) => this.refreshTokens(refreshToken),
    });

    // Initialize auth module
    this.auth = new AuthModule({
      region: config.region,
      userPoolId: config.userPoolId,
      userPoolClientId: config.userPoolClientId,
      tokenManager: this.tokenManager,
      eventEmitter: this.eventEmitter,
    });

    // Initialize authorization module
    this.authorization = new AuthorizationModule({
      tokenManager: this.tokenManager,
    });

    // Start auto-refresh
    this.tokenManager.startAutoRefresh();
  }

  /**
   * Sign up a new user.
   *
   * @param email - User's email
   * @param password - User's password
   * @param attributes - Optional user attributes
   * @returns Sign up result
   */
  async signUp(
    email: string,
    password: string,
    attributes?: Record<string, string>
  ): Promise<SignUpResult> {
    return this.auth.signUp({ email, password, attributes });
  }

  /**
   * Sign in a user.
   *
   * @param email - User's email
   * @param password - User's password
   * @returns Sign in result
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    return this.auth.signIn({ email, password });
  }

  /**
   * Sign out the current user.
   */
  async signOut(): Promise<void> {
    return this.auth.signOut();
  }

  /**
   * Get the current authenticated user.
   *
   * @returns Current user or null
   */
  async getCurrentUser(): Promise<User | null> {
    return this.auth.getCurrentUser();
  }

  /**
   * Subscribe to authentication state changes.
   *
   * The callback is called immediately with the current state,
   * then on every state change.
   *
   * @param callback - Callback function
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: AuthStateCallback): Unsubscribe {
    // Emit current state immediately
    void this.getCurrentAuthState().then(callback);

    // Subscribe to future changes
    return this.eventEmitter.on('authStateChange', callback);
  }

  /**
   * Get the current authentication state.
   */
  async getCurrentAuthState(): Promise<AuthState> {
    const tokens = await this.tokenManager.getTokens();
    if (tokens === null) {
      return { status: 'unauthenticated' };
    }

    const user = await this.auth.getCurrentUser();
    if (user === null) {
      return { status: 'unauthenticated' };
    }

    return { status: 'authenticated', user, tokens };
  }

  /**
   * Get the API endpoint.
   */
  getApiEndpoint(): string {
    return this.config.apiEndpoint;
  }

  /**
   * Get the current environment.
   */
  getEnvironment(): string {
    return this.config.environment ?? 'dev';
  }

  /**
   * Validate configuration.
   */
  private validateConfig(config: OrbClientConfig): void {
    if (config.region === undefined || config.region === '') {
      throw new ValidationError(
        'region is required',
        ErrorCode.MISSING_REQUIRED_FIELD,
        { field: 'region' }
      );
    }

    if (config.userPoolId === undefined || config.userPoolId === '') {
      throw new ValidationError(
        'userPoolId is required',
        ErrorCode.MISSING_REQUIRED_FIELD,
        { field: 'userPoolId' }
      );
    }

    if (config.userPoolClientId === undefined || config.userPoolClientId === '') {
      throw new ValidationError(
        'userPoolClientId is required',
        ErrorCode.MISSING_REQUIRED_FIELD,
        { field: 'userPoolClientId' }
      );
    }

    if (config.apiEndpoint === undefined || config.apiEndpoint === '') {
      throw new ValidationError(
        'apiEndpoint is required',
        ErrorCode.MISSING_REQUIRED_FIELD,
        { field: 'apiEndpoint' }
      );
    }
  }

  /**
   * Refresh authentication tokens.
   */
  private async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    const command = new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: this.config.userPoolClientId,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    });

    const response = await this.cognitoClient.send(command);

    if (response.AuthenticationResult === undefined) {
      throw new Error('Token refresh failed');
    }

    return {
      accessToken: response.AuthenticationResult.AccessToken ?? '',
      idToken: response.AuthenticationResult.IdToken ?? '',
      refreshToken: refreshToken, // Refresh token doesn't change
      expiresIn: response.AuthenticationResult.ExpiresIn ?? 3600,
      tokenType: 'Bearer',
    };
  }
}
