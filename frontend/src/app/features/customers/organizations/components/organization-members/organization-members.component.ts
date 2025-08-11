/**
 * Organization Members Component
 * 
 * Manages all member-related operations for an organization including:
 * - Current members list with role management
 * - Pending invitations tracking and management
 * - New member invitation flow
 */

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, Subject, forkJoin } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { OrganizationUserRole } from '../../../../../core/models/OrganizationUserRoleEnum';
import { OrganizationUsersService } from '../../services/organization-users.service';
import { InvitationsService } from '../../services/invitations.service';

@Component({
  selector: 'app-organization-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule
  ],
  templateUrl: './organization-members.component.html',
  styleUrls: ['./organization-members.component.scss']
})
export class OrganizationMembersComponent implements OnInit, OnDestroy {
  @Input() organization: Organizations | null = null;
  
  // Lifecycle management
  private destroy$ = new Subject<void>();
  
  // Loading state
  isLoading = false;
  
  // Combined data
  allMembers: any[] = []; // Combined members and invitations
  filteredData: any[] = [];
  
  // Search and filter
  searchTerm = '';
  statusFilter = 'all'; // all, active, pending
  
  // Sorting
  sortField = 'name';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Inline states
  showInviteForm = false;
  editingMemberId: string | null = null;
  editingMemberRole: string = '';
  removingMemberId: string | null = null;
  
  // Invitation form
  inviteForm = {
    email: '',
    role: 'VIEWER'
  };
  
  // Available roles
  availableRoles = ['VIEWER', 'ADMINISTRATOR'];
  
  // Computed properties for template
  get activeCount(): number {
    return this.allMembers.filter(m => m.status === 'active').length;
  }
  
  get pendingCount(): number {
    return this.allMembers.filter(m => m.status === 'pending').length;
  }
  
  constructor(
    private organizationUsersService: OrganizationUsersService,
    private invitationsService: InvitationsService
  ) {}
  
  ngOnInit(): void {
    if (this.organization) {
      this.loadAllData();
    }
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadAllData(): void {
    if (!this.organization) return;
    
    this.isLoading = true;
    
    // Load both members and invitations in parallel
    forkJoin({
      members: this.organizationUsersService.getOrganizationMembers(this.organization.organizationId),
      invitations: this.invitationsService.getOrganizationInvitations(this.organization.organizationId)
    }).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ members, invitations }) => {
        // Combine and normalize the data
        this.allMembers = [
          ...members.map(member => ({
            ...member,
            type: 'member',
            status: 'active',
            displayName: member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.email || 'Unknown',
            displayEmail: member.email || '',
            joinedDate: member.createdAt
          })),
          ...invitations.filter(inv => inv.status === 'PENDING').map(invitation => ({
            ...invitation,
            type: 'invitation',
            status: 'pending',
            displayName: 'Pending Invitation',
            displayEmail: invitation.inviteeEmail,
            joinedDate: invitation.createdAt,
            userId: invitation.invitationId // Use invitationId as userId for consistency
          }))
        ];
        
        this.applyFiltersAndSort();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading data:', error);
        this.isLoading = false;
      }
    });
  }
  
  // Member actions
  onEditMemberRole(member: any): void {
    this.editingMemberId = member.userId;
    this.editingMemberRole = member.role;
  }
  
  onCancelRoleEdit(): void {
    this.editingMemberId = null;
    this.editingMemberRole = '';
  }
  
  onSaveRoleEdit(member: any): void {
    if (!this.organization || !this.editingMemberRole || this.editingMemberRole === member.role) {
      this.onCancelRoleEdit();
      return;
    }
    
    // Only active members can have their roles edited
    if (member.type !== 'member') {
      this.onCancelRoleEdit();
      return;
    }
    
    this.organizationUsersService.updateMemberRole(
      member.userId,
      this.organization.organizationId,
      this.editingMemberRole
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Update local state
        const memberIndex = this.allMembers.findIndex(m => m.userId === member.userId);
        if (memberIndex !== -1) {
          this.allMembers[memberIndex].role = this.editingMemberRole;
          this.applyFiltersAndSort();
        }
        this.onCancelRoleEdit();
      },
      error: (error) => {
        console.error('Error updating member role:', error);
        // TODO: Show error notification
        this.onCancelRoleEdit();
      }
    });
  }
  
  onRemoveMember(member: any): void {
    if (this.removingMemberId === member.userId) {
      // Cancel removal
      this.removingMemberId = null;
    } else {
      // Show confirmation
      this.removingMemberId = member.userId;
    }
  }
  
  onConfirmRemoveMember(member: any): void {
    if (!this.organization) return;
    
    // Only active members can be removed
    if (member.type !== 'member') return;
    
    this.organizationUsersService.removeMember(
      member.userId,
      this.organization.organizationId
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        // Remove from local state
        this.allMembers = this.allMembers.filter(m => m.userId !== member.userId);
        this.applyFiltersAndSort();
        this.removingMemberId = null;
      },
      error: (error) => {
        console.error('Error removing member:', error);
        // TODO: Show error notification
        this.removingMemberId = null;
      }
    });
  }
  
  onCancelRemoveMember(): void {
    this.removingMemberId = null;
  }
  
  // Invitation actions
  onResendInvitation(member: any): void {
    if (!this.organization) return;
    
    this.invitationsService.resendInvitation(member.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // TODO: Show success notification
          this.loadAllData(); // Reload to get updated data
        },
        error: (error) => {
          console.error('Error resending invitation:', error);
          // TODO: Show error notification
        }
      });
  }
  
  onCancelInvitation(member: any): void {
    if (!this.organization) return;
    
    this.invitationsService.cancelInvitation(member.invitationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Remove from local state
          this.allMembers = this.allMembers.filter(m => m.userId !== member.userId);
          this.applyFiltersAndSort();
        },
        error: (error) => {
          console.error('Error cancelling invitation:', error);
          // TODO: Show error notification
        }
      });
  }
  
  // Inline invitation
  onShowInviteForm(): void {
    this.showInviteForm = true;
    this.inviteForm = { email: '', role: 'VIEWER' };
  }
  
  onCancelInvite(): void {
    this.showInviteForm = false;
    this.inviteForm = { email: '', role: 'VIEWER' };
  }
  
  onSendInvitation(): void {
    if (!this.organization || !this.inviteForm.email) return;
    
    const invitationData = {
      organizationId: this.organization.organizationId,
      inviteeEmail: this.inviteForm.email,
      role: this.inviteForm.role
    };
    
    this.invitationsService.createInvitation(invitationData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (invitation) => {
          // Add to local state
          const newInvitation = {
            ...invitation,
            type: 'invitation',
            status: 'pending',
            displayName: 'Pending Invitation',
            displayEmail: invitation.inviteeEmail,
            joinedDate: invitation.createdAt,
            userId: invitation.invitationId
          };
          this.allMembers.push(newInvitation);
          this.applyFiltersAndSort();
          this.onCancelInvite();
        },
        error: (error) => {
          console.error('Error sending invitation:', error);
          // TODO: Show error notification
        }
      });
  }
  
  // Filter and sort methods
  applyFiltersAndSort(): void {
    let filtered = [...this.allMembers];
    
    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(member => member.status === this.statusFilter);
    }
    
    // Apply search filter
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(member => 
        member.displayName?.toLowerCase().includes(searchLower) ||
        member.displayEmail?.toLowerCase().includes(searchLower) ||
        member.role?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[this.sortField];
      let bValue = b[this.sortField];
      
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;
      
      const comparison = aValue > bValue ? 1 : -1;
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
    
    this.filteredData = filtered;
  }
  
  onSearch(): void {
    this.applyFiltersAndSort();
  }
  
  onFilterChange(): void {
    this.applyFiltersAndSort();
  }
  
  onSort(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFiltersAndSort();
  }
  
  // Utility methods
  formatDate(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  formatDateTime(timestamp: number | Date): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}