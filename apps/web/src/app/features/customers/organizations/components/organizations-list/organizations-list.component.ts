/**
 * Organizations List Component
 * 
 * Displays a list of organizations with filtering and selection capabilities.
 * Uses radio button selection for master-detail pattern.
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { IUsers } from '../../../../../core/models/UsersModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { OrganizationUserRole } from '../../../../../core/enums/OrganizationUserRoleEnum';
import { UserService } from '../../../../../core/services/user.service';
import * as fromUser from '../../../../user/store/user.selectors';
import { OrganizationsActions } from '../../store/organizations.actions';
import * as fromOrganizations from '../../store/organizations.selectors';
import { OrganizationTableRow } from '../../store/organizations.state';

@Component({
  selector: 'app-organizations-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent
  ],
  templateUrl: './organizations-list.component.html',
  styleUrls: ['./organizations-list.component.scss']
})
export class OrganizationsListComponent implements OnInit, OnDestroy {
  @Output() organizationSelected = new EventEmitter<Organizations>();
  @Output() createModeRequested = new EventEmitter<Organizations>();
  @Input() selectedOrganization: Organizations | null = null;

  // User data
  currentUser$: Observable<IUsers | null>;
  
  // Organization data from store
  organizationRows$: Observable<OrganizationTableRow[]>;
  filteredOrganizationRows$: Observable<OrganizationTableRow[]>;
  isLoading$: Observable<boolean>;
  isCreatingNew$: Observable<boolean>;
  searchTerm$: Observable<string>;
  statusFilter$: Observable<string>;
  roleFilter$: Observable<string>;
  
  // Local filter values for form binding
  searchTerm: string = '';
  statusFilter: string = '';
  roleFilter: string = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private userService: UserService,
    private store: Store
  ) {
    // User selectors
    this.currentUser$ = this.store.select(fromUser.selectCurrentUser);
    
    // Organization selectors
    this.organizationRows$ = this.store.select(fromOrganizations.selectOrganizationRows);
    this.filteredOrganizationRows$ = this.store.select(fromOrganizations.selectFilteredOrganizationRows);
    this.isLoading$ = this.store.select(fromOrganizations.selectIsLoading);
    this.isCreatingNew$ = this.store.select(fromOrganizations.selectIsCreatingNew);
    this.searchTerm$ = this.store.select(fromOrganizations.selectSearchTerm);
    this.statusFilter$ = this.store.select(fromOrganizations.selectStatusFilter);
    this.roleFilter$ = this.store.select(fromOrganizations.selectRoleFilter);
    
    // Sync local filter values with store
    this.searchTerm$.pipe(takeUntil(this.destroy$)).subscribe(term => this.searchTerm = term);
    this.statusFilter$.pipe(takeUntil(this.destroy$)).subscribe(filter => this.statusFilter = filter);
    this.roleFilter$.pipe(takeUntil(this.destroy$)).subscribe(filter => this.roleFilter = filter);
  }

  ngOnInit(): void {
    // Load organizations from the store
    this.store.dispatch(OrganizationsActions.loadOrganizations());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  onOrganizationSelected(organization: Organizations): void {
    this.store.dispatch(OrganizationsActions.selectOrganization({ organization }));
    this.organizationSelected.emit(organization);
  }

  onEnterOrganization(organization: Organizations): void {
    console.debug('Entering organization:', organization.name);
    // TODO: Implement organization context switching
  }

  onManageOrganization(organization: Organizations): void {
    console.debug('Managing organization:', organization.name);
    // TODO: Navigate to organization management page
  }

  onViewOrganization(organization: Organizations): void {
    this.onOrganizationSelected(organization);
  }

  onCreateOrganization(): void {
    console.debug('Create organization clicked');
    
    // Debug: Check current user and groups
    this.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      console.debug('Current user:', user);
      console.debug('User groups:', user?.groups);
      console.debug('Is customer check:', this.userService.isUserCustomer(user));
      
      if (!this.userService.isUserCustomer(user)) {
        console.warn('User is not a customer - cannot create organization');
        return;
      }
      
      // Check if already creating new from store
      this.isCreatingNew$.pipe(takeUntil(this.destroy$)).subscribe(isCreatingNew => {
        if (isCreatingNew) {
          console.debug('Already creating a new organization');
          return;
        }
        
        console.debug('User is customer - creating placeholder organization');
        this.createPlaceholderOrganization();
      }).unsubscribe();
    }).unsubscribe();
  }

  private createPlaceholderOrganization(): void {
    // Create placeholder organization
    const placeholderOrg: Organizations = new Organizations({
      organizationId: 'new-org-placeholder',
      name: 'New Organization',
      description: '',
      ownerId: '', // Will be filled by backend
      status: OrganizationStatus.Pending,
      createdAt: new Date(),
      updatedAt: new Date(),
      kmsKeyId: '',
      kmsKeyArn: '',
      kmsAlias: ''
    });

    // Dispatch action to enter create mode with placeholder
    this.store.dispatch(OrganizationsActions.enterCreateMode({ placeholderOrganization: placeholderOrg }));
    
    // Emit create mode request to parent
    this.createModeRequested.emit(placeholderOrg);
  }

  cancelCreateOrganization(): void {
    // Dispatch action to cancel create mode
    this.store.dispatch(OrganizationsActions.cancelCreateMode());
    
    // Clear selection
    this.organizationSelected.emit(null as any);
  }

  onOrganizationSaved(savedOrganization: Organizations): void {
    console.debug('Organization saved:', savedOrganization);
    
    // The store effects will handle updating the organization data
    // We just need to ensure the selection is updated
    this.onOrganizationSelected(savedOrganization);
  }

  onCreateCancelled(): void {
    console.debug('Create cancelled');
    this.cancelCreateOrganization();
  }

  onSearchChange(): void {
    this.store.dispatch(OrganizationsActions.setSearchTerm({ searchTerm: this.searchTerm }));
  }

  onFilterChange(): void {
    this.store.dispatch(OrganizationsActions.setStatusFilter({ statusFilter: this.statusFilter }));
    this.store.dispatch(OrganizationsActions.setRoleFilter({ roleFilter: this.roleFilter }));
  }

  trackByOrganizationId(_index: number, row: OrganizationTableRow): string {
    return row.organization.organizationId;
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  getStatusClass(status: OrganizationStatus): string {
    switch (status) {
      case OrganizationStatus.Active:
        return 'active';
      case OrganizationStatus.Inactive:
        return 'inactive';
      case OrganizationStatus.Pending:
        return 'pending';
      default:
        return 'inactive';
    }
  }
}