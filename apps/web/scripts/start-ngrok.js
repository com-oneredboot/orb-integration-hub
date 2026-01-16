#!/usr/bin/env node

/**
 * Start ngrok tunnel for local development
 * 
 * This script starts an ngrok tunnel to expose the local Angular dev server
 * for testing on mobile devices or sharing with teammates.
 * 
 * Usage:
 *   node scripts/start-ngrok.js [port]
 * 
 * Prerequisites:
 *   - ngrok installed and authenticated
 *   - Reserved domain configured in ngrok account
 */

const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  port: process.argv[2] || 4200,
  // Reserved ngrok domains for orb-integration-hub
  domains: {
    primary: 'tameka-overhonest-carefully.ngrok-free.dev',
    secondary: 'tameka-overhonest-selfishly.ngrok-free.dev'
  }
};

async function checkNgrokInstalled() {
  return new Promise((resolve) => {
    const check = spawn('ngrok', ['version'], { shell: true });
    check.on('close', (code) => resolve(code === 0));
    check.on('error', () => resolve(false));
  });
}

async function startNgrok() {
  console.log('============================================================');
  console.log('🚀 Starting ngrok tunnel');
  console.log('============================================================');
  console.log(`Local port: ${CONFIG.port}`);
  console.log(`Domain: ${CONFIG.domains.primary}`);
  console.log('');

  // Check if ngrok is installed
  const isInstalled = await checkNgrokInstalled();
  if (!isInstalled) {
    console.error('❌ ngrok is not installed or not in PATH');
    console.log('');
    console.log('To install ngrok:');
    console.log('  brew install ngrok/ngrok/ngrok  (macOS)');
    console.log('  snap install ngrok              (Linux)');
    console.log('  choco install ngrok             (Windows)');
    console.log('');
    console.log('Then authenticate:');
    console.log('  ngrok config add-authtoken YOUR_AUTH_TOKEN');
    process.exit(1);
  }

  // Start ngrok with reserved domain
  const ngrok = spawn('ngrok', [
    'http',
    CONFIG.port.toString(),
    '--domain', CONFIG.domains.primary
  ], {
    stdio: 'inherit',
    shell: true
  });

  ngrok.on('error', (error) => {
    console.error('❌ Failed to start ngrok:', error.message);
    process.exit(1);
  });

  ngrok.on('close', (code) => {
    if (code !== 0) {
      console.log(`ngrok exited with code ${code}`);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping ngrok...');
    ngrok.kill('SIGINT');
    process.exit(0);
  });

  console.log('✅ ngrok tunnel started!');
  console.log('');
  console.log('📱 Public URL:');
  console.log(`   https://${CONFIG.domains.primary}`);
  console.log('');
  console.log('⚠️  Note: You may need to add this URL to Cognito allowed callbacks');
  console.log('   if testing authentication flows.');
  console.log('');
  console.log('Press Ctrl+C to stop the tunnel.');
}

startNgrok().catch(error => {
  console.error('❌ Error:', error.message);
  process.exit(1);
});
