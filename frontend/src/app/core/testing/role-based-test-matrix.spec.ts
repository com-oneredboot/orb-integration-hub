/**
 * Role-Based Testing Matrix for Frontend
 * 
 * Angular test suite for comprehensive role-based permission testing
 * covering Organization ownership and Application role scenarios.
 * 
 * Author: Claude Code Assistant
 * Date: 2025-06-23
 */

import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { OrganizationUserRole } from '../models/OrganizationUserRoleEnum';
import { OrganizationUserStatus } from '../models/OrganizationUserStatusEnum';
import { OrganizationStatus } from '../models/OrganizationStatusEnum';
import { CognitoService } from '../services/cognito.service';
import { UserService } from '../services/user.service';
import { SecurityTestUtils } from './security-test-utils';
import { OrganizationTestDataFactory } from './organization-test-data.factory';

export interface PermissionTestScenario {
  scenarioId: string;
  description: string;
  userRole?: OrganizationUserRole;
  isOrganizationOwner?: boolean;
  userStatus: OrganizationUserStatus;
  organizationStatus: OrganizationStatus;
  action: string;
  expectedResult: boolean;
  context?: Record<string, any>;
}

export interface RolePermissionMatrix {
  [key: string]: {
    permissions: string[];
    restrictions: string[];
    canModifyRoles?: string[];
    cannotModifyRoles?: string[];
  };
}

/**
 * Comprehensive role-based testing matrix
 * Supports both Organization ownership and Application roles
 */
export class RoleBasedTestMatrix {
  
  // Organization Owner permissions (user_id matches organization.ownerId)
  private organizationOwnerPermissions = {
    permissions: [
      'view-organization', 'manage-organization', 'delete-organization', 
      'transfer-ownership', 'view-billing', 'manage-billing',
      'invite-user', 'remove-user', 'change-user-role', 'view-users',
      'create-application', 'view-application', 'manage-application', 'delete-application',
      'view-audit-logs', 'manage-security-settings', 'manage-compliance'
    ],
    restrictions: [],
    canModifyRoles: ['ADMINISTRATOR', 'VIEWER'],
    cannotModifyRoles: []
  };

  // Application role permissions matrix
  private applicationRoleMatrix: RolePermissionMatrix = {
    [OrganizationUserRole.ADMINISTRATOR]: {
      permissions: [
        'view-organization', 'view-users',
        'create-application', 'view-application', 'manage-application', 'delete-application',
        'invite-user', 'remove-user', 'change-user-role',
        'read-data', 'write-data', 'export-data', 'manage-integrations'
      ],
      restrictions: [
        'delete-organization', 'transfer-ownership', 'view-billing', 'manage-billing'
      ],
      canModifyRoles: ['VIEWER'],
      cannotModifyRoles: ['ADMINISTRATOR']
    },
    
    [OrganizationUserRole.VIEWER]: {
      permissions: [
        'view-organization', 'view-application', 'read-data'
      ],
      restrictions: [
        'manage-organization', 'delete-organization', 'transfer-ownership',
        'view-billing', 'manage-billing', 'invite-user', 'remove-user', 
        'change-user-role', 'create-application', 'delete-application',
        'write-data', 'export-data', 'manage-integrations'
      ],
      canModifyRoles: [],
      cannotModifyRoles: ['ADMINISTRATOR', 'VIEWER']
    }
  };

  /**
   * Check if a user has a specific permission
   */
  hasPermission(
    userRole: OrganizationUserRole | null, 
    permission: string, 
    isOwner: boolean = false
  ): boolean {
    // Organization owners have all permissions
    if (isOwner) {
      return this.organizationOwnerPermissions.permissions.includes(permission);
    }

    // Application role permissions
    if (!userRole || !this.applicationRoleMatrix[userRole]) {
      return false;
    }

    const roleConfig = this.applicationRoleMatrix[userRole];
    return roleConfig.permissions.includes(permission) && 
           !roleConfig.restrictions.includes(permission);
  }

  /**
   * Check if a user is restricted from an action
   */
  isRestricted(
    userRole: OrganizationUserRole | null, 
    action: string,
    isOwner: boolean = false
  ): boolean {
    // Organization owners have no restrictions
    if (isOwner) {
      return this.organizationOwnerPermissions.restrictions.includes(action);
    }

    if (!userRole || !this.applicationRoleMatrix[userRole]) {
      return true; // No role = restricted
    }

    return this.applicationRoleMatrix[userRole].restrictions.includes(action);
  }

  /**
   * Check if a user can modify another user's role
   */
  canModifyUserRole(
    currentUserRole: OrganizationUserRole | null,
    targetUserRole: OrganizationUserRole,
    isCurrentUserOwner: boolean = false
  ): boolean {
    // Organization owners can modify any role
    if (isCurrentUserOwner) {
      return true;
    }

    if (!currentUserRole || !this.applicationRoleMatrix[currentUserRole]) {
      return false;
    }

    const roleConfig = this.applicationRoleMatrix[currentUserRole];
    return roleConfig.canModifyRoles?.includes(targetUserRole) || false;
  }

  /**
   * Generate comprehensive test scenarios
   */
  generateTestScenarios(): PermissionTestScenario[] {
    const scenarios: PermissionTestScenario[] = [];

    // Organization Owner scenarios
    const ownerScenarios = this.createOrganizationOwnerScenarios();
    scenarios.push(...ownerScenarios);

    // Application role scenarios
    const roleScenarios = this.createApplicationRoleScenarios();
    scenarios.push(...roleScenarios);

    // Cross-role interaction scenarios
    const interactionScenarios = this.createRoleInteractionScenarios();
    scenarios.push(...interactionScenarios);

    // Edge case scenarios
    const edgeCaseScenarios = this.createEdgeCaseScenarios();
    scenarios.push(...edgeCaseScenarios);

    return scenarios;
  }

  private createOrganizationOwnerScenarios(): PermissionTestScenario[] {
    return [
      {
        scenarioId: 'owner-001',
        description: 'Organization owner can manage organization',
        isOrganizationOwner: true,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'manage-organization',
        expectedResult: true
      },
      {
        scenarioId: 'owner-002',
        description: 'Organization owner can delete organization',
        isOrganizationOwner: true,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'delete-organization',
        expectedResult: true
      },
      {
        scenarioId: 'owner-003',
        description: 'Organization owner can transfer ownership',
        isOrganizationOwner: true,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'transfer-ownership',
        expectedResult: true
      },
      {
        scenarioId: 'owner-004',
        description: 'Organization owner can view billing',
        isOrganizationOwner: true,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'view-billing',
        expectedResult: true
      },
      {
        scenarioId: 'owner-005',
        description: 'Organization owner can change any user role',
        isOrganizationOwner: true,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'change-user-role',
        expectedResult: true
      }
    ];
  }

  private createApplicationRoleScenarios(): PermissionTestScenario[] {
    return [
      // Administrator role scenarios
      {
        scenarioId: 'admin-001',
        description: 'Administrator can manage applications',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'manage-application',
        expectedResult: true
      },
      {
        scenarioId: 'admin-002',
        description: 'Administrator cannot delete organization',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'delete-organization',
        expectedResult: false
      },
      {
        scenarioId: 'admin-003',
        description: 'Administrator cannot view billing',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'view-billing',
        expectedResult: false
      },
      {
        scenarioId: 'admin-004',
        description: 'Administrator can invite users',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'invite-user',
        expectedResult: true
      },

      // Viewer role scenarios
      {
        scenarioId: 'viewer-001',
        description: 'Viewer can view applications',
        userRole: OrganizationUserRole.VIEWER,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'view-application',
        expectedResult: true
      },
      {
        scenarioId: 'viewer-002',
        description: 'Viewer cannot manage applications',
        userRole: OrganizationUserRole.VIEWER,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'manage-application',
        expectedResult: false
      },
      {
        scenarioId: 'viewer-003',
        description: 'Viewer cannot invite users',
        userRole: OrganizationUserRole.VIEWER,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'invite-user',
        expectedResult: false
      },
      {
        scenarioId: 'viewer-004',
        description: 'Viewer can read data',
        userRole: OrganizationUserRole.VIEWER,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'read-data',
        expectedResult: true
      }
    ];
  }

  private createRoleInteractionScenarios(): PermissionTestScenario[] {
    return [
      {
        scenarioId: 'interaction-001',
        description: 'Administrator can modify Viewer role',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'change-user-role',
        expectedResult: true,
        context: { targetRole: OrganizationUserRole.VIEWER }
      },
      {
        scenarioId: 'interaction-002',
        description: 'Viewer cannot modify any roles',
        userRole: OrganizationUserRole.VIEWER,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'change-user-role',
        expectedResult: false,
        context: { targetRole: OrganizationUserRole.ADMINISTRATOR }
      },
      {
        scenarioId: 'interaction-003',
        description: 'Administrator cannot modify another Administrator role',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'change-user-role',
        expectedResult: false,
        context: { targetRole: OrganizationUserRole.ADMINISTRATOR }
      }
    ];
  }

  private createEdgeCaseScenarios(): PermissionTestScenario[] {
    return [
      {
        scenarioId: 'edge-001',
        description: 'Inactive user cannot perform any actions',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.INACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'view-application',
        expectedResult: false
      },
      {
        scenarioId: 'edge-002',
        description: 'User in inactive organization cannot perform actions',
        userRole: OrganizationUserRole.ADMINISTRATOR,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.INACTIVE,
        action: 'view-application',
        expectedResult: false
      },
      {
        scenarioId: 'edge-003',
        description: 'User with no role cannot perform any actions',
        userRole: null as any,
        userStatus: OrganizationUserStatus.ACTIVE,
        organizationStatus: OrganizationStatus.ACTIVE,
        action: 'view-application',
        expectedResult: false
      }
    ];
  }
}

// Test Suite
describe('RoleBasedTestMatrix', () => {
  let testMatrix: RoleBasedTestMatrix;
  let cognitoService: jasmine.SpyObj<CognitoService>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    const cognitoSpy = jasmine.createSpyObj('CognitoService', ['getCurrentUser']);
    const userSpy = jasmine.createSpyObj('UserService', ['getUser', 'updateUser']);

    TestBed.configureTestingModule({
      providers: [
        { provide: CognitoService, useValue: cognitoSpy },
        { provide: UserService, useValue: userSpy }
      ]
    });

    testMatrix = new RoleBasedTestMatrix();
    cognitoService = TestBed.inject(CognitoService) as jasmine.SpyObj<CognitoService>;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  describe('Organization Owner Permissions', () => {
    it('should allow organization owner to perform all actions', () => {
      const permissions = [
        'manage-organization', 'delete-organization', 'transfer-ownership',
        'view-billing', 'manage-billing', 'change-user-role'
      ];

      permissions.forEach(permission => {
        expect(testMatrix.hasPermission(null, permission, true)).toBe(true);
      });
    });

    it('should allow organization owner to modify any user role', () => {
      expect(testMatrix.canModifyUserRole(null, OrganizationUserRole.ADMINISTRATOR, true)).toBe(true);
      expect(testMatrix.canModifyUserRole(null, OrganizationUserRole.VIEWER, true)).toBe(true);
    });

    it('should not restrict organization owner from any actions', () => {
      const actions = [
        'delete-organization', 'transfer-ownership', 'view-billing'
      ];

      actions.forEach(action => {
        expect(testMatrix.isRestricted(null, action, true)).toBe(false);
      });
    });
  });

  describe('Administrator Role Permissions', () => {
    it('should allow Administrator to manage applications', () => {
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'manage-application')).toBe(true);
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'create-application')).toBe(true);
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'view-application')).toBe(true);
    });

    it('should restrict Administrator from organization-level actions', () => {
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'delete-organization')).toBe(false);
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'view-billing')).toBe(false);
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'transfer-ownership')).toBe(false);
    });

    it('should allow Administrator to modify Viewer roles', () => {
      expect(testMatrix.canModifyUserRole(OrganizationUserRole.ADMINISTRATOR, OrganizationUserRole.VIEWER)).toBe(true);
    });

    it('should not allow Administrator to modify other Administrator roles', () => {
      expect(testMatrix.canModifyUserRole(OrganizationUserRole.ADMINISTRATOR, OrganizationUserRole.ADMINISTRATOR)).toBe(false);
    });
  });

  describe('Viewer Role Permissions', () => {
    it('should allow Viewer to view applications and read data', () => {
      expect(testMatrix.hasPermission(OrganizationUserRole.VIEWER, 'view-application')).toBe(true);
      expect(testMatrix.hasPermission(OrganizationUserRole.VIEWER, 'read-data')).toBe(true);
      expect(testMatrix.hasPermission(OrganizationUserRole.VIEWER, 'view-organization')).toBe(true);
    });

    it('should restrict Viewer from management actions', () => {
      expect(testMatrix.hasPermission(OrganizationUserRole.VIEWER, 'manage-application')).toBe(false);
      expect(testMatrix.hasPermission(OrganizationUserRole.VIEWER, 'invite-user')).toBe(false);
      expect(testMatrix.hasPermission(OrganizationUserRole.VIEWER, 'write-data')).toBe(false);
    });

    it('should not allow Viewer to modify any user roles', () => {
      expect(testMatrix.canModifyUserRole(OrganizationUserRole.VIEWER, OrganizationUserRole.ADMINISTRATOR)).toBe(false);
      expect(testMatrix.canModifyUserRole(OrganizationUserRole.VIEWER, OrganizationUserRole.VIEWER)).toBe(false);
    });
  });

  describe('Scenario Generation', () => {
    it('should generate comprehensive test scenarios', () => {
      const scenarios = testMatrix.generateTestScenarios();
      
      expect(scenarios).toBeDefined();
      expect(scenarios.length).toBeGreaterThan(0);
      
      // Should include organization owner scenarios
      const ownerScenarios = scenarios.filter(s => s.isOrganizationOwner === true);
      expect(ownerScenarios.length).toBeGreaterThan(0);
      
      // Should include application role scenarios
      const roleScenarios = scenarios.filter(s => s.userRole !== undefined);
      expect(roleScenarios.length).toBeGreaterThan(0);
      
      // Should include edge cases
      const edgeCases = scenarios.filter(s => s.scenarioId.startsWith('edge-'));
      expect(edgeCases.length).toBeGreaterThan(0);
    });

    it('should include all required scenario properties', () => {
      const scenarios = testMatrix.generateTestScenarios();
      
      scenarios.forEach(scenario => {
        expect(scenario.scenarioId).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.userStatus).toBeDefined();
        expect(scenario.organizationStatus).toBeDefined();
        expect(scenario.action).toBeDefined();
        expect(typeof scenario.expectedResult).toBe('boolean');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid permission checks gracefully', () => {
      expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'invalid-permission')).toBe(false);
      expect(testMatrix.hasPermission(null, 'valid-permission')).toBe(false);
    });

    it('should handle performance under load', async () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'view-application');
      }
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });

  describe('Integration with Test Data Factory', () => {
    it('should work with organization test data', () => {
      const factory = new OrganizationTestDataFactory();
      const testOrg = factory.createTestOrganization({
        size: 'small',
        status: OrganizationStatus.ACTIVE
      });
      
      // Organization owner should have full permissions
      const isOwner = testOrg.owner.userId === testOrg.organization.ownerId;
      expect(isOwner).toBe(true);
      expect(testMatrix.hasPermission(null, 'manage-organization', isOwner)).toBe(true);
      
      // Other users should have role-based permissions
      const adminUser = testOrg.organizationUsers.find(ou => ou.role === OrganizationUserRole.ADMINISTRATOR);
      if (adminUser) {
        expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'manage-application')).toBe(true);
        expect(testMatrix.hasPermission(OrganizationUserRole.ADMINISTRATOR, 'delete-organization')).toBe(false);
      }
    });
  });
});