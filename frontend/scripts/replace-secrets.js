#!/usr/bin/env node

/**
 * Build-Time String Replacement System
 * 
 * This script reads the temporary secrets JSON file created by secrets-retrieval.js
 * and performs string replacement of placeholder tokens with actual secret values
 * in the built Angular files.
 * 
 * Usage:
 *   node scripts/replace-secrets.js [environment]
 *   
 * Environment: dev (default), staging, prod
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  environment: process.argv[2] || process.env.ENVIRONMENT || 'dev',
  distDirectory: path.join(__dirname, '../dist'),
  tempSecretsFile: path.join(__dirname, '../.secrets-temp.json'),
  // File extensions to process for token replacement
  targetExtensions: ['.js', '.mjs', '.json', '.html', '.css'],
  // Token pattern to match
  tokenPattern: /\{\{([A-Z_]+)\}\}/g
};

/**
 * Statistics tracking for replacement operations
 */
const stats = {
  filesProcessed: 0,
  filesWithReplacements: 0,
  totalReplacements: 0,
  tokenReplacements: {},
  unreplacedTokens: new Set(),
  errors: []
};

/**
 * Load secrets from temporary JSON file
 */
function loadSecrets() {
  try {
    if (!fs.existsSync(CONFIG.tempSecretsFile)) {
      throw new Error(`Temporary secrets file not found: ${CONFIG.tempSecretsFile}`);
    }

    const secretsData = fs.readFileSync(CONFIG.tempSecretsFile, 'utf8');
    const parsedData = JSON.parse(secretsData);
    
    console.log(`✓ Loaded secrets from: ${CONFIG.tempSecretsFile}`);
    console.log(`  Environment: ${parsedData.environment}`);
    console.log(`  Timestamp: ${parsedData.timestamp}`);
    console.log(`  Available secrets: ${Object.keys(parsedData.secrets).length}`);
    
    return parsedData.secrets;
    
  } catch (error) {
    console.error('❌ Failed to load secrets:', error.message);
    throw error;
  }
}

/**
 * Recursively find all files to process in the dist directory
 */
function findTargetFiles(directory) {
  const targetFiles = [];
  
  try {
    const items = fs.readdirSync(directory);
    
    for (const item of items) {
      const fullPath = path.join(directory, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively process subdirectories
        targetFiles.push(...findTargetFiles(fullPath));
      } else if (stat.isFile()) {
        // Check if file extension should be processed
        const ext = path.extname(fullPath);
        if (CONFIG.targetExtensions.includes(ext)) {
          targetFiles.push(fullPath);
        }
      }
    }
    
    return targetFiles;
    
  } catch (error) {
    console.error(`❌ Error reading directory ${directory}:`, error.message);
    stats.errors.push({ directory, error: error.message });
    return [];
  }
}

/**
 * Replace tokens in a single file
 */
function replaceTokensInFile(filePath, secrets) {
  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    let modifiedContent = originalContent;
    let fileReplacementCount = 0;
    
    // Find all tokens in the file
    const tokens = [...originalContent.matchAll(CONFIG.tokenPattern)];
    
    if (tokens.length === 0) {
      // No tokens found, skip this file
      return false;
    }
    
    console.log(`  Processing: ${path.relative(CONFIG.distDirectory, filePath)} (${tokens.length} tokens)`);
    
    // Replace each token
    for (const match of tokens) {
      const fullToken = match[0]; // e.g., "{{COGNITO_USER_POOL_ID}}"
      const tokenName = match[1]; // e.g., "COGNITO_USER_POOL_ID"
      
      if (secrets.hasOwnProperty(tokenName)) {
        const secretValue = secrets[tokenName];
        modifiedContent = modifiedContent.replace(fullToken, secretValue);
        
        // Track statistics
        fileReplacementCount++;
        stats.totalReplacements++;
        stats.tokenReplacements[tokenName] = (stats.tokenReplacements[tokenName] || 0) + 1;
        
        console.log(`    ✓ Replaced ${tokenName}`);
        
      } else {
        console.warn(`    ⚠️  No secret found for token: ${tokenName}`);
        stats.unreplacedTokens.add(tokenName);
      }
    }
    
    // Write the modified content back to the file
    if (fileReplacementCount > 0) {
      fs.writeFileSync(filePath, modifiedContent, 'utf8');
      stats.filesWithReplacements++;
      console.log(`    ✅ Replaced ${fileReplacementCount} tokens in file`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ Error processing file ${filePath}:`, error.message);
    stats.errors.push({ file: filePath, error: error.message });
    return false;
  }
}

/**
 * Validate that the dist directory exists
 */
function validateDistDirectory() {
  if (!fs.existsSync(CONFIG.distDirectory)) {
    throw new Error(`Distribution directory not found: ${CONFIG.distDirectory}`);
  }
  
  const distStat = fs.statSync(CONFIG.distDirectory);
  if (!distStat.isDirectory()) {
    throw new Error(`Distribution path is not a directory: ${CONFIG.distDirectory}`);
  }
  
  console.log(`✓ Distribution directory found: ${CONFIG.distDirectory}`);
}

/**
 * Clean up temporary secrets file
 */
function cleanupTempFile() {
  try {
    if (fs.existsSync(CONFIG.tempSecretsFile)) {
      fs.unlinkSync(CONFIG.tempSecretsFile);
      console.log('✓ Temporary secrets file cleaned up');
    }
  } catch (error) {
    console.warn('⚠️  Failed to cleanup temporary secrets file:', error.message);
  }
}

/**
 * Validate that no unreplaced tokens remain in the build
 */
function validateNoUnreplacedTokens() {
  console.log('\n🔍 Validating no unreplaced tokens remain...');
  
  const allFiles = findTargetFiles(CONFIG.distDirectory);
  const remainingTokens = new Set();
  
  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const tokens = [...content.matchAll(CONFIG.tokenPattern)];
      
      for (const match of tokens) {
        remainingTokens.add(match[1]);
        console.error(`❌ Unreplaced token found: ${match[1]} in ${path.relative(CONFIG.distDirectory, filePath)}`);
      }
    } catch (error) {
      console.warn(`⚠️  Could not validate file: ${filePath}`);
    }
  }
  
  if (remainingTokens.size > 0) {
    throw new Error(`Build validation failed: ${remainingTokens.size} unreplaced tokens found: ${Array.from(remainingTokens).join(', ')}`);
  }
  
  console.log('✅ No unreplaced tokens found - build validation passed');
}

/**
 * Print replacement statistics
 */
function printStatistics() {
  console.log('\n' + '='.repeat(60));
  console.log('STRING REPLACEMENT STATISTICS');
  console.log('='.repeat(60));
  
  console.log(`Environment: ${CONFIG.environment}`);
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files with replacements: ${stats.filesWithReplacements}`);
  console.log(`Total replacements: ${stats.totalReplacements}`);
  
  if (Object.keys(stats.tokenReplacements).length > 0) {
    console.log('\nToken replacement counts:');
    for (const [token, count] of Object.entries(stats.tokenReplacements)) {
      console.log(`  ${token}: ${count} replacements`);
    }
  }
  
  if (stats.unreplacedTokens.size > 0) {
    console.log('\n⚠️  Unreplaced tokens:');
    for (const token of stats.unreplacedTokens) {
      console.log(`  - ${token}`);
    }
  }
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    for (const error of stats.errors) {
      console.log(`  - ${error.file || error.directory}: ${error.error}`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('BUILD-TIME STRING REPLACEMENT SYSTEM');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Validate dist directory exists
    validateDistDirectory();
    
    // Step 2: Load secrets from temporary file
    const secrets = loadSecrets();
    
    // Step 3: Find all target files to process
    console.log('\n🔍 Finding target files...');
    const targetFiles = findTargetFiles(CONFIG.distDirectory);
    stats.filesProcessed = targetFiles.length;
    
    console.log(`Found ${targetFiles.length} files to process`);
    console.log(`Target extensions: ${CONFIG.targetExtensions.join(', ')}`);
    
    if (targetFiles.length === 0) {
      console.warn('⚠️  No target files found for processing');
      return;
    }
    
    // Step 4: Process each file for token replacement
    console.log('\n🔄 Processing files for token replacement...\n');
    
    for (const filePath of targetFiles) {
      replaceTokensInFile(filePath, secrets);
    }
    
    // Step 5: Validate no unreplaced tokens remain
    validateNoUnreplacedTokens();
    
    // Step 6: Print statistics
    printStatistics();
    
    // Step 7: Cleanup temporary file
    cleanupTempFile();
    
    console.log('\n✅ String replacement completed successfully!');
    
    // Exit with error if there were unreplaced tokens or errors
    if (stats.unreplacedTokens.size > 0 || stats.errors.length > 0) {
      console.error('\n❌ Build completed with warnings/errors');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ String replacement failed:', error.message);
    cleanupTempFile();
    process.exit(1);
  }
}

// Setup cleanup on process exit
process.on('exit', cleanupTempFile);
process.on('SIGINT', () => {
  cleanupTempFile();
  process.exit(1);
});
process.on('SIGTERM', () => {
  cleanupTempFile();
  process.exit(1);
});

// Execute if called directly
if (require.main === module) {
  main();
}

module.exports = {
  replaceTokensInFile,
  findTargetFiles,
  loadSecrets,
  validateNoUnreplacedTokens,
  CONFIG
};