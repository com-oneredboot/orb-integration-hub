// Auto-generated GraphQL operations for Applications
// Do not edit manually. Generated by generate.py

export const ApplicationsCreateMutation = /* GraphQL */ `
mutation ApplicationsCreate($input: ApplicationsCreateInput!) {
  ApplicationsCreate(input: $input) {
    StatusCode
    Message
    Data {
      applicationId
      name
      organizationId
      ownerId
      status
      createdAt
      updatedAt
      apiKey
      apiKeyNext
      environments
    }
  }
}
`;

export const ApplicationsUpdateMutation = /* GraphQL */ `
mutation ApplicationsUpdate($input: ApplicationsUpdateInput!) {
  ApplicationsUpdate(input: $input) {
    StatusCode
    Message
    Data {
      applicationId
      name
      organizationId
      ownerId
      status
      createdAt
      updatedAt
      apiKey
      apiKeyNext
      environments
    }
  }
}
`;

export const ApplicationsDeleteMutation = /* GraphQL */ `
mutation ApplicationsDelete($id: ID!) {
  ApplicationsDelete(id: $id) {
    StatusCode
    Message
    Data {
      applicationId
      name
      organizationId
      ownerId
      status
      createdAt
      updatedAt
      apiKey
      apiKeyNext
      environments
    }
  }
}
`;

export const ApplicationsDisableMutation = /* GraphQL */ `
mutation ApplicationsDisable($id: ID!) {
  ApplicationsDisable(id: $id) {
    StatusCode
    Message
    Data {
      applicationId
      name
      organizationId
      ownerId
      status
      createdAt
      updatedAt
      apiKey
      apiKeyNext
      environments
    }
  }
}
`;

export const ApplicationsQueryByApplicationId = /* GraphQL */ `
query ApplicationsQueryByApplicationId($input: ApplicationsQueryByApplicationIdInput!) {
  ApplicationsQueryByApplicationId(input: $input) {
    StatusCode
    Message
    Data {
      applicationId
      name
      organizationId
      ownerId
      status
      createdAt
      updatedAt
      apiKey
      apiKeyNext
      environments
    }
  }
}
`;

export const ApplicationsQueryByOrganizationId = /* GraphQL */ `
query ApplicationsQueryByOrganizationId($input: ApplicationsQueryByOrganizationIdInput!) {
  ApplicationsQueryByOrganizationId(input: $input) {
    StatusCode
    Message
    Data {
      applicationId
      name
      organizationId
      ownerId
      status
      createdAt
      updatedAt
      apiKey
      apiKeyNext
      environments
    }
  }
}
`;


// For each secondary index, generate a query operation
 