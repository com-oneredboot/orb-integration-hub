/**
 * GraphQL operations for GetApplicationUsers
 * 
 * CUSTOM CODE - DO NOT REGENERATE
 * This is a Lambda-backed query for retrieving application users with their role assignments.
 * Supports filtering by organization, application, and environment.
 */

export const GetApplicationUsers = /* GraphQL */ `
  query GetApplicationUsers($input: GetApplicationUsersInput!) {
    GetApplicationUsers(input: $input) {
      users {
        userId
        firstName
        lastName
        status
        roleAssignments {
          applicationUserRoleId
          applicationId
          applicationName
          organizationId
          organizationName
          environment
          roleId
          roleName
          status
          createdAt
          updatedAt
        }
      }
      nextToken
    }
  }
`;

/**
 * Input type for GetApplicationUsers query
 */
export interface GetApplicationUsersInput {
  organizationIds?: string[];
  applicationIds?: string[];
  environment?: string;
  limit?: number;
  nextToken?: string;
}

/**
 * Role assignment for a user in an application environment
 */
export interface RoleAssignment {
  applicationUserRoleId: string;
  applicationId: string;
  applicationName: string;
  organizationId: string;
  organizationName: string;
  environment: string;
  roleId: string;
  roleName: string;
  status: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * User with all their role assignments
 */
export interface UserWithRoles {
  userId: string;
  firstName: string;
  lastName: string;
  status: string;
  roleAssignments: RoleAssignment[];
}

/**
 * Output from GetApplicationUsers query
 */
export interface GetApplicationUsersOutput {
  users: UserWithRoles[];
  nextToken?: string;
}

/**
 * Response type for GetApplicationUsers query
 */
export interface GetApplicationUsersResponse {
  GetApplicationUsers: GetApplicationUsersOutput;
}
