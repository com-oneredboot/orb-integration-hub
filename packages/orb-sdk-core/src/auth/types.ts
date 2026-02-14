/**
 * Authentication types for the Orb SDK.
 *
 * @module auth/types
 */

/**
 * Parameters for signing up a new user.
 */
export interface SignUpParams {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Optional user attributes */
  attributes?: Record<string, string> | undefined;
}

/**
 * Result of a sign up operation.
 */
export interface SignUpResult {
  /** Whether the user is confirmed */
  userConfirmed: boolean;
  /** Delivery details for verification code */
  codeDeliveryDetails?: {
    destination: string;
    deliveryMedium: 'EMAIL' | 'SMS';
    attributeName: string;
  } | undefined;
  /** User's unique identifier */
  userSub: string;
}

/**
 * Parameters for signing in a user.
 */
export interface SignInParams {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/**
 * Challenge names that may be returned during sign in.
 */
export type ChallengeName =
  | 'MFA_REQUIRED'
  | 'MFA_SETUP'
  | 'NEW_PASSWORD_REQUIRED'
  | 'CUSTOM_CHALLENGE';

/**
 * Result of a sign in operation.
 */
export interface SignInResult {
  /** Whether authentication is complete */
  isSignedIn: boolean;
  /** Challenge name if additional steps are required */
  challengeName?: ChallengeName | undefined;
  /** Session token for completing challenges */
  session?: string | undefined;
  /** MFA setup details if MFA_SETUP challenge */
  mfaSetupDetails?: MFASetupResult | undefined;
  /** Authentication tokens if sign in is complete */
  tokens?: AuthTokens | undefined;
}

/**
 * MFA setup details returned when MFA setup is required.
 */
export interface MFASetupResult {
  /** TOTP secret key */
  secretCode: string;
  /** URI for QR code generation */
  qrCodeUri: string;
  /** Setup session for confirming MFA */
  session: string;
}

/**
 * Authentication tokens returned after successful authentication.
 */
export interface AuthTokens {
  /** Access token for API calls */
  accessToken: string;
  /** ID token containing user claims */
  idToken: string;
  /** Refresh token for obtaining new tokens */
  refreshToken: string;
  /** Token expiration time in seconds */
  expiresIn: number;
  /** Token type (always 'Bearer') */
  tokenType: 'Bearer';
}

/**
 * Current authentication session.
 */
export interface AuthSession {
  /** Authentication tokens */
  tokens: AuthTokens;
  /** User information from ID token */
  user: {
    userId: string;
    email: string;
    emailVerified: boolean;
    phoneNumber?: string;
    phoneVerified?: boolean;
    groups: string[];
  };
  /** When the session was created */
  createdAt: number;
  /** When the tokens expire */
  expiresAt: number;
}

/**
 * User information extracted from tokens.
 */
export interface User {
  /** User's unique identifier (Cognito sub) */
  userId: string;
  /** User's email address */
  email: string;
  /** Whether email is verified */
  emailVerified: boolean;
  /** User's phone number */
  phoneNumber?: string;
  /** Whether phone is verified */
  phoneVerified?: boolean;
  /** Cognito groups the user belongs to */
  groups: string[];
  /** Custom attributes */
  attributes?: Record<string, string>;
}

/**
 * Phone verification result.
 */
export interface PhoneVerificationResult {
  /** Whether verification was successful */
  success: boolean;
  /** Error message if verification failed */
  error?: string;
}
