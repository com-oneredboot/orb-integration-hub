/**
 * Organization Test Data Factory
 * 
 * Comprehensive test data factory for organizations feature testing in Angular frontend
 * providing isolated test environments, mock data generation, and test scenario management.
 * 
 * Author: Claude Code Assistant
 * Date: 2025-06-23
 */

import { Organizations } from '../models/OrganizationsModel';
import { OrganizationUsers } from '../models/OrganizationUsersModel';
import { Applications } from '../models/ApplicationsModel';
import { Users } from '../models/UsersModel';
import { OrganizationStatus } from '../enums/OrganizationStatusEnum';
import { OrganizationUserRole } from '../enums/OrganizationUserRoleEnum';
import { OrganizationUserStatus } from '../enums/OrganizationUserStatusEnum';
import { UserStatus } from '../enums/UserStatusEnum';
import { ApplicationStatus } from '../enums/ApplicationStatusEnum';

export interface TestOrganizationData {
  organization: Organizations;
  owner: Users;
  users: Users[];
  organizationUsers: OrganizationUsers[];
  applications: Applications[];
  metadata: {
    totalUsers: number;
    totalApplications: number;
    testSessionId: string;
    sizeCategory: string;
  };
}

export interface MultiOrgUserData {
  user: Users;
  memberships: OrganizationUsers[];
  organizationCount: number;
}

export interface RoleTestScenario {
  user: Users;
  membership: OrganizationUsers;
  expectedPermissions: string[];
  restrictedActions: string[];
}

/**
 * Factory for creating comprehensive test data for organizations feature
 */
export class OrganizationTestDataFactory {
  
  // Test environment isolation prefix
  private static readonly TEST_PREFIX = 'TEST_';
  
  // Test organization size categories
  private static readonly ORGANIZATION_SIZES = {
    small: { userCount: 5, appCount: 2 },
    medium: { userCount: 50, appCount: 10 },
    large: { userCount: 500, appCount: 50 },
    enterprise: { userCount: 1000, appCount: 100 }
  };
  
  private testSessionId: string;
  private createdResources: {
    organizations: string[];
    users: string[];
    organizationUsers: string[];
    applications: string[];
  };
  
  constructor(testSessionId?: string) {
    this.testSessionId = testSessionId || this.generateTestSessionId();
    this.createdResources = {
      organizations: [],
      users: [],
      organizationUsers: [],
      applications: []
    };
  }
  
  // =============================================================================
  // Organization Creation Methods
  // =============================================================================
  
  /**
   * Create a complete test organization with users and applications
   */
  createTestOrganization(options: {
    name?: string;
    size?: keyof typeof OrganizationTestDataFactory.ORGANIZATION_SIZES;
    status?: OrganizationStatus;
    ownerId?: string;
    includeInactiveUsers?: boolean;
  } = {}): TestOrganizationData {
    
    const {
      name,
      size = 'small',
      status = OrganizationStatus.Active,
      ownerId,
      includeInactiveUsers = false
    } = options;
    
    // Generate unique test organization
    const orgName = name || `${OrganizationTestDataFactory.TEST_PREFIX}Org_${this.testSessionId}_${this.generateId()}`;
    const orgId = `org_${this.generateId()}`;
    
    // Create owner user if not provided
    const owner = ownerId ? 
      this.createTestUser({ userId: ownerId, email: `owner_${orgId}@test.com` }) :
      this.createTestUser({ email: `owner_${orgId}@test.com` });
    
    // Create organization
    const organization = this.createOrganizationRecord({
      organizationId: orgId,
      name: orgName,
      ownerId: owner.userId,
      status
    });
    
    // Create additional users based on size
    const sizeConfig = OrganizationTestDataFactory.ORGANIZATION_SIZES[size];
    const users: Users[] = [];
    const organizationUsers: OrganizationUsers[] = [];
    
    // Note: Organization ownership is determined by userId matching organization.ownerId
    // The owner doesn't need an OrganizationUsers record as they own the organization
    // They can invite users with ADMINISTRATOR or VIEWER roles
    
    // Create additional users
    for (let i = 0; i < sizeConfig.userCount - 1; i++) {
      const user = this.createTestUser({
        email: `user_${i}_${orgId}@test.com`
      });
      users.push(user);
      
      // Determine user status
      const userStatus = includeInactiveUsers && i % 5 === 0 ? 
        OrganizationUserStatus.Inactive : OrganizationUserStatus.Active;
      
      // Determine role (only ADMINISTRATOR and VIEWER are valid)
      const role = i === 0 ? OrganizationUserRole.Administrator : OrganizationUserRole.Viewer;
      
      organizationUsers.push(this.createOrganizationUserRecord({
        userId: user.userId,
        organizationId: orgId,
        role,
        status: userStatus
      }));
    }
    
    // Create applications
    const applications: Applications[] = [];
    for (let i = 0; i < sizeConfig.appCount; i++) {
      applications.push(this.createTestApplication({
        organizationId: orgId,
        name: `TestApp_${i}_${orgId}`
      }));
    }
    
    // Track created resources
    this.createdResources.organizations.push(orgId);
    
    return {
      organization,
      owner,
      users,
      organizationUsers,
      applications,
      metadata: {
        totalUsers: sizeConfig.userCount,
        totalApplications: sizeConfig.appCount,
        testSessionId: this.testSessionId,
        sizeCategory: size
      }
    };
  }
  
  /**
   * Create a user that belongs to multiple organizations
   */
  createMultiOrganizationUser(options: {
    organizationIds: string[];
    baseEmail?: string;
    roles?: Record<string, OrganizationUserRole>;
  }): MultiOrgUserData {
    
    const { organizationIds, baseEmail, roles = {} } = options;
    const userId = `user_${this.generateId()}`;
    const email = baseEmail || `multiorg_${userId}@test.com`;
    
    // Create base user
    const user = this.createTestUser({ userId, email });
    
    // Create organization memberships
    const memberships: OrganizationUsers[] = [];
    organizationIds.forEach(orgId => {
      const role = roles[orgId] || OrganizationUserRole.Viewer;
      memberships.push(this.createOrganizationUserRecord({
        userId,
        organizationId: orgId,
        role,
        status: OrganizationUserStatus.Active
      }));
    });
    
    return {
      user,
      memberships,
      organizationCount: organizationIds.length
    };
  }
  
  /**
   * Create organization hierarchy for complex testing
   */
  createOrganizationHierarchy(options: {
    levels?: number;
    childrenPerLevel?: number;
  } = {}): {
    hierarchy: TestOrganizationData[];
    metadata: {
      levels: number;
      childrenPerLevel: number;
      totalOrganizations: number;
    };
  } {
    
    const { levels = 3, childrenPerLevel = 3 } = options;
    
    const createLevel = (level: number, remainingLevels: number): TestOrganizationData[] => {
      const organizations: TestOrganizationData[] = [];
      
      for (let i = 0; i < childrenPerLevel; i++) {
        const org = this.createTestOrganization({
          name: `Level${level}_Org${i}_${this.testSessionId}`,
          size: 'small'
        });
        organizations.push(org);
        
        if (remainingLevels > 0) {
          createLevel(level + 1, remainingLevels - 1);
        }
      }
      
      return organizations;
    };
    
    const hierarchy = createLevel(1, levels - 1);
    const totalOrganizations = Array.from({ length: levels }, (_, i) => childrenPerLevel ** (i + 1))
      .reduce((sum, count) => sum + count, 0);
    
    return {
      hierarchy,
      metadata: {
        levels,
        childrenPerLevel,
        totalOrganizations
      }
    };
  }
  
  // =============================================================================
  // Edge Case and Security Test Data
  // =============================================================================
  
  /**
   * Create organizations with edge case scenarios
   */
  createEdgeCaseOrganizations(): Record<string, TestOrganizationData> {
    const edgeCases: Record<string, TestOrganizationData> = {};
    
    // Organization with maximum field lengths
    edgeCases['maxLength'] = this.createTestOrganization({
      name: 'A'.repeat(255), // Maximum name length
      size: 'small'
    });
    
    // Organization with minimum valid data
    edgeCases['minimal'] = this.createTestOrganization({
      name: 'A', // Minimum name length
      size: 'small'
    });
    
    // Organization with special characters
    edgeCases['specialChars'] = this.createTestOrganization({
      name: 'Test-Org_123!@#$%^&*()',
      size: 'small'
    });
    
    // Organization with Unicode characters
    edgeCases['unicode'] = this.createTestOrganization({
      name: '测试组织_テスト_🏢',
      size: 'small'
    });
    
    // Organizations in different statuses
    Object.values(OrganizationStatus).forEach(status => {
      edgeCases[`status_${status.toLowerCase()}`] = this.createTestOrganization({
        name: `Status_${status}_Org`,
        status,
        size: 'small'
      });
    });
    
    return edgeCases;
  }
  
  /**
   * Create organizations with security-focused test scenarios
   */
  createSecurityTestOrganizations(): Record<string, TestOrganizationData> {
    const securityTests: Record<string, TestOrganizationData> = {};
    
    // XSS injection attempts
    securityTests['xssInjection'] = this.createTestOrganization({
      name: '<script>alert("xss")</script>',
      size: 'small'
    });
    
    // SQL injection attempts
    securityTests['sqlInjection'] = this.createTestOrganization({
      name: '\'; DROP TABLE organizations; --',
      size: 'small'
    });
    
    // Path traversal attempts
    securityTests['pathTraversal'] = this.createTestOrganization({
      name: '../../etc/passwd',
      size: 'small'
    });
    
    // LDAP injection attempts
    securityTests['ldapInjection'] = this.createTestOrganization({
      name: '*)(uid=*))(|(uid=*',
      size: 'small'
    });
    
    // Command injection attempts
    securityTests['commandInjection'] = this.createTestOrganization({
      name: 'test; rm -rf /',
      size: 'small'
    });
    
    return securityTests;
  }
  
  /**
   * Create comprehensive role-based testing scenarios
   */
  createRoleBasedTestScenarios(): Record<string, RoleTestScenario> {
    const scenarios: Record<string, RoleTestScenario> = {};
    
    // Create test organization
    const testOrg = this.createTestOrganization({
      name: `RoleBased_Org_${this.testSessionId}`,
      size: 'medium'
    });
    const orgId = testOrg.organization.organizationId;
    
    // Define role permissions mapping (only ADMINISTRATOR and VIEWER are valid roles)
    const rolePermissions: Record<OrganizationUserRole, {
      permissions: string[];
      restrictions: string[];
    }> = {
      [OrganizationUserRole.Administrator]: {
        permissions: ['MANAGE_APPS', 'VIEW_APPS', 'INVITE_USERS'],
        restrictions: ['DELETE_ORG', 'VIEW_BILLING', 'MANAGE_ORG']
      },
      [OrganizationUserRole.Viewer]: {
        permissions: ['VIEW_APPS'],
        restrictions: ['MANAGE_APPS', 'INVITE_USERS', 'DELETE_ORG', 'VIEW_BILLING', 'MANAGE_ORG']
      }
    };
    
    // Create scenarios for each role
    Object.values(OrganizationUserRole).forEach(role => {
      const user = this.createTestUser({
        email: `${role.toLowerCase()}@test.com`
      });
      
      const membership = this.createOrganizationUserRecord({
        userId: user.userId,
        organizationId: orgId,
        role,
        status: OrganizationUserStatus.Active
      });
      
      const roleConfig = rolePermissions[role];
      scenarios[role.toLowerCase()] = {
        user,
        membership,
        expectedPermissions: roleConfig.permissions,
        restrictedActions: roleConfig.restrictions
      };
    });
    
    return scenarios;
  }
  
  // =============================================================================
  // Performance Test Data
  // =============================================================================
  
  /**
   * Create large dataset for performance testing
   */
  createPerformanceTestData(options: {
    organizationCount?: number;
    maxUsersPerOrg?: number;
  } = {}): TestOrganizationData[] {
    
    const { organizationCount = 100 } = options;
    const organizations: TestOrganizationData[] = [];
    
    for (let i = 0; i < organizationCount; i++) {
      // Vary organization sizes for realistic performance testing
      let size: keyof typeof OrganizationTestDataFactory.ORGANIZATION_SIZES;
      
      if (i % 20 === 0) { // 5% enterprise
        size = 'enterprise';
      } else if (i % 10 === 0) { // 10% large
        size = 'large';
      } else if (i % 5 === 0) { // 20% medium
        size = 'medium';
      } else { // 65% small
        size = 'small';
      }
      
      const org = this.createTestOrganization({
        name: `PerfTest_Org_${i.toString().padStart(4, '0')}`,
        size
      });
      
      organizations.push(org);
      
      // Progress logging for large datasets
      if ((i + 1) % 10 === 0) {
        console.log(`Created ${i + 1}/${organizationCount} performance test organizations`);
      }
    }
    
    return organizations;
  }
  
  // =============================================================================
  // Individual Entity Creation Methods
  // =============================================================================
  
  /**
   * Create a test user
   */
  createTestUser(options: {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    status?: UserStatus;
    groups?: string[];
  } = {}): Users {
    
    const userId = options.userId || `user_${this.generateId()}`;
    const email = options.email || `testuser_${userId}@test.com`;
    
    const user: Users = {
      userId,
      cognitoId: `cognito_${userId}`,
      cognitoSub: `sub_${userId}`,
      email,
      emailVerified: true,
      phoneNumber: `+1555${userId.slice(-7)}`,
      phoneVerified: true,
      firstName: options.firstName || 'Test',
      lastName: options.lastName || `User_${userId.slice(-4)}`,
      groups: options.groups || ['USER'],
      status: options.status || UserStatus.Active,
      mfaEnabled: false,
      mfaSetupComplete: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.createdResources.users.push(userId);
    return user;
  }
  
  /**
   * Create a test application
   */
  createTestApplication(options: {
    organizationId: string;
    name?: string;
    ownerId?: string;
    status?: ApplicationStatus;
  }): Applications {
    
    const appId = `app_${this.generateId()}`;
    const app: Applications = {
      applicationId: appId,
      organizationId: options.organizationId,
      name: options.name || `TestApp_${appId}`,
      ownerId: options.ownerId || `owner_${this.generateId()}`,
      status: options.status || ApplicationStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
      apiKey: `apikey_${this.generateId()}`,
      environments: ['dev', 'staging', 'prod']
    };
    
    this.createdResources.applications.push(appId);
    return app;
  }
  
  // =============================================================================
  // Mock Response Generators
  // =============================================================================
  
  /**
   * Create mock GraphQL responses for organization queries
   */
  createMockGraphQLResponses(): Record<string, any> {
    const testOrg = this.createTestOrganization();
    
    return {
      getOrganizations: {
        data: {
          getOrganizations: [testOrg.organization]
        }
      },
      getOrganizationUsers: {
        data: {
          getOrganizationUsers: testOrg.organizationUsers
        }
      },
      createOrganization: {
        data: {
          createOrganization: testOrg.organization
        }
      },
      updateOrganization: {
        data: {
          updateOrganization: {
            ...testOrg.organization,
            updatedAt: new Date()
          }
        }
      },
      deleteOrganization: {
        data: {
          deleteOrganization: {
            success: true,
            organizationId: testOrg.organization.organizationId
          }
        }
      },
      inviteUser: {
        data: {
          inviteUserToOrganization: {
            success: true,
            invitationId: `invite_${this.generateId()}`
          }
        }
      }
    };
  }
  
  /**
   * Create mock error responses
   */
  createMockErrorResponses(): Record<string, any> {
    return {
      organizationNotFound: {
        errors: [{
          message: 'Organization not found',
          extensions: {
            code: 'ORGANIZATION_NOT_FOUND',
            organizationId: 'non-existent-org'
          }
        }]
      },
      unauthorizedAccess: {
        errors: [{
          message: 'Unauthorized access to organization',
          extensions: {
            code: 'UNAUTHORIZED_ACCESS'
          }
        }]
      },
      validationError: {
        errors: [{
          message: 'Validation failed',
          extensions: {
            code: 'VALIDATION_ERROR',
            validationErrors: {
              name: 'Organization name is required',
              ownerId: 'Invalid owner ID format'
            }
          }
        }]
      },
      rateLimited: {
        errors: [{
          message: 'Rate limit exceeded',
          extensions: {
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 60
          }
        }]
      }
    };
  }
  
  // =============================================================================
  // Helper Methods
  // =============================================================================
  
  private createOrganizationRecord(options: {
    organizationId: string;
    name: string;
    ownerId: string;
    status: OrganizationStatus;
    description?: string;
  }): Organizations {
    
    const org: Organizations = {
      organizationId: options.organizationId,
      name: options.name,
      description: options.description || `Test organization ${options.name}`,
      ownerId: options.ownerId,
      status: options.status,
      createdAt: new Date(),
      updatedAt: new Date(),
      kmsKeyId: `kms_key_${options.organizationId}`,
      kmsKeyArn: `arn:aws:kms:us-east-1:123456789012:key/kms_key_${options.organizationId}`,
      kmsAlias: `alias/org-${options.organizationId}`
    };
    
    return org;
  }
  
  private createOrganizationUserRecord(options: {
    userId: string;
    organizationId: string;
    role: OrganizationUserRole;
    status: OrganizationUserStatus;
    invitedBy?: string;
  }): OrganizationUsers {
    
    const membership: OrganizationUsers = {
      userId: options.userId,
      organizationId: options.organizationId,
      role: options.role,
      status: options.status,
      invitedBy: options.invitedBy || 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const membershipKey = `${options.userId}#${options.organizationId}`;
    this.createdResources.organizationUsers.push(membershipKey);
    
    return membership;
  }
  
  private generateTestSessionId(): string {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    const randomPart = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substr(0, 8);
    return `test_${Date.now()}_${randomPart}`;
  }
  
  private generateId(): string {
    const array = new Uint8Array(12);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').substr(0, 16);
  }
  
  // =============================================================================
  // Test Environment Management
  // =============================================================================
  
  /**
   * Create comprehensive test environment
   */
  seedComprehensiveTestEnvironment(): {
    sessionId: string;
    createdAt: string;
    scenarios: Record<string, any>;
  } {
    
    const environment: {
      sessionId: string;
      createdAt: string;
      scenarios: Record<string, any>;
    } = {
      sessionId: this.testSessionId,
      createdAt: new Date().toISOString(),
      scenarios: {} as Record<string, any>
    };
    
    // Basic organization scenarios
    environment.scenarios['basic'] = {
      smallOrg: this.createTestOrganization({ size: 'small' }),
      mediumOrg: this.createTestOrganization({ size: 'medium' }),
      largeOrg: this.createTestOrganization({ size: 'large' })
    };
    
    // Multi-organization user scenarios
    const orgIds = [
      environment.scenarios['basic'].smallOrg.organization.organizationId,
      environment.scenarios['basic'].mediumOrg.organization.organizationId
    ];
    environment.scenarios['multiOrgUser'] = this.createMultiOrganizationUser({
      organizationIds: orgIds,
      roles: {
        [orgIds[0]]: OrganizationUserRole.Administrator,
        [orgIds[1]]: OrganizationUserRole.Viewer
      }
    });
    
    // Edge case scenarios
    environment.scenarios['edgeCases'] = this.createEdgeCaseOrganizations();
    
    // Security test scenarios
    environment.scenarios['securityTests'] = this.createSecurityTestOrganizations();
    
    // Role-based scenarios
    environment.scenarios['roleBased'] = this.createRoleBasedTestScenarios();
    
    // Mock API responses
    environment.scenarios['mockResponses'] = {
      success: this.createMockGraphQLResponses(),
      errors: this.createMockErrorResponses()
    };
    
    return environment;
  }
  
  /**
   * Get test environment summary
   */
  getTestEnvironmentSummary(): {
    sessionId: string;
    resourceCounts: Record<string, number>;
    totalResources: number;
  } {
    
    const resourceCounts = Object.fromEntries(
      Object.entries(this.createdResources)
        .map(([type, ids]) => [type, ids.length])
    );
    
    return {
      sessionId: this.testSessionId,
      resourceCounts,
      totalResources: Object.values(resourceCounts).reduce((sum, count) => sum + count, 0)
    };
  }
  
  /**
   * Reset test environment
   */
  resetTestEnvironment(): void {
    this.createdResources = {
      organizations: [],
      users: [],
      organizationUsers: [],
      applications: []
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create isolated test environment for specific test
 */
export function createIsolatedTestEnvironment(testName: string): OrganizationTestDataFactory {
  return new OrganizationTestDataFactory(`${testName}_${Date.now()}`);
}

/**
 * Create standard test organizations for common scenarios
 */
export function createStandardTestOrganizations(): ReturnType<OrganizationTestDataFactory['seedComprehensiveTestEnvironment']> {
  const factory = new OrganizationTestDataFactory();
  return factory.seedComprehensiveTestEnvironment();
}