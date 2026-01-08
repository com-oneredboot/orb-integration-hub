#!/usr/bin/env node
// file: frontend/scripts/validate-debug-mode.js
// author: Claude Code  
// date: 2025-06-21
// description: Validation script to ensure debug mode is properly configured for different environments

const fs = require('fs');
const path = require('path');

// ANSI colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateEnvironmentFile(filePath, expectedDebugMode, environmentName) {
  try {
    if (!fs.existsSync(filePath)) {
      log(`❌ ${environmentName} environment file not found: ${filePath}`, 'red');
      return false;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check if debugMode is properly configured
    const debugModeMatch = content.match(/debugMode:\s*(true|false)/);
    
    if (!debugModeMatch) {
      log(`❌ ${environmentName} environment missing debugMode configuration`, 'red');
      return false;
    }

    const actualDebugMode = debugModeMatch[1] === 'true';
    
    if (actualDebugMode === expectedDebugMode) {
      log(`✅ ${environmentName} environment: debugMode = ${actualDebugMode} ✓`, 'green');
      return true;
    } else {
      log(`❌ ${environmentName} environment: debugMode = ${actualDebugMode} (expected: ${expectedDebugMode})`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error validating ${environmentName} environment: ${error.message}`, 'red');
    return false;
  }
}

function validateAuthState() {
  const authStatePath = path.join(__dirname, '../src/app/features/user/components/auth-flow/store/auth.state.ts');
  
  try {
    if (!fs.existsSync(authStatePath)) {
      log('❌ auth.state.ts file not found', 'red');
      return false;
    }

    const content = fs.readFileSync(authStatePath, 'utf8');
    
    // Check if hardcoded debugMode is removed
    const hardcodedDebugMatch = content.match(/debugMode:\s*true/);
    if (hardcodedDebugMatch) {
      log('❌ auth.state.ts still contains hardcoded debugMode: true', 'red');
      return false;
    }

    // Check if environment.debugMode is used
    const environmentDebugMatch = content.match(/debugMode:\s*environment\.debugMode/);
    if (environmentDebugMatch) {
      log('✅ auth.state.ts uses environment.debugMode configuration ✓', 'green');
      return true;
    } else {
      log('❌ auth.state.ts does not use environment.debugMode', 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error validating auth.state.ts: ${error.message}`, 'red');
    return false;
  }
}

function validateAngularConfig() {
  const angularConfigPath = path.join(__dirname, '../angular.json');
  
  try {
    if (!fs.existsSync(angularConfigPath)) {
      log('❌ angular.json file not found', 'red');
      return false;
    }

    const content = fs.readFileSync(angularConfigPath, 'utf8');
    const config = JSON.parse(content);
    
    // Check production file replacement
    const prodConfig = config.projects['orb-integration-hub']?.architect?.build?.configurations?.production;
    if (!prodConfig?.fileReplacements?.some(fr => 
      fr.replace.includes('environment.ts') && fr.with.includes('environment.prod.ts')
    )) {
      log('❌ Production build configuration missing environment.prod.ts file replacement', 'red');
      return false;
    }

    log('✅ Angular build configuration properly set for production environment ✓', 'green');
    return true;
  } catch (error) {
    log(`❌ Error validating angular.json: ${error.message}`, 'red');
    return false;
  }
}

function main() {
  log('🔍 Debug Mode Configuration Validation', 'bold');
  log('=====================================', 'blue');
  
  const results = [];
  
  // Validate environment files
  results.push(validateEnvironmentFile(
    path.join(__dirname, '../src/environments/environment.ts'),
    false,
    'Default'
  ));
  
  results.push(validateEnvironmentFile(
    path.join(__dirname, '../src/environments/environment.local.ts'),
    true,
    'Local Development'
  ));
  
  results.push(validateEnvironmentFile(
    path.join(__dirname, '../src/environments/environment.prod.ts'),
    false,
    'Production'
  ));
  
  // Validate auth state configuration
  results.push(validateAuthState());
  
  // Validate Angular configuration
  results.push(validateAngularConfig());
  
  log('', 'reset');
  
  const allPassed = results.every(result => result);
  if (allPassed) {
    log('🎉 All debug mode configurations are valid!', 'green');
    log('✅ Production builds will have debug mode disabled', 'green');
    log('✅ Development builds will have debug mode enabled', 'green');
    process.exit(0);
  } else {
    log('❌ Debug mode configuration validation failed!', 'red');
    log('⚠️  Fix the issues above before deploying to production', 'yellow');
    process.exit(1);
  }
}

main();