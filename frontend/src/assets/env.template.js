// file: frontend/src/assets/env.template.js
// author: Corey Dale Peters
// date: 2025-06-20
// description: Runtime environment variable injection template for deployment

/**
 * Runtime Environment Configuration Template
 * 
 * This file will be processed by deployment scripts to inject
 * environment-specific variables at runtime.
 * 
 * Deployment process should:
 * 1. Copy this template to env.js 
 * 2. Replace ${VAR_NAME} placeholders with actual values
 * 3. Serve env.js alongside the application
 */

(function (window) {
  window.__env = window.__env || {};

  // Cognito Configuration
  window.__env['COGNITO_USER_POOL_ID'] = '${COGNITO_USER_POOL_ID}';
  window.__env['COGNITO_CLIENT_ID'] = '${COGNITO_CLIENT_ID}';
  window.__env['COGNITO_QR_ISSUER'] = '${COGNITO_QR_ISSUER}';

  // GraphQL API Configuration  
  window.__env['GRAPHQL_API_URL'] = '${GRAPHQL_API_URL}';
  window.__env['GRAPHQL_API_KEY'] = '${GRAPHQL_API_KEY}';
  
  // AWS Configuration
  window.__env['AWS_REGION'] = '${AWS_REGION}';
  
  // Environment
  window.__env['NODE_ENV'] = '${NODE_ENV}';
  
  // Optional: Application Configuration
  window.__env['APP_VERSION'] = '${APP_VERSION}';
  window.__env['BUILD_NUMBER'] = '${BUILD_NUMBER}';

})(this);