/**
 * Group Role Assignment Component
 *
 * Allows assigning roles to a group per environment.
 * Displays current role assignments and supports add/remove operations.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.2_
 */

import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IApplicationGroups } from '../../../../../core/models/ApplicationGroupsModel';
import { IApplicationGroupRoles } from '../../../../../core/models/ApplicationGroupRolesModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationGroupRoleStatus } from '../../../../../core/enums/ApplicationGroupRoleStatusEnum';
import { RoleType } from '../../../../../core/enums/RoleTypeEnum';
import { GroupsActions } from '../../store/groups/groups.actions';
import {
  selectGroupRoles,
  selectIsLoadingRoles,
  selectIsSavingRole,
  selectIsDeletingRole,
  selectRolesError,
  selectRolesSaveError,
  selectLastAssignedRole,
} from '../../store/groups/groups.selectors';

/**
 * Represents a role option for the dropdown
 */
interface RoleOption {
  roleId: string;
  roleName: string;
  roleType: RoleType;
  permissions: string[];
}

/**
 * Represents a role assignment row for display
 */
interface RoleAssignmentRow {
  environment: Environment;
  environmentLabel: string;
  roleAssignment: IApplicationGroupRoles | null;
  isAssigned: boolean;
}

@Component({
  selector: 'app-group-role-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './group-role-assignment.component.html',
  styleUrls: ['./group-role-assignment.component.scss'],
})
export class GroupRoleAssignmentComponent implements OnChanges, OnDestroy {
  @Input() group: IApplicationGroups | null = null;
  @Input() applicationId!: string;

  private destroy$ = new Subject<void>();

  // Store observables
  groupRoles$: Observable<IApplicationGroupRoles[]>;
  isLoadingRoles$: Observable<boolean>;
  isSavingRole$: Observable<boolean>;
  isDeletingRole$: Observable<boolean>;
  rolesError$: Observable<string | null>;
  rolesSaveError$: Observable<string | null>;

  // Available environments
  environments: Environment[] = [
    Environment.Production,
    Environment.Staging,
    Environment.Development,
    Environment.Test,
    Environment.Preview,
  ];

  // Environment labels for display
  environmentLabels: Record<Environment, string> = {
    [Environment.Unknown]: 'Unknown',
    [Environment.Production]: 'Production',
    [Environment.Staging]: 'Staging',
    [Environment.Development]: 'Development',
    [Environment.Test]: 'Test',
    [Environment.Preview]: 'Preview',
  };

  // Available roles (predefined for now)
  availableRoles: RoleOption[] = [
    {
      roleId: 'role-admin',
      roleName: 'Admin',
      roleType: RoleType.Admin,
      permissions: ['read', 'write', 'delete', 'admin'],
    },
    {
      roleId: 'role-user',
      roleName: 'User',
      roleType: RoleType.User,
      permissions: ['read', 'write'],
    },
    {
      roleId: 'role-guest',
      roleName: 'Guest',
      roleType: RoleType.Guest,
      permissions: ['read'],
    },
  ];

  // Role assignment rows for display
  roleAssignmentRows: RoleAssignmentRow[] = [];

  // Selected role for assignment
  selectedRoleId: string = '';
  selectedEnvironment: Environment | null = null;

  // Edit mode tracking
  editingEnvironment: Environment | null = null;

  constructor(private store: Store) {
    this.groupRoles$ = this.store.select(selectGroupRoles);
    this.isLoadingRoles$ = this.store.select(selectIsLoadingRoles);
    this.isSavingRole$ = this.store.select(selectIsSavingRole);
    this.isDeletingRole$ = this.store.select(selectIsDeletingRole);
    this.rolesError$ = this.store.select(selectRolesError);
    this.rolesSaveError$ = this.store.select(selectRolesSaveError);

    // Subscribe to role changes to update display
    this.groupRoles$
      .pipe(takeUntil(this.destroy$))
      .subscribe((roles) => this.updateRoleAssignmentRows(roles));

    // Listen for successful assignment to close edit mode
    this.store
      .select(selectLastAssignedRole)
      .pipe(takeUntil(this.destroy$))
      .subscribe((lastAssigned) => {
        if (lastAssigned && this.editingEnvironment === lastAssigned.environment) {
          this.editingEnvironment = null;
          this.selectedRoleId = '';
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group'] && this.group) {
      // Load roles when group changes
      this.store.dispatch(
        GroupsActions.loadGroupRoles({ groupId: this.group.applicationGroupId })
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateRoleAssignmentRows(roles: IApplicationGroupRoles[]): void {
    this.roleAssignmentRows = this.environments.map((env) => {
      const roleAssignment = roles.find(
        (r) =>
          r.environment === env &&
          r.status === ApplicationGroupRoleStatus.Active
      );

      return {
        environment: env,
        environmentLabel: this.environmentLabels[env],
        roleAssignment: roleAssignment || null,
        isAssigned: !!roleAssignment,
      };
    });
  }

  onStartAssign(environment: Environment): void {
    this.editingEnvironment = environment;
    this.selectedRoleId = '';
    this.store.dispatch(GroupsActions.clearRolesSaveError());
  }

  onCancelAssign(): void {
    this.editingEnvironment = null;
    this.selectedRoleId = '';
    this.store.dispatch(GroupsActions.clearRolesSaveError());
  }

  onAssignRole(environment: Environment): void {
    if (!this.group || !this.selectedRoleId) {
      return;
    }

    const selectedRole = this.availableRoles.find(
      (r) => r.roleId === this.selectedRoleId
    );

    if (!selectedRole) {
      return;
    }

    this.store.dispatch(
      GroupsActions.assignRoleToGroup({
        input: {
          applicationGroupId: this.group.applicationGroupId,
          applicationId: this.applicationId,
          environment: environment,
          roleId: selectedRole.roleId,
          roleName: selectedRole.roleName,
          permissions: selectedRole.permissions,
          status: ApplicationGroupRoleStatus.Active,
        },
      })
    );
  }

  onRemoveRole(row: RoleAssignmentRow): void {
    if (!row.roleAssignment || !this.group) {
      return;
    }

    if (
      confirm(
        `Are you sure you want to remove the "${row.roleAssignment.roleName}" role from ${row.environmentLabel}?`
      )
    ) {
      this.store.dispatch(
        GroupsActions.removeRoleFromGroup({
          roleAssignmentId: row.roleAssignment.applicationGroupRoleId,
          groupId: this.group.applicationGroupId,
          environment: row.environment,
        })
      );
    }
  }

  getRoleTypeClass(roleType: RoleType | undefined): string {
    switch (roleType) {
      case RoleType.Admin:
        return 'admin';
      case RoleType.User:
        return 'user';
      case RoleType.Guest:
        return 'guest';
      default:
        return 'unknown';
    }
  }

  getEnvironmentClass(environment: Environment): string {
    switch (environment) {
      case Environment.Production:
        return 'production';
      case Environment.Staging:
        return 'staging';
      case Environment.Development:
        return 'development';
      case Environment.Test:
        return 'test';
      case Environment.Preview:
        return 'preview';
      default:
        return 'unknown';
    }
  }

  formatPermissions(permissions: string[] | undefined): string {
    if (!permissions || permissions.length === 0) {
      return 'No permissions';
    }
    return permissions.join(', ');
  }
}
