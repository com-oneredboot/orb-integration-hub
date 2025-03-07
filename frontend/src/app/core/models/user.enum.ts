// file: frontend/src/app/core/models/user.enum.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

/**
 * User Enums
 *
 * This file contains enums for the User model.
 * This file is not auto-generated and should be maintained manually.
 */

export enum UserGroups {
  UNKNOWN = 'UNKNOWN',     // Default value for initialization
  USER = 'USER',           // Base group
  CUSTOMER = 'CUSTOMER',   // End-users making purchases
  CLIENT = 'CLIENT',       // Customers using the service
  EMPLOYEE = 'EMPLOYEE',   // Internal staff
  OWNER = 'OWNER'         // Root-level access
}

export enum UserStatus {
  UNKNOWN = 'UNKNOWN',     // Default value for initialization
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE'
}
