// MANUALLY UPDATED for v0.19.0 format - pending orb-schema-generator #79 fix
// Once #79 is fixed, regenerate with: orb-schema generate
/**
 * GraphQL operations for Organizations
 *
 * v0.19.0 Response Format:
 * - Mutations: { code, success, message, item }
 * - Get queries: { code, success, message, item }
 * - List queries: { code, success, message, items, nextToken }
 */

export const OrganizationsCreate = /* GraphQL */ `
  mutation OrganizationsCreate($input: OrganizationsCreateInput!) {
    OrganizationsCreate(input: $input) {
      code
      success
      message
      item {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
    }
  }
`;

export const OrganizationsUpdate = /* GraphQL */ `
  mutation OrganizationsUpdate($input: OrganizationsUpdateInput!) {
    OrganizationsUpdate(input: $input) {
      code
      success
      message
      item {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
    }
  }
`;

export const OrganizationsDelete = /* GraphQL */ `
  mutation OrganizationsDelete($input: OrganizationsDeleteInput!) {
    OrganizationsDelete(input: $input) {
      code
      success
      message
      item {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
    }
  }
`;

export const OrganizationsDisable = /* GraphQL */ `
  mutation OrganizationsDisable($input: OrganizationsDisableInput!) {
    OrganizationsDisable(input: $input) {
      code
      success
      message
      item {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
    }
  }
`;

export const OrganizationsGet = /* GraphQL */ `
  query OrganizationsGet($input: OrganizationsGetInput!) {
    OrganizationsGet(input: $input) {
      code
      success
      message
      item {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
    }
  }
`;

export const OrganizationsListByOrganizationId = /* GraphQL */ `
  query OrganizationsListByOrganizationId($input: OrganizationsListByOrganizationIdInput!) {
    OrganizationsListByOrganizationId(input: $input) {
      code
      success
      message
      items {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
      nextToken
    }
  }
`;

export const OrganizationsListByOwnerId = /* GraphQL */ `
  query OrganizationsListByOwnerId($input: OrganizationsListByOwnerIdInput!) {
    OrganizationsListByOwnerId(input: $input) {
      code
      success
      message
      items {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
      nextToken
    }
  }
`;

export const OrganizationsListByOwnerIdAndCreatedAt = /* GraphQL */ `
  query OrganizationsListByOwnerIdAndCreatedAt($input: OrganizationsListByOwnerIdAndCreatedAtInput!) {
    OrganizationsListByOwnerIdAndCreatedAt(input: $input) {
      code
      success
      message
      items {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
      nextToken
    }
  }
`;

export const OrganizationsListByStatus = /* GraphQL */ `
  query OrganizationsListByStatus($input: OrganizationsListByStatusInput!) {
    OrganizationsListByStatus(input: $input) {
      code
      success
      message
      items {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
      nextToken
    }
  }
`;

export const OrganizationsListByStatusAndCreatedAt = /* GraphQL */ `
  query OrganizationsListByStatusAndCreatedAt($input: OrganizationsListByStatusAndCreatedAtInput!) {
    OrganizationsListByStatusAndCreatedAt(input: $input) {
      code
      success
      message
      items {
        organizationId
        name
        description
        ownerId
        status
        createdAt
        updatedAt
        kmsKeyId
        kmsKeyArn
        kmsAlias
      }
      nextToken
    }
  }
`;
