#!/usr/bin/env node

/**
 * Setup Development Environment Script
 * 
 * This script creates a local development environment file with real AWS credentials
 * that replaces the placeholder environment.ts for local development
 */

/**
 * PREREQUISITE: SDK API Key Provisioning
 * 
 * Before running this script, the Frontend_API_Key must be provisioned:
 * 
 * 1. Create an API key in the ApplicationApiKeys DynamoDB table in `orb_{env}_{key}` format
 *    - The key should be scoped to CheckEmailExists and CreateUserFromCognito operations only
 * 2. Store the key in SSM at: /orb/integration-hub/{env}/appsync/sdk-frontend-api-key
 * 3. The SDK API URL is already stored at: /orb/integration-hub/{env}/appsync/sdk-graphql-url
 * 
 * The Lambda authorizer validates keys from the ApplicationApiKeys table,
 * so no authorizer changes are needed.
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { fromSSO } = require('@aws-sdk/credential-provider-sso');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  customerId: process.env.CUSTOMER_ID || 'orb',
  projectId: process.env.PROJECT_ID || 'integration-hub',
  environment: process.argv[2] || process.env.ENVIRONMENT || 'dev',
  region: process.env.AWS_REGION || 'us-east-1',
  awsProfile: process.env.AWS_PROFILE || 'sso-orb-dev',
  envFile: path.join(__dirname, '../src/environments/environment.ts'),
  localFile: path.join(__dirname, '../src/environments/environment.local.ts')
};

// AWS Client configuration
const getAWSClientConfig = () => {
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return { region: CONFIG.region };
  }
  
  return {
    region: CONFIG.region,
    credentials: fromSSO({ profile: CONFIG.awsProfile })
  };
};

const clientConfig = getAWSClientConfig();
const secretsManager = new SecretsManagerClient(clientConfig);
const ssmClient = new SSMClient(clientConfig);

// Helper to generate path-based SSM parameter names
const ssmParameterName = (resourcePath) => 
  `/${CONFIG.customerId}/${CONFIG.projectId}/${CONFIG.environment}/${resourcePath}`;

// Helper to generate path-based secret names (mirrors Config.secret_name in CDK)
const secretName = (service, resource) =>
  `${CONFIG.customerId}/${CONFIG.projectId}/${CONFIG.environment}/secrets/${service}/${resource}`;

const FRONTEND_SECRETS_MAP = {
  'COGNITO_USER_POOL_ID': {
    type: 'parameter',
    name: ssmParameterName('cognito/user-pool-id')
  },
  'COGNITO_CLIENT_ID': {
    type: 'parameter',
    name: ssmParameterName('cognito/client-id')
  },
  'COGNITO_QR_ISSUER': {
    type: 'parameter',
    name: ssmParameterName('cognito/qr-issuer')
  },
  'GRAPHQL_API_URL': {
    type: 'parameter',
    name: ssmParameterName('appsync/graphql-url')
  },
  'SDK_API_URL': {
    type: 'parameter',
    name: ssmParameterName('appsync/sdk-graphql-url')
  },
  'SDK_API_KEY': {
    type: 'parameter',
    name: ssmParameterName('appsync/sdk-frontend-api-key')
  },
  'AWS_REGION': {
    type: 'static',
    value: CONFIG.region
  }
};

async function getParameter(name) {
  const command = new GetParameterCommand({ Name: name, WithDecryption: true });
  const response = await ssmClient.send(command);
  return response.Parameter.Value;
}

async function getSecret(name) {
  const command = new GetSecretValueCommand({ SecretId: name });
  const response = await secretsManager.send(command);
  
  try {
    const secretData = JSON.parse(response.SecretString);
    return secretData.api_key || secretData.value || response.SecretString;
  } catch {
    return response.SecretString;
  }
}

async function setupDevEnvironment() {
  console.log('============================================================');
  console.log('🔧 Setting up Development Environment');
  console.log('============================================================');
  console.log(`Environment: ${CONFIG.environment}`);
  console.log(`AWS Profile: ${CONFIG.awsProfile}`);
  console.log('');

  // Create environment.local.ts with real credentials, keep environment.ts with tokens
  // The workflow should be:
  // 1. environment.ts (in git) = placeholder tokens
  // 2. environment.local.ts (not in git) = real credentials for local dev

  // Retrieve credentials
  const credentials = {};
  
  for (const [tokenName, config] of Object.entries(FRONTEND_SECRETS_MAP)) {
    try {
      let value;
      
      if (config.type === 'parameter') {
        console.log(`🔍 Retrieving parameter: ${config.name}`);
        value = await getParameter(config.name);
      } else if (config.type === 'secret') {
        console.log(`🔐 Retrieving secret: ${config.name}`);
        value = await getSecret(config.name);
      } else if (config.type === 'static') {
        value = config.value;
      }
      
      credentials[tokenName] = value;
      console.log(`✓ Retrieved ${tokenName}`);
    } catch (error) {
      console.error(`❌ Failed to retrieve ${tokenName}:`, error.message);
      throw error;
    }
  }

  // Generate environment.local.ts with real credentials
  const isProduction = CONFIG.environment === 'prod';
  const localEnvContent = `// ${CONFIG.environment.toUpperCase()} ENVIRONMENT WITH REAL CREDENTIALS
// This file was auto-generated by setup-dev-env.js
// DO NOT COMMIT THIS FILE - it contains real AWS credentials

export const environment = {
  appName: 'Integration Hub',
  production: ${isProduction},
  debugMode: ${!isProduction},
  loggingLevel: '${isProduction ? 'info' : 'debug'}',
  cognito: {
    userPoolId: '${credentials.COGNITO_USER_POOL_ID}',
    userPoolClientId: '${credentials.COGNITO_CLIENT_ID}',
    qrCodeIssuer: '${credentials.COGNITO_QR_ISSUER}'
  },
  graphql: {
    url: '${credentials.GRAPHQL_API_URL}',
    region: '${credentials.AWS_REGION}'
  },
  sdkApi: {
    url: '${credentials.SDK_API_URL}',
    apiKey: '${credentials.SDK_API_KEY}',
    region: '${credentials.AWS_REGION}'
  }
};
`;

  fs.writeFileSync(CONFIG.localFile, localEnvContent);
  
  console.log('');
  console.log('✅ Local environment configured successfully!');
  console.log(`✓ Created: environment.local.ts (${CONFIG.environment} credentials)`);
  console.log('');
  console.log('📋 To use these credentials:');
  console.log('1. Update angular.json to use environment.local.ts for development');
  console.log('2. Or manually import from environment.local.ts in your app');
  console.log('');
  console.log('✅ environment.ts remains clean with placeholder tokens for git');
}

async function cleanupLocalEnvironment() {
  if (fs.existsSync(CONFIG.localFile)) {
    console.log('🗑️  Removing environment.local.ts...');
    fs.unlinkSync(CONFIG.localFile);
    console.log('✅ environment.local.ts removed');
    console.log('✅ environment.ts remains with placeholder tokens for git');
  } else {
    console.log('ℹ️  No environment.local.ts file found to remove.');
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'cleanup') {
  cleanupLocalEnvironment();
} else {
  setupDevEnvironment().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}