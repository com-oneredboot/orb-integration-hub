/**
 * ApplicationsListComponent Unit Tests
 *
 * Tests for applications list component using NgRx store-first pattern.
 *
 * @see .kiro/specs/store-centric-refactoring/design.md
 * _Requirements: 2.1-2.5, 7.1_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { BehaviorSubject } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faRocket, faPlus, faSearch, faServer, faSpinner } from '@fortawesome/free-solid-svg-icons';

import { ApplicationsListComponent } from './applications-list.component';
import { IApplications } from '../../../../../core/models/ApplicationsModel';
import { IOrganizations } from '../../../../../core/models/OrganizationsModel';
import { ApplicationStatus } from '../../../../../core/enums/ApplicationStatusEnum';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { ApplicationsActions } from '../../store/applications.actions';
import * as fromApplications from '../../store/applications.selectors';
import * as fromOrganizations from '../../../organizations/store/organizations.selectors';
import { ApplicationTableRow } from '../../store/applications.state';

describe('ApplicationsListComponent', () => {
  let component: ApplicationsListComponent;
  let fixture: ComponentFixture<ApplicationsListComponent>;
  let store: MockStore;
  let router: jasmine.SpyObj<Router>;
  let queryParamsSubject: BehaviorSubject<Record<string, string>>;

  const mockOrganization: IOrganizations = {
    organizationId: 'org-456',
    name: 'Test Organization',
    ownerId: 'user-123',
    status: OrganizationStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApplication: IApplications = {
    applicationId: 'app-789',
    name: 'Test Application',
    organizationId: 'org-456',
    ownerId: 'user-123',
    status: ApplicationStatus.Active,
    apiKey: 'api-key',
    apiKeyNext: '',
    environments: ['PRODUCTION', 'STAGING'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockApplicationRow: ApplicationTableRow = {
    application: mockApplication,
    organizationId: 'org-456',
    organizationName: 'Test Organization',
    environmentCount: 2,
    groupCount: 0,
    userCount: 0,
    roleCount: 0,
    userRole: 'OWNER',
    lastActivity: '1 day ago',
  };

  const initialState = {
    applications: {
      applications: [],
      applicationRows: [],
      filteredApplicationRows: [],
      isLoading: false,
      isCreatingNew: false,
      searchTerm: '',
      organizationFilter: '',
      statusFilter: '',
    },
    organizations: {
      organizations: [],
    },
  };

  beforeEach(async () => {
    router = jasmine.createSpyObj('Router', ['navigate']);
    queryParamsSubject = new BehaviorSubject<Record<string, string>>({});

    await TestBed.configureTestingModule({
      imports: [ApplicationsListComponent],
      providers: [
        provideMockStore({
          initialState,
          selectors: [
            { selector: fromApplications.selectApplicationRows, value: [] },
            { selector: fromApplications.selectFilteredApplicationRows, value: [] },
            { selector: fromApplications.selectIsLoading, value: false },
            { selector: fromApplications.selectIsCreatingNew, value: false },
            { selector: fromOrganizations.selectOrganizations, value: [] },
            { selector: fromApplications.selectSearchTerm, value: '' },
            { selector: fromApplications.selectOrganizationFilter, value: '' },
            { selector: fromApplications.selectStatusFilter, value: '' },
          ],
        }),
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: queryParamsSubject.asObservable(),
          },
        },
      ],
    }).compileComponents();

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faRocket, faPlus, faSearch, faServer, faSpinner);

    store = TestBed.inject(MockStore);
    spyOn(store, 'dispatch').and.callThrough();

    fixture = TestBed.createComponent(ApplicationsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Store Dispatches', () => {
    it('should dispatch loadApplications on init', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(ApplicationsActions.loadApplications());
    }));

    it('should dispatch setSearchTerm on search change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.searchTerm = 'test';
      component.onSearchChange();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.setSearchTerm({ searchTerm: 'test' })
      );
    }));

    it('should dispatch setOrganizationFilter on filter change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.organizationFilter = 'org-456';
      component.onFilterChange();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.setOrganizationFilter({ organizationFilter: 'org-456' })
      );
    }));

    it('should dispatch setStatusFilter on filter change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.statusFilter = 'ACTIVE';
      component.onFilterChange();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.setStatusFilter({ statusFilter: 'ACTIVE' })
      );
    }));

    it('should dispatch selectApplication on application selected', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      component.onApplicationSelected(mockApplication);

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.selectApplication({ application: mockApplication })
      );
    }));
  });

  describe('Store Selectors', () => {
    it('should get applicationRows from store', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectApplicationRows, [mockApplicationRow]);
      store.refreshState();
      fixture.detectChanges();
      tick();

      let rows: ApplicationTableRow[] = [];
      component.applicationRows$.subscribe(r => rows = r);
      tick();

      expect(rows.length).toBe(1);
      expect(rows[0].application.applicationId).toBe('app-789');
    }));

    it('should get filteredApplicationRows from store', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectFilteredApplicationRows, [mockApplicationRow]);
      store.refreshState();
      fixture.detectChanges();
      tick();

      let rows: ApplicationTableRow[] = [];
      component.filteredApplicationRows$.subscribe(r => rows = r);
      tick();

      expect(rows.length).toBe(1);
    }));

    it('should get isLoading from store', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectIsLoading, true);
      store.refreshState();
      fixture.detectChanges();
      tick();

      let loading = false;
      component.isLoading$.subscribe(l => loading = l);
      tick();

      expect(loading).toBe(true);
    }));

    it('should get organizations from store', fakeAsync(() => {
      store.overrideSelector(fromOrganizations.selectOrganizations, [mockOrganization]);
      store.refreshState();
      fixture.detectChanges();
      tick();

      let orgs: IOrganizations[] = [];
      component.organizations$.subscribe(o => orgs = o);
      tick();

      expect(orgs.length).toBe(1);
      expect(orgs[0].organizationId).toBe('org-456');
    }));

    it('should sync local searchTerm with store', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectSearchTerm, 'test search');
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.searchTerm).toBe('test search');
    }));

    it('should sync local organizationFilter with store', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectOrganizationFilter, 'org-456');
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.organizationFilter).toBe('org-456');
    }));

    it('should sync local statusFilter with store', fakeAsync(() => {
      store.overrideSelector(fromApplications.selectStatusFilter, 'ACTIVE');
      store.refreshState();
      fixture.detectChanges();
      tick();

      expect(component.statusFilter).toBe('ACTIVE');
    }));
  });

  describe('Row Click Navigation', () => {
    it('should navigate to application detail on row click', () => {
      component.onRowClick(mockApplication);

      expect(router.navigate).toHaveBeenCalledWith([
        '/customers/applications',
        'app-789',
      ]);
    });
  });

  describe('Create Button Behavior', () => {
    it('should navigate to new application route on create', () => {
      component.onCreateApplication();

      expect(router.navigate).toHaveBeenCalled();
      const navigateArgs = router.navigate.calls.mostRecent().args[0];
      expect(navigateArgs[0]).toBe('/customers/applications');
      expect(navigateArgs[1]).toMatch(/^new-\d+$/);
    });
  });

  describe('Application Selection', () => {
    it('should emit applicationSelected event when application is selected', () => {
      spyOn(component.applicationSelected, 'emit');

      component.onApplicationSelected(mockApplication);

      expect(component.applicationSelected.emit).toHaveBeenCalledWith(mockApplication);
    });
  });

  describe('Track By Function', () => {
    it('should return applicationId for tracking', () => {
      const result = component.trackByApplicationId(0, mockApplicationRow);

      expect(result).toBe('app-789');
    });
  });

  describe('Role Class', () => {
    it('should return lowercase role class', () => {
      expect(component.getRoleClass('OWNER')).toBe('owner');
      expect(component.getRoleClass('ADMINISTRATOR')).toBe('administrator');
      expect(component.getRoleClass('DEVELOPER')).toBe('developer');
    });
  });

  describe('Query Parameter Filtering', () => {
    it('should dispatch setOrganizationFilter from query params on init', fakeAsync(() => {
      queryParamsSubject.next({ organizationId: 'org-456' });

      fixture.detectChanges();
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.setOrganizationFilter({ organizationFilter: 'org-456' })
      );
    }));

    it('should dispatch setOrganizationFilter when query params change', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Clear previous dispatch calls
      (store.dispatch as jasmine.Spy).calls.reset();

      queryParamsSubject.next({ organizationId: 'org-other' });
      tick();

      expect(store.dispatch).toHaveBeenCalledWith(
        ApplicationsActions.setOrganizationFilter({ organizationFilter: 'org-other' })
      );
    }));
  });
});
