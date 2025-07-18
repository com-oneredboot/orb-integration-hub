// Auto-generated GraphQL operations for ApplicationRoles
// Do not edit manually. Generated by generate.py

export const ApplicationRolesCreateMutation = /* GraphQL */ `
mutation ApplicationRolesCreate($input: ApplicationRolesCreateInput!) {
  ApplicationRolesCreate(input: $input) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesUpdateMutation = /* GraphQL */ `
mutation ApplicationRolesUpdate($input: ApplicationRolesUpdateInput!) {
  ApplicationRolesUpdate(input: $input) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesDeleteMutation = /* GraphQL */ `
mutation ApplicationRolesDelete($id: ID!) {
  ApplicationRolesDelete(id: $id) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesDisableMutation = /* GraphQL */ `
mutation ApplicationRolesDisable($id: ID!) {
  ApplicationRolesDisable(id: $id) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesQueryByApplicationRoleId = /* GraphQL */ `
query ApplicationRolesQueryByApplicationRoleId($input: ApplicationRolesQueryByApplicationRoleIdInput!) {
  ApplicationRolesQueryByApplicationRoleId(input: $input) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesQueryByUserId = /* GraphQL */ `
query ApplicationRolesQueryByUserId($input: ApplicationRolesQueryByUserIdInput!) {
  ApplicationRolesQueryByUserId(input: $input) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesQueryByApplicationId = /* GraphQL */ `
query ApplicationRolesQueryByApplicationId($input: ApplicationRolesQueryByApplicationIdInput!) {
  ApplicationRolesQueryByApplicationId(input: $input) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;

export const ApplicationRolesQueryByRoleId = /* GraphQL */ `
query ApplicationRolesQueryByRoleId($input: ApplicationRolesQueryByRoleIdInput!) {
  ApplicationRolesQueryByRoleId(input: $input) {
    StatusCode
    Message
    Data {
      applicationRoleId
      userId
      applicationId
      roleId
      roleName
      roleType
      permissions
      status
      createdAt
      updatedAt
    }
  }
}
`;


// For each secondary index, generate a query operation
 