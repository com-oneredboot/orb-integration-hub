/**
 * AWS service test setup utilities
 */

import * as AWS from 'aws-sdk';
import * as AWSMock from 'aws-sdk-mock';
import { TestConfig, getTestConfig, isLocalStack } from '../config/test-config';

export class AWSTestSetup {
  private config: TestConfig;
  private cognitoIdentityServiceProvider: AWS.CognitoIdentityServiceProvider;
  private dynamoDB: AWS.DynamoDB.DocumentClient;
  private sns: AWS.SNS;
  private appsync: AWS.AppSync;
  private secretsManager: AWS.SecretsManager;

  constructor() {
    this.config = getTestConfig();
    this.setupAWSConfig();
    this.initializeServices();
  }

  private setupAWSConfig(): void {
    const awsConfig: AWS.Config = {
      region: this.config.aws.region,
      credentials: new AWS.Credentials({
        accessKeyId: process.env.TEST_AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.TEST_AWS_SECRET_ACCESS_KEY || 'test'
      })
    };

    if (isLocalStack()) {
      awsConfig.endpoint = this.config.aws.endpoint;
      awsConfig.s3ForcePathStyle = true;
    }

    AWS.config.update(awsConfig);
  }

  private initializeServices(): void {
    this.cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
    this.dynamoDB = new AWS.DynamoDB.DocumentClient();
    this.sns = new AWS.SNS();
    this.appsync = new AWS.AppSync();
    this.secretsManager = new AWS.SecretsManager();
  }

  // Cognito setup methods
  async createTestUserPool(): Promise<string> {
    try {
      const params = {
        PoolName: 'integration-test-pool',
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireUppercase: true,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true
          }
        },
        AutoVerifiedAttributes: ['email'],
        UsernameAttributes: ['email'],
        Schema: [
          {
            Name: 'email',
            AttributeDataType: 'String',
            Required: true,
            Mutable: true
          }
        ]
      };

      const result = await this.cognitoIdentityServiceProvider.createUserPool(params).promise();
      return result.UserPool!.Id!;
    } catch (error) {
      console.warn('Failed to create test user pool:', error);
      return this.config.aws.cognitoUserPoolId; // Fallback to configured pool
    }
  }

  async createTestUserPoolClient(userPoolId: string): Promise<string> {
    try {
      const params = {
        UserPoolId: userPoolId,
        ClientName: 'integration-test-client',
        GenerateSecret: false,
        ExplicitAuthFlows: [
          'ADMIN_NO_SRP_AUTH',
          'USER_PASSWORD_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH'
        ]
      };

      const result = await this.cognitoIdentityServiceProvider.createUserPoolClient(params).promise();
      return result.UserPoolClient!.ClientId!;
    } catch (error) {
      console.warn('Failed to create test user pool client:', error);
      return this.config.aws.cognitoClientId; // Fallback to configured client
    }
  }

  async createTestUser(userPoolId: string): Promise<void> {
    try {
      const params = {
        UserPoolId: userPoolId,
        Username: this.config.credentials.testUserEmail,
        UserAttributes: [
          {
            Name: 'email',
            Value: this.config.credentials.testUserEmail
          },
          {
            Name: 'phone_number',
            Value: this.config.credentials.testPhoneNumber
          }
        ],
        TemporaryPassword: this.config.credentials.testUserPassword,
        MessageAction: 'SUPPRESS'
      };

      await this.cognitoIdentityServiceProvider.adminCreateUser(params).promise();

      // Set permanent password
      const setPasswordParams = {
        UserPoolId: userPoolId,
        Username: this.config.credentials.testUserEmail,
        Password: this.config.credentials.testUserPassword,
        Permanent: true
      };

      await this.cognitoIdentityServiceProvider.adminSetUserPassword(setPasswordParams).promise();
    } catch (error) {
      console.warn('Failed to create test user:', error);
    }
  }

  // DynamoDB setup methods
  async createTestTables(): Promise<void> {
    const tables = [
      {
        TableName: 'test-users',
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
      },
      {
        TableName: 'test-sms-rate-limit',
        KeySchema: [{ AttributeName: 'phoneNumber', KeyType: 'HASH' }],
        AttributeDefinitions: [{ AttributeName: 'phoneNumber', AttributeType: 'S' }],
        BillingMode: 'PAY_PER_REQUEST'
      }
    ];

    for (const table of tables) {
      try {
        await new AWS.DynamoDB().createTable(table).promise();
        await new AWS.DynamoDB().waitFor('tableExists', { TableName: table.TableName }).promise();
      } catch (error: any) {
        if (error.code !== 'ResourceInUseException') {
          console.warn(`Failed to create table ${table.TableName}:`, error);
        }
      }
    }
  }

  // SNS setup methods
  async createTestSNSTopic(): Promise<string> {
    try {
      const params = {
        Name: 'integration-test-sms-topic'
      };

      const result = await this.sns.createTopic(params).promise();
      return result.TopicArn!;
    } catch (error) {
      console.warn('Failed to create SNS topic:', error);
      return 'arn:aws:sns:us-east-1:123456789012:test-topic';
    }
  }

  // Secrets Manager setup
  async createTestSecrets(): Promise<void> {
    const secrets = [
      {
        Name: 'test/sms-verification-secret',
        SecretString: JSON.stringify({
          secret_key: 'test-secret-key-for-integration-tests'
        })
      }
    ];

    for (const secret of secrets) {
      try {
        await this.secretsManager.createSecret(secret).promise();
      } catch (error: any) {
        if (error.code !== 'ResourceExistsException') {
          console.warn(`Failed to create secret ${secret.Name}:`, error);
        }
      }
    }
  }

  // Cleanup methods
  async cleanupTestResources(): Promise<void> {
    try {
      // Clean up DynamoDB tables
      const tableNames = ['test-users', 'test-sms-rate-limit'];
      for (const tableName of tableNames) {
        try {
          await new AWS.DynamoDB().deleteTable({ TableName: tableName }).promise();
        } catch (error) {
          // Ignore if table doesn't exist
        }
      }

      // Clean up secrets
      try {
        await this.secretsManager.deleteSecret({
          SecretId: 'test/sms-verification-secret',
          ForceDeleteWithoutRecovery: true
        }).promise();
      } catch (error) {
        // Ignore if secret doesn't exist
      }

    } catch (error) {
      console.warn('Failed to cleanup some test resources:', error);
    }
  }

  // Mock setup for unit tests
  setupMocks(): void {
    // Mock Cognito
    AWSMock.mock('CognitoIdentityServiceProvider', 'adminInitiateAuth', (params: any, callback: Function) => {
      if (params.Username === this.config.credentials.testUserEmail) {
        callback(null, {
          AuthenticationResult: {
            AccessToken: 'mock-access-token',
            IdToken: 'mock-id-token',
            RefreshToken: 'mock-refresh-token'
          }
        });
      } else {
        callback(new Error('User not found'));
      }
    });

    // Mock DynamoDB
    AWSMock.mock('DynamoDB.DocumentClient', 'get', (params: any, callback: Function) => {
      callback(null, {
        Item: {
          id: 'test-user-id',
          email: this.config.credentials.testUserEmail
        }
      });
    });

    // Mock SNS
    AWSMock.mock('SNS', 'publish', (params: any, callback: Function) => {
      callback(null, {
        MessageId: 'mock-message-id'
      });
    });

    // Mock Secrets Manager
    AWSMock.mock('SecretsManager', 'getSecretValue', (params: any, callback: Function) => {
      callback(null, {
        SecretString: JSON.stringify({
          secret_key: 'test-secret-key'
        })
      });
    });
  }

  restoreMocks(): void {
    AWSMock.restore();
  }

  // Getters
  getCognitoService(): AWS.CognitoIdentityServiceProvider {
    return this.cognitoIdentityServiceProvider;
  }

  getDynamoDBClient(): AWS.DynamoDB.DocumentClient {
    return this.dynamoDB;
  }

  getSNSClient(): AWS.SNS {
    return this.sns;
  }

  getSecretsManagerClient(): AWS.SecretsManager {
    return this.secretsManager;
  }

  getConfig(): TestConfig {
    return this.config;
  }
}