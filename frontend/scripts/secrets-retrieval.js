#!/usr/bin/env node

/**
 * AWS Secrets Manager Integration Script
 * 
 * This script retrieves secrets from AWS Secrets Manager based on environment
 * and stores them in a temporary JSON file for build-time replacement.
 * 
 * Dependencies:
 * - AWS SDK v3
 * - YAML parser for bootstrap.yml
 * - Environment variables for AWS authentication
 * 
 * Usage:
 *   node scripts/secrets-retrieval.js [environment]
 *   
 * Environment: dev (default), staging, prod
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { fromSSO } = require('@aws-sdk/credential-provider-sso');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configuration
const CONFIG = {
  customerId: process.env.CUSTOMER_ID || 'orb',
  projectId: process.env.PROJECT_ID || 'integration-hub',
  environment: process.argv[2] || process.env.ENVIRONMENT || 'dev',
  region: process.env.AWS_REGION || 'us-east-1',
  awsProfile: process.env.AWS_PROFILE || 'sso-tpf',
  bootstrapYmlPath: path.join(__dirname, '../../infrastructure/cloudformation/bootstrap.yml'),
  tempSecretsFile: path.join(__dirname, '../.secrets-temp.json')
};

// AWS Client configuration with SSO profile support
const getAWSClientConfig = () => {
  // If we have traditional environment variables, use them
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return { region: CONFIG.region };
  }
  
  // Otherwise, use SSO profile
  return {
    region: CONFIG.region,
    credentials: fromSSO({ profile: CONFIG.awsProfile })
  };
};

// AWS Clients
const clientConfig = getAWSClientConfig();
const secretsManager = new SecretsManagerClient(clientConfig);
const ssmClient = new SSMClient(clientConfig);

/**
 * Frontend secrets mapping - defines which secrets/parameters are needed
 * for the frontend environment configuration
 */
const FRONTEND_SECRETS_MAP = {
  // Cognito configuration - these should be parameters, not secrets
  'COGNITO_USER_POOL_ID': {
    type: 'parameter',
    name: `${CONFIG.customerId}-${CONFIG.projectId}-${CONFIG.environment}-cognito-user-pool-id`
  },
  'COGNITO_CLIENT_ID': {
    type: 'parameter', 
    name: `${CONFIG.customerId}-${CONFIG.projectId}-${CONFIG.environment}-cognito-client-id`
  },
  'COGNITO_QR_ISSUER': {
    type: 'parameter',
    name: `${CONFIG.customerId}-${CONFIG.projectId}-${CONFIG.environment}-cognito-qr-issuer`
  },
  
  // GraphQL API configuration
  'GRAPHQL_API_URL': {
    type: 'parameter',
    name: `${CONFIG.customerId}-${CONFIG.projectId}-${CONFIG.environment}-graphql-api-url`
  },
  'AWS_REGION': {
    type: 'static',
    value: CONFIG.region
  },
  
  // GraphQL API Key - this should be a secret
  'GRAPHQL_API_KEY': {
    type: 'secret',
    name: `${CONFIG.customerId}-${CONFIG.projectId}-${CONFIG.environment}-graphql-api-key`
  }
};

/**
 * Retrieve a secret from AWS Secrets Manager
 */
async function getSecret(secretName) {
  try {
    console.log(`Retrieving secret: ${secretName}`);
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsManager.send(command);
    
    // Handle both string and JSON secrets
    if (response.SecretString) {
      try {
        const parsed = JSON.parse(response.SecretString);
        return parsed;
      } catch {
        return response.SecretString;
      }
    }
    
    throw new Error('Secret value not found');
  } catch (error) {
    console.error(`Failed to retrieve secret ${secretName}:`, error.message);
    throw error;
  }
}

/**
 * Retrieve a parameter from AWS SSM Parameter Store
 */
async function getParameter(parameterName) {
  try {
    console.log(`Retrieving parameter: ${parameterName}`);
    const command = new GetParameterCommand({ 
      Name: parameterName,
      WithDecryption: true // Support SecureString parameters
    });
    const response = await ssmClient.send(command);
    return response.Parameter.Value;
  } catch (error) {
    console.error(`Failed to retrieve parameter ${parameterName}:`, error.message);
    throw error;
  }
}

/**
 * Validate AWS credentials - supports both environment variables and SSO
 */
function validateEnvironment() {
  // Check if we have traditional environment variables
  const hasEnvVars = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!hasEnvVars) {
    console.log('Traditional AWS environment variables not found, using SSO profile...');
    console.log(`Using AWS Profile: ${CONFIG.awsProfile}`);
  } else {
    console.log('Using AWS environment variables for authentication');
  }
  
  console.log(`Environment validated for: ${CONFIG.environment}`);
  console.log(`AWS Region: ${CONFIG.region}`);
  console.log(`Customer ID: ${CONFIG.customerId}`);
  console.log(`Project ID: ${CONFIG.projectId}`);
}

/**
 * Parse bootstrap.yml to understand secret definitions (for future enhancement)
 */
function parseBootstrapYml() {
  try {
    if (fs.existsSync(CONFIG.bootstrapYmlPath)) {
      const bootstrapContent = fs.readFileSync(CONFIG.bootstrapYmlPath, 'utf8');
      const bootstrap = yaml.load(bootstrapContent);
      
      console.log('Bootstrap.yml found and parsed successfully');
      // Future enhancement: Extract secret names from bootstrap.yml Resources
      return bootstrap;
    } else {
      console.warn('Bootstrap.yml not found, using hardcoded secret mapping');
      return null;
    }
  } catch (error) {
    console.warn('Failed to parse bootstrap.yml:', error.message);
    return null;
  }
}

/**
 * Retrieve all frontend secrets and parameters
 */
async function retrieveFrontendSecrets() {
  const secrets = {};
  const errors = [];
  
  console.log('\nRetrieving frontend configuration values...\n');
  
  for (const [tokenName, config] of Object.entries(FRONTEND_SECRETS_MAP)) {
    try {
      let value;
      
      switch (config.type) {
        case 'secret':
          value = await getSecret(config.name);
          // For JSON secrets, extract the actual secret value
          if (typeof value === 'object' && value.secret_key) {
            value = value.secret_key;
          }
          break;
          
        case 'parameter':
          value = await getParameter(config.name);
          break;
          
        case 'static':
          value = config.value;
          console.log(`Using static value for ${tokenName}: ${value}`);
          break;
          
        default:
          throw new Error(`Unknown secret type: ${config.type}`);
      }
      
      secrets[tokenName] = value;
      console.log(`✓ Retrieved ${tokenName} (${config.type})`);
      
    } catch (error) {
      errors.push({ tokenName, error: error.message });
      console.error(`✗ Failed to retrieve ${tokenName}:`, error.message);
    }
  }
  
  return { secrets, errors };
}

/**
 * Save secrets to temporary JSON file
 */
function saveSecretsToFile(secrets) {
  try {
    // Ensure the temp file doesn't persist sensitive data with proper permissions
    const tempData = {
      timestamp: new Date().toISOString(),
      environment: CONFIG.environment,
      secrets: secrets
    };
    
    fs.writeFileSync(CONFIG.tempSecretsFile, JSON.stringify(tempData, null, 2), { mode: 0o600 });
    console.log(`\n✓ Secrets saved to temporary file: ${CONFIG.tempSecretsFile}`);
    console.log('⚠️  This file contains sensitive data and will be deleted after build completion');
    
    return CONFIG.tempSecretsFile;
  } catch (error) {
    console.error('Failed to save secrets to file:', error.message);
    throw error;
  }
}

/**
 * Cleanup function to remove temporary secrets file
 */
function cleanup() {
  try {
    if (fs.existsSync(CONFIG.tempSecretsFile)) {
      fs.unlinkSync(CONFIG.tempSecretsFile);
      console.log('✓ Temporary secrets file cleaned up');
    }
  } catch (error) {
    console.error('Warning: Failed to cleanup temporary secrets file:', error.message);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('AWS Secrets Manager Integration Script');
  console.log('='.repeat(60));
  
  try {
    // Validate environment
    validateEnvironment();
    
    // Parse bootstrap.yml (for future enhancement)
    parseBootstrapYml();
    
    // Retrieve secrets
    const { secrets, errors } = await retrieveFrontendSecrets();
    
    // Check for any retrieval errors
    if (errors.length > 0) {
      console.error('\n❌ Some secrets could not be retrieved:');
      errors.forEach(({ tokenName, error }) => {
        console.error(`  - ${tokenName}: ${error}`);
      });
      
      // Fail the build if critical secrets are missing
      const criticalSecrets = ['COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID', 'GRAPHQL_API_URL'];
      const missingCritical = errors.filter(e => criticalSecrets.includes(e.tokenName));
      
      if (missingCritical.length > 0) {
        console.error('\n❌ Critical secrets missing - build cannot continue');
        process.exit(1);
      } else {
        console.warn('\n⚠️  Non-critical secrets missing - continuing with partial configuration');
      }
    }
    
    // Save to temporary file
    const tempFile = saveSecretsToFile(secrets);
    
    console.log('\n✅ Secret retrieval completed successfully');
    console.log(`Environment: ${CONFIG.environment}`);
    console.log(`Retrieved ${Object.keys(secrets).length} configuration values`);
    
    // Setup cleanup on process exit
    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(1);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(1);
    });
    
  } catch (error) {
    console.error('\n❌ Secret retrieval failed:', error.message);
    cleanup();
    process.exit(1);
  }
}

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  retrieveFrontendSecrets,
  saveSecretsToFile,
  cleanup,
  CONFIG
};