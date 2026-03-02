/**
 * Test fixtures for E2E tests
 * 
 * This module provides functions for creating and cleaning up test resources
 * during E2E test execution.
 */

import { CognitoIdentityProviderClient, AdminDeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { fromSSO } from '@aws-sdk/credential-providers';

export interface TestResource {
  id: string;
  type: 'organization' | 'application' | 'group' | 'user';
  createdAt: Date;
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
}

export interface CreateApplicationInput {
  organizationId: string;
  name: string;
  description?: string;
}

export interface CreateGroupInput {
  applicationId: string;
  name: string;
  description?: string;
}

/**
 * AWS SDK clients configured for E2E testing
 */
const credentials = fromSSO({ profile: process.env.AWS_PROFILE || 'sso-orb-dev' });
const region = process.env.AWS_REGION || 'us-east-1';

const cognitoClient = new CognitoIdentityProviderClient({ region, credentials });
const dynamoClient = new DynamoDBClient({ region, credentials });

/**
 * Creates a test organization with e2e-test- prefix
 * @param input - Organization creation parameters
 * @returns Created organization with ID
 */
export async function createTestOrganization(
  input: CreateOrganizationInput
): Promise<TestResource> {
  const name = `e2e-test-${input.name}-${Date.now()}`;
  
  // Call GraphQL mutation via AppSync
  const response = await callGraphQL('createOrganization', {
    input: { ...input, name }
  });
  
  return {
    id: response.data.createOrganization.organizationId,
    type: 'organization',
    createdAt: new Date()
  };
}

/**
 * Creates a test application under an organization
 * @param input - Application creation parameters
 * @returns Created application with ID
 */
export async function createTestApplication(
  input: CreateApplicationInput
): Promise<TestResource> {
  const name = `e2e-test-${input.name}-${Date.now()}`;
  
  const response = await callGraphQL('createApplication', {
    input: { ...input, name }
  });
  
  return {
    id: response.data.createApplication.applicationId,
    type: 'application',
    createdAt: new Date()
  };
}

/**
 * Creates a test group under an application
 * @param input - Group creation parameters
 * @returns Created group with ID
 */
export async function createTestGroup(
  input: CreateGroupInput
): Promise<TestResource> {
  const name = `e2e-test-${input.name}-${Date.now()}`;
  
  const response = await callGraphQL('createGroup', {
    input: { ...input, name }
  });
  
  return {
    id: response.data.createGroup.groupId,
    type: 'group',
    createdAt: new Date()
  };
}

/**
 * Creates prerequisite resources for tests that need existing data
 * @returns Object containing IDs of created resources
 */
export async function createPrerequisites(): Promise<{
  organizationId: string;
  applicationId: string;
}> {
  const org = await createTestOrganization({
    name: 'prerequisite-org',
    description: 'Organization for E2E test prerequisites'
  });
  
  const app = await createTestApplication({
    organizationId: org.id,
    name: 'prerequisite-app',
    description: 'Application for E2E test prerequisites'
  });
  
  return {
    organizationId: org.id,
    applicationId: app.id
  };
}

/**
 * Deletes test resources by ID
 * @param resources - Array of resources to delete
 */
export async function cleanupTestData(resources: TestResource[]): Promise<void> {
  const failures: Array<{ resource: TestResource; error: Error }> = [];
  
  for (const resource of resources) {
    try {
      switch (resource.type) {
        case 'organization':
          await callGraphQL('deleteOrganization', {
            organizationId: resource.id
          });
          break;
        case 'application':
          await callGraphQL('deleteApplication', {
            applicationId: resource.id
          });
          break;
        case 'group':
          await callGraphQL('deleteGroup', {
            groupId: resource.id
          });
          break;
        case 'user':
          await deleteTestUser(resource.id);
          break;
      }
    } catch (error: any) {
      console.error(`Failed to cleanup ${resource.type} ${resource.id}:`, error);
      failures.push({ resource, error });
      // Continue cleanup even if one resource fails
    }
  }
  
  if (failures.length > 0) {
    console.warn(
      `\nCleanup completed with ${failures.length} failure(s):\n` +
      failures.map(f => `  - ${f.resource.type} ${f.resource.id}: ${f.error.message}`).join('\n') +
      `\n\nManual cleanup may be required. See README.md for cleanup procedures.`
    );
  }
}

/**
 * Deletes a test user from Cognito and DynamoDB
 * @param userId - User ID to delete
 */
export async function deleteTestUser(userId: string): Promise<void> {
  try {
    // Delete from Cognito
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: userId
    }));
  } catch (error: any) {
    if (error.name === 'CredentialsProviderError' || error.name === 'ExpiredTokenException') {
      throw new Error(
        `AWS credentials are invalid or expired.\n` +
        `Run: aws sso login --profile sso-orb-dev\n` +
        `Then retry the test.`
      );
    }
    throw error;
  }
  
  try {
    // Delete from DynamoDB
    await dynamoClient.send(new DeleteItemCommand({
      TableName: `orb-integration-hub-${process.env.ENVIRONMENT || 'dev'}-users`,
      Key: { userId: { S: userId } }
    }));
  } catch (error: any) {
    if (error.name === 'CredentialsProviderError' || error.name === 'ExpiredTokenException') {
      throw new Error(
        `AWS credentials are invalid or expired.\n` +
        `Run: aws sso login --profile sso-orb-dev\n` +
        `Then retry the test.`
      );
    }
    throw error;
  }
}

/**
 * Helper function to call GraphQL mutations
 * @param operation - GraphQL operation name
 * @param variables - Operation variables
 * @returns GraphQL response
 */
async function callGraphQL(operation: string, variables: unknown): Promise<any> {
  const apiUrl = process.env.APPSYNC_API_URL;
  const apiKey = process.env.APPSYNC_API_KEY;
  
  if (!apiUrl || !apiKey) {
    throw new Error(
      'AppSync configuration missing. ' +
      'Set APPSYNC_API_URL and APPSYNC_API_KEY in .env.test file.'
    );
  }
  
  // Build GraphQL query based on operation
  const query = buildGraphQLQuery(operation);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      query,
      variables
    })
  });
  
  const result = await response.json();
  
  if (result.errors) {
    throw new Error(
      `GraphQL operation ${operation} failed:\n` +
      `Errors: ${JSON.stringify(result.errors, null, 2)}\n` +
      `Variables: ${JSON.stringify(variables, null, 2)}`
    );
  }
  
  return result;
}

/**
 * Builds GraphQL query string for common operations
 * @param operation - Operation name
 * @returns GraphQL query string
 */
function buildGraphQLQuery(operation: string): string {
  const queries: Record<string, string> = {
    createOrganization: `
      mutation CreateOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          organizationId
          name
          description
          status
        }
      }
    `,
    createApplication: `
      mutation CreateApplication($input: CreateApplicationInput!) {
        createApplication(input: $input) {
          applicationId
          organizationId
          name
          description
          status
        }
      }
    `,
    createGroup: `
      mutation CreateGroup($input: CreateGroupInput!) {
        createGroup(input: $input) {
          groupId
          applicationId
          name
          description
          status
        }
      }
    `,
    deleteOrganization: `
      mutation DeleteOrganization($organizationId: ID!) {
        deleteOrganization(organizationId: $organizationId) {
          organizationId
        }
      }
    `,
    deleteApplication: `
      mutation DeleteApplication($applicationId: ID!) {
        deleteApplication(applicationId: $applicationId) {
          applicationId
        }
      }
    `,
    deleteGroup: `
      mutation DeleteGroup($groupId: ID!) {
        deleteGroup(groupId: $groupId) {
          groupId
        }
      }
    `
  };
  
  const query = queries[operation];
  if (!query) {
    throw new Error(`Unknown GraphQL operation: ${operation}`);
  }
  
  return query;
}
