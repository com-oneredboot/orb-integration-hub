#!/usr/bin/env node

/**
 * Test script for the string replacement system
 * Creates mock secrets file and tests the replacement functionality
 */

const fs = require('fs');
const path = require('path');
const { replaceTokensInFile, findTargetFiles, loadSecrets, validateNoUnreplacedTokens, CONFIG } = require('./replace-secrets');

// Test configuration
const TEST_CONFIG = {
  testDir: path.join(__dirname, '../test-dist'),
  mockSecretsFile: path.join(__dirname, '../.secrets-temp.json'),
  testFiles: [
    'main.js',
    'environment.js',
    'config.json'
  ]
};

/**
 * Create mock secrets file
 */
function createMockSecrets() {
  const mockSecrets = {
    timestamp: new Date().toISOString(),
    environment: 'test',
    secrets: {
      COGNITO_USER_POOL_ID: 'test-pool-123',
      COGNITO_CLIENT_ID: 'test-client-456',
      COGNITO_QR_ISSUER: 'test-issuer',
      GRAPHQL_API_URL: 'https://test-api.amazonaws.com/graphql',
      AWS_REGION: 'us-east-1',
      GRAPHQL_API_KEY: 'test-api-key-789'
    }
  };

  fs.writeFileSync(TEST_CONFIG.mockSecretsFile, JSON.stringify(mockSecrets, null, 2));
  console.log('✓ Created mock secrets file');
}

/**
 * Create test files with placeholder tokens
 */
function createTestFiles() {
  // Create test directory
  if (fs.existsSync(TEST_CONFIG.testDir)) {
    fs.rmSync(TEST_CONFIG.testDir, { recursive: true });
  }
  fs.mkdirSync(TEST_CONFIG.testDir, { recursive: true });

  // Create main.js with tokens
  const mainJsContent = `
// Generated Angular build file
const environment = {
  production: false,
  cognito: {
    userPoolId: '{{COGNITO_USER_POOL_ID}}',
    clientId: '{{COGNITO_CLIENT_ID}}',
    qrIssuer: '{{COGNITO_QR_ISSUER}}'
  },
  graphql: {
    url: '{{GRAPHQL_API_URL}}',
    region: '{{AWS_REGION}}',
    apiKey: '{{GRAPHQL_API_KEY}}'
  }
};
console.log('Environment configured with:', environment);
`;

  // Create environment.js with tokens
  const environmentJsContent = `
export const environment = {
  cognito: {
    userPoolId: "{{COGNITO_USER_POOL_ID}}",
    clientId: "{{COGNITO_CLIENT_ID}}"
  },
  api: {
    url: "{{GRAPHQL_API_URL}}",
    key: "{{GRAPHQL_API_KEY}}"
  }
};
`;

  // Create config.json with tokens
  const configJsonContent = JSON.stringify({
    aws: {
      cognito: {
        userPoolId: "{{COGNITO_USER_POOL_ID}}",
        clientId: "{{COGNITO_CLIENT_ID}}"
      },
      graphql: {
        url: "{{GRAPHQL_API_URL}}",
        apiKey: "{{GRAPHQL_API_KEY}}"
      }
    },
    environment: "test"
  }, null, 2);

  // Write test files
  fs.writeFileSync(path.join(TEST_CONFIG.testDir, 'main.js'), mainJsContent);
  fs.writeFileSync(path.join(TEST_CONFIG.testDir, 'environment.js'), environmentJsContent);
  fs.writeFileSync(path.join(TEST_CONFIG.testDir, 'config.json'), configJsonContent);

  console.log('✓ Created test files with placeholder tokens');
}

/**
 * Test the replacement functionality
 */
function testReplacement() {
  console.log('\n🧪 Testing string replacement functionality...\n');

  // Override CONFIG for testing
  CONFIG.distDirectory = TEST_CONFIG.testDir;
  CONFIG.tempSecretsFile = TEST_CONFIG.mockSecretsFile;

  try {
    // Load secrets
    const secrets = loadSecrets();
    console.log('✓ Secrets loaded successfully');

    // Find target files
    const targetFiles = findTargetFiles(CONFIG.distDirectory);
    console.log(`✓ Found ${targetFiles.length} target files`);

    // Process each file
    let totalReplacements = 0;
    for (const filePath of targetFiles) {
      const hadReplacements = replaceTokensInFile(filePath, secrets);
      if (hadReplacements) {
        totalReplacements++;
      }
    }

    console.log(`✓ Processed ${totalReplacements} files with replacements`);

    // Validate no unreplaced tokens
    validateNoUnreplacedTokens();
    console.log('✓ No unreplaced tokens found');

    // Verify file contents
    const mainJsContent = fs.readFileSync(path.join(TEST_CONFIG.testDir, 'main.js'), 'utf8');
    if (mainJsContent.includes('test-pool-123') && !mainJsContent.includes('{{COGNITO_USER_POOL_ID}}')) {
      console.log('✓ Token replacement verified in main.js');
    } else {
      throw new Error('Token replacement failed in main.js');
    }

    const configJsonContent = fs.readFileSync(path.join(TEST_CONFIG.testDir, 'config.json'), 'utf8');
    if (configJsonContent.includes('test-api.amazonaws.com') && !configJsonContent.includes('{{GRAPHQL_API_URL}}')) {
      console.log('✓ Token replacement verified in config.json');
    } else {
      throw new Error('Token replacement failed in config.json');
    }

    console.log('\n✅ All tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    throw error;
  }
}

/**
 * Cleanup test files
 */
function cleanup() {
  try {
    if (fs.existsSync(TEST_CONFIG.testDir)) {
      fs.rmSync(TEST_CONFIG.testDir, { recursive: true });
    }
    if (fs.existsSync(TEST_CONFIG.mockSecretsFile)) {
      fs.unlinkSync(TEST_CONFIG.mockSecretsFile);
    }
    console.log('✓ Test cleanup completed');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error.message);
  }
}

/**
 * Main test execution
 */
function runTests() {
  console.log('='.repeat(50));
  console.log('STRING REPLACEMENT SYSTEM TESTS');
  console.log('='.repeat(50));

  try {
    createMockSecrets();
    createTestFiles();
    testReplacement();
    
    console.log('\n🎉 All string replacement tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Execute tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests };