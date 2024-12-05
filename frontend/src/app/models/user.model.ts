/**
 * Enum defining all possible user groups in the system (matching Cognito groups)
 */
export enum UserGroup {
  USER = 'User',           // Base group
  CUSTOMER = 'Customer',   // End-users making purchases
  CLIENT = 'Client',       // Customers using the service
  EMPLOYEES = 'Employees', // Internal staff
  OWNER = 'Owner'         // Root-level access
}

/**
 * Status of user's account
 */
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}

/**
 * Interface representing a user in the system
 * Contains all essential user information and profile data
 */
export interface User {
  /** Unique identifier for the user in our database */
  id: string;

  /** User's Cognito ID for AWS authentication */
  cognito_id: string;

  /** Username for login */
  username: string;

  /** User's email address */
  email: string;

  /** User's role in the system */
  group: UserGroup;

  /** Current status of the user's account */
  status: UserStatus;

  /** Timestamp of when the user was created */
  created_at: string;

  /** Timestamp of the last update to user's profile */
  updated_at: string;

  /** Optional profile data */
  profile?: {
    /** User's full name */
    full_name?: string;
    /** User's phone number */
    phone?: string;
    /** User's preferred language */
    language?: string;
    /** Additional preferences */
    preferences?: {
      /** Email notification settings */
      email_notifications?: boolean;
      /** Theme preference */
      theme?: 'light' | 'dark';
    };
  };
}



/**
 * Interface for creating a new user
 * Omits system-generated fields
 */
export type CreateUserInput = Omit<User, 'id' | 'created_at' | 'updated_at'>;

/**
 * Interface for updating an existing user
 * Makes all fields optional except id
 */
export type UpdateUserInput = Partial<Omit<User, 'id'>> & { id: string };
