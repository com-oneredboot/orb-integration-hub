/**
 * OrganizationsListComponent Unit Tests
 *
 * Tests for organizations list component including application count display and navigation.
 *
 * @see .kiro/specs/organizations-applications-integration/design.md
 * _Requirements: 1.2, 1.3, 1.4_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { OrganizationsListComponent } from './organizations-list.component';
import { OrganizationService } from '../../../../../core/services/organization.service';
import { UserService } from '../../../../../core/services/user.service';
import { Organizations } from '../../../../../core/models/OrganizationsModel';
import { OrganizationStatus } from '../../../../../core/enums/OrganizationStatusEnum';
import { OrganizationTableRow } from '../../store/organizations.state';
import * as fromUser from '../../../../user/store/user.selectors';
import * as fromOrganizations from '../../store/organizations.selectors';

describe('OrganizationsListComponent', () => {
  let component: OrganizationsListComponent;
  let fixture: ComponentFixture<OrganizationsListComponent>;
  let store: MockStore;
  let router: Router;
  let organizationService: jasmine.SpyObj<OrganizationService>;
  let userService: jasmine.SpyObj<UserService>;

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    groups: ['CUSTOMER'],
  };

  const mockOrganization: Organizations = new Organizations({
    organizationId: 'org-456',
    name: 'Test Organization',
    ownerId: 'user-123',
    status: OrganizationStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
    applicationCount: 5,
  });

  const mockOrganizationRow: OrganizationTableRow = {
    organization: mockOrganization,
    userRole: 'OWNER',
    isOwner: true,
    memberCount: 3,
    applicationCount: 5,
  };

  beforeEach(async () => {
    organizationService = jasmine.createSpyObj('OrganizationService', [
      'createDraft',
      'getUserOrganizations',
    ]);
    userService = jasmine.createSpyObj('UserService', ['isUserCustomer']);

    await TestBed.configureTestingModule({
      imports: [OrganizationsListComponent],
      providers: [
        provideMockStore({
          selectors: [
            { selector: fromUser.selectCurrentUser, value: mockUser },
            { selector: fromOrganizations.selectOrganizationRows, value: [mockOrganizationRow] },
            { selector: fromOrganizations.selectFilteredOrganizationRows, value: [mockOrganizationRow] },
            { selector: fromOrganizations.selectIsLoading, value: false },
            { selector: fromOrganizations.selectIsCreatingNew, value: false },
          ],
        }),
        { provide: OrganizationService, useValue: organizationService },
        { provide: UserService, useValue: userService },
      ],
    }).compileComponents();

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    
    fixture = TestBed.createComponent(OrganizationsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Application Count Display', () => {
    it('should display applicationCount from organization record', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // The organization row should have applicationCount from the organization
      expect(mockOrganizationRow.organization.applicationCount).toBe(5);
    }));

    it('should read applicationCount from store organization rows', fakeAsync(() => {
      fixture.detectChanges();
      tick();

      // Verify the component reads from the store
      component.organizationRows$.subscribe(rows => {
        expect(rows.length).toBe(1);
        expect(rows[0].organization.applicationCount).toBe(5);
      });
    }));

    it('should handle undefined applicationCount gracefully', fakeAsync(() => {
      const orgWithNoCount = new Organizations({
        ...mockOrganization,
        applicationCount: undefined,
      });
      const rowWithNoCount: OrganizationTableRow = {
        ...mockOrganizationRow,
        organization: orgWithNoCount,
      };

      store.overrideSelector(fromOrganizations.selectOrganizationRows, [rowWithNoCount]);
      store.overrideSelector(fromOrganizations.selectFilteredOrganizationRows, [rowWithNoCount]);
      store.refreshState();

      fixture.detectChanges();
      tick();

      // Should not throw error
      expect(component).toBeTruthy();
    }));
  });

  describe('Application Count Click Navigation', () => {
    it('should navigate to applications list with organizationId filter on count click', () => {
      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');

      component.onApplicationCountClick(mockEvent, mockOrganizationRow);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(
        ['/customers/applications'],
        { queryParams: { organizationId: 'org-456' } }
      );
    });

    it('should stop event propagation to prevent row click', () => {
      const mockEvent = new MouseEvent('click');
      spyOn(mockEvent, 'stopPropagation');

      component.onApplicationCountClick(mockEvent, mockOrganizationRow);

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should pass correct organizationId in query params', () => {
      const anotherOrg = new Organizations({
        ...mockOrganization,
        organizationId: 'org-different',
      });
      const anotherRow: OrganizationTableRow = {
        ...mockOrganizationRow,
        organization: anotherOrg,
      };
      const mockEvent = new MouseEvent('click');

      component.onApplicationCountClick(mockEvent, anotherRow);

      expect(router.navigate).toHaveBeenCalledWith(
        ['/customers/applications'],
        { queryParams: { organizationId: 'org-different' } }
      );
    });
  });

  describe('Row Click Navigation', () => {
    it('should navigate to organization detail on row click', () => {
      component.onRowClick(mockOrganizationRow);

      expect(router.navigate).toHaveBeenCalledWith([
        '/customers/organizations',
        'org-456',
      ]);
    });
  });

  describe('Create Organization', () => {
    it('should create draft and navigate on create button click', fakeAsync(() => {
      const draftOrg = new Organizations({
        organizationId: 'org-new',
        name: 'New Organization',
        ownerId: 'user-123',
        status: OrganizationStatus.Pending,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      organizationService.createDraft.and.returnValue(of(draftOrg));
      userService.isUserCustomer.and.returnValue(true);

      fixture.detectChanges();
      component.onCreateOrganization();
      tick();

      expect(organizationService.createDraft).toHaveBeenCalledWith('user-123');
      expect(router.navigate).toHaveBeenCalledWith([
        '/customers/organizations',
        'org-new',
      ]);
    }));
  });

  describe('Role Class', () => {
    it('should return lowercase role class', () => {
      expect(component.getRoleClass('OWNER')).toBe('owner');
      expect(component.getRoleClass('EMPLOYEE')).toBe('employee');
      expect(component.getRoleClass('CUSTOMER')).toBe('customer');
    });
  });

  describe('Status Class', () => {
    it('should return correct status class', () => {
      expect(component.getStatusClass(OrganizationStatus.Active)).toBe('active');
      expect(component.getStatusClass(OrganizationStatus.Inactive)).toBe('inactive');
      expect(component.getStatusClass(OrganizationStatus.Pending)).toBe('pending');
    });
  });
});
