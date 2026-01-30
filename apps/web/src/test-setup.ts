/**
 * Test Setup File
 *
 * This file is loaded before any tests run.
 * It configures the test environment including Amplify mock configuration.
 *
 * @see .kiro/specs/fix-graphql-service-tests/design.md
 */

import { setupTestEnvironment } from './app/core/testing/api-service.testing';

// Configure Amplify before any tests run
setupTestEnvironment();
