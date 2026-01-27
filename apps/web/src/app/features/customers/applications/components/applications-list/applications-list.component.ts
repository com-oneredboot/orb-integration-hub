/**
 * Applications List Component
 *
 * Displays a list of applications with filtering and selection capabilities.
 * Uses create-on-click pattern for new applications.
 * Loads real data from ApplicationService.
 */

import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, switchMap, map, catchError, take, filter } from 'rxjs/operators';
import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';

import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { ApplicationService } from '../../../../../core/services/application.service';
import { OrganizationService } from '../../../../../core/services/organization.service';
import * as fromUser from '../../../../user/store/user.selectors';

export interface ApplicationListRow {
  application: IApplications;
  organizationName: string;
  environmentCount: number;
  userRole: string;
  lastActivity: string;
}

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent
  ],
  templateUrl: './applications-list.component.html',
  styleUrls: ['./applications-list.component.scss']
})
export class ApplicationsListComponent implements OnInit, OnDestroy {
  @Output() applicationSelected = new EventEmitter<IApplications>();
  @Input() selectedApplication: IApplications | null = null;

  applicationRows: ApplicationListRow[] = [];
  filteredApplicationRows: ApplicationListRow[] = [];
  isLoading = false;
  organizations: IOrganizations[] = [];
  searchTerm = '';
  organizationFilter = '';
  statusFilter = '';

  private destroy$ = new Subject<void>();
  private currentUserId: string | null = null;

  constructor(
    private store: Store,
    private router: Router,
    private route: ActivatedRoute,
    private applicationService: ApplicationService,
    private organizationService: OrganizationService
  ) {}

  ngOnInit(): void {
    // Check for organization filter from query params
    // _Requirements: 1.4_
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      if (params['organizationId']) {
        this.organizationFilter = params['organizationId'];
        // Re-apply filters if data is already loaded
        if (this.applicationRows.length > 0) {
          this.applyFilters();
        }
      }
    });

    this.store.select(fromUser.selectCurrentUser).pipe(
      take(1),
      filter(user => !!user)
    ).subscribe(user => {
      this.currentUserId = user!.userId;
      this.loadApplications();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadApplications(): void {
    if (!this.currentUserId) return;
    this.isLoading = true;

    this.organizationService.getUserOrganizations(this.currentUserId).pipe(
      takeUntil(this.destroy$),
      switchMap(orgConnection => {
        this.organizations = orgConnection.items.filter(org => org.status === 'ACTIVE');
        if (this.organizations.length === 0) return of([]);

        const appRequests = this.organizations.map(org =>
          this.applicationService.getApplicationsByOrganization(org.organizationId).pipe(
            map(appConnection => ({ organization: org, applications: appConnection.items })),
            catchError(() => of({ organization: org, applications: [] as IApplications[] }))
          )
        );
        return forkJoin(appRequests);
      })
    ).subscribe({
      next: (results) => {
        this.applicationRows = [];
        for (const result of results) {
          for (const app of result.applications) {
            if (app.status === ApplicationStatus.Pending) continue;
            this.applicationRows.push({
              application: app,
              organizationName: result.organization.name,
              environmentCount: app.environments?.length || 0,
              userRole: 'OWNER',
              lastActivity: this.formatLastActivity(app.updatedAt)
            });
          }
        }
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private formatLastActivity(dateValue: string | Date | number | undefined): string {
    if (!dateValue) return 'Never';
    const date = typeof dateValue === 'number' ? new Date(dateValue * 1000)
      : dateValue instanceof Date ? dateValue : new Date(dateValue);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' min ago';
    if (diffHours < 24) return diffHours + ' hour' + (diffHours > 1 ? 's' : '') + ' ago';
    if (diffDays < 7) return diffDays + ' day' + (diffDays > 1 ? 's' : '') + ' ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  trackByApplicationId(_index: number, row: ApplicationListRow): string {
    return row.application.applicationId;
  }

  onSearchChange(): void { this.applyFilters(); }
  onFilterChange(): void { this.applyFilters(); }

  private applyFilters(): void {
    this.filteredApplicationRows = this.applicationRows.filter(row => {
      const matchesSearch = !this.searchTerm ||
        row.application.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        row.application.applicationId.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesOrganization = !this.organizationFilter ||
        row.application.organizationId === this.organizationFilter;
      const matchesStatus = !this.statusFilter || row.application.status === this.statusFilter;
      return matchesSearch && matchesOrganization && matchesStatus;
    });
  }

  getRoleClass(role: string): string {
    return role.toLowerCase().replace('_', '-');
  }

  onApplicationSelected(application: IApplications): void {
    this.applicationSelected.emit(application);
  }

  onRowClick(application: IApplications): void {
    this.router.navigate(['/customers/applications', application.applicationId]);
  }

  onCreateApplication(): void {
    const tempId = 'new-' + Date.now();
    this.router.navigate(['/customers/applications', tempId]);
  }
}
