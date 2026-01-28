/**
 * Groups List Component
 *
 * Displays a list of groups for an application using the shared DataGridComponent.
 * Supports filtering, sorting, and CRUD operations.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 8.1, 8.2_
 */

import {
  Component,
  OnInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';

import { StatusBadgeComponent } from '../../../../../shared/components/ui/status-badge.component';
import {
  DataGridComponent,
  ColumnDefinition,
  PageState,
  SortState,
  FilterState,
  PageChangeEvent,
  SortChangeEvent,
  FilterChangeEvent,
  DEFAULT_PAGE_STATE,
} from '../../../../../shared/components/data-grid';

import { IApplicationGroups } from '../../../../../core/models/ApplicationGroupsModel';
import { ApplicationGroupStatus } from '../../../../../core/enums/ApplicationGroupStatusEnum';
import { GroupsActions } from '../../store/groups/groups.actions';
import {
  selectFilteredGroupRows,
  selectIsLoading,
  selectIsCreatingNew,
  selectError,
} from '../../store/groups/groups.selectors';
import { GroupTableRow } from '../../store/groups/groups.state';

@Component({
  selector: 'app-groups-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    FontAwesomeModule,
    StatusBadgeComponent,
    DataGridComponent,
  ],
  templateUrl: './groups-list.component.html',
  styleUrls: ['./groups-list.component.scss'],
})
export class GroupsListComponent implements OnInit, OnDestroy {
  @Input() applicationId!: string;
  @Output() groupSelected = new EventEmitter<IApplicationGroups>();
  @Output() createGroup = new EventEmitter<void>();

  // Template references for custom cells
  @ViewChild('groupInfoCell', { static: true }) groupInfoCell!: TemplateRef<unknown>;
  @ViewChild('statusCell', { static: true }) statusCell!: TemplateRef<unknown>;
  @ViewChild('memberCountCell', { static: true }) memberCountCell!: TemplateRef<unknown>;
  @ViewChild('lastActivityCell', { static: true }) lastActivityCell!: TemplateRef<unknown>;

  // Store selectors
  filteredGroupRows$: Observable<GroupTableRow[]>;
  isLoading$: Observable<boolean>;
  isCreatingNew$: Observable<boolean>;
  error$: Observable<string | null>;

  // Grid configuration
  columns: ColumnDefinition<GroupTableRow>[] = [];
  pageState: PageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
  sortState: SortState | null = null;
  filterState: FilterState = {};

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.filteredGroupRows$ = this.store.select(selectFilteredGroupRows);
    this.isLoading$ = this.store.select(selectIsLoading);
    this.isCreatingNew$ = this.store.select(selectIsCreatingNew);
    this.error$ = this.store.select(selectError);

    // Update page state when data changes
    this.filteredGroupRows$
      .pipe(
        takeUntil(this.destroy$),
        map((rows) => rows.length)
      )
      .subscribe((totalItems) => {
        this.pageState = {
          ...this.pageState,
          totalItems,
          totalPages: Math.ceil(totalItems / this.pageState.pageSize),
        };
      });
  }

  ngOnInit(): void {
    this.initializeColumns();

    if (this.applicationId) {
      this.store.dispatch(GroupsActions.setApplicationContext({ applicationId: this.applicationId }));
      this.store.dispatch(GroupsActions.loadGroups({ applicationId: this.applicationId }));
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeColumns(): void {
    this.columns = [
      {
        field: 'group',
        header: 'Group',
        sortable: true,
        filterable: true,
        cellTemplate: this.groupInfoCell,
        width: '35%',
      },
      {
        field: 'group',
        header: 'Status',
        sortable: true,
        filterable: true,
        filterType: 'select',
        filterOptions: [
          { value: 'ACTIVE', label: 'Active' },
          { value: 'DELETED', label: 'Deleted' },
        ],
        cellTemplate: this.statusCell,
        width: '20%',
      },
      {
        field: 'memberCount',
        header: 'Members',
        sortable: true,
        cellTemplate: this.memberCountCell,
        width: '20%',
      },
      {
        field: 'lastActivity',
        header: 'Last Activity',
        sortable: true,
        cellTemplate: this.lastActivityCell,
        width: '25%',
      },
    ];
  }


  // Grid event handlers
  onPageChange(event: PageChangeEvent): void {
    this.pageState = {
      ...this.pageState,
      currentPage: event.page,
      pageSize: event.pageSize,
      totalPages: Math.ceil(this.pageState.totalItems / event.pageSize),
    };
  }

  onSortChange(event: SortChangeEvent): void {
    if (event.direction) {
      this.sortState = { field: event.field, direction: event.direction };
    } else {
      this.sortState = null;
    }
  }

  onFilterChange(event: FilterChangeEvent): void {
    this.filterState = event.filters;

    const searchTerm = (event.filters['group'] as string) || '';
    const statusFilter = (event.filters['status'] as string) || '';

    this.store.dispatch(GroupsActions.setSearchTerm({ searchTerm }));
    this.store.dispatch(GroupsActions.setStatusFilter({ statusFilter }));
  }

  onResetGrid(): void {
    this.pageState = { ...DEFAULT_PAGE_STATE, pageSize: 10 };
    this.sortState = null;
    this.filterState = {};

    this.store.dispatch(GroupsActions.setSearchTerm({ searchTerm: '' }));
    this.store.dispatch(GroupsActions.setStatusFilter({ statusFilter: '' }));
  }

  onRowClick(row: GroupTableRow): void {
    this.groupSelected.emit(row.group);
  }

  onCreateGroup(): void {
    this.createGroup.emit();
  }

  getStatusClass(status: ApplicationGroupStatus): string {
    switch (status) {
      case ApplicationGroupStatus.Active:
        return 'active';
      case ApplicationGroupStatus.Deleted:
        return 'deleted';
      default:
        return 'unknown';
    }
  }
}
