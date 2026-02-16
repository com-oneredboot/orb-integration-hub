/**
 * Users Effects Unit Tests
 * 
 * Tests for users effects following the Organizations pattern
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';

import { UsersEffects } from './users.effects';
import { UsersActions } from './users.actions';
import { UsersService } from '../../../../core/services/users.service';
import { 
  selectOrganizationIds, 
  selectApplicationIds, 
  selectEnvironment,
  selectNextToken 
} from './users.selectors';
import { UserWithRoles, RoleAssignment, GetApplicationUsersOutput } from '../../../../core/graphql/GetApplicationUsers.graphql';

describe('UsersEffects', () => {
  let actions$: Observable<unknown>;
  let effects: UsersEffects;
  let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let store: MockStore;

  const mockRoleAssignment: RoleAssignment = {
    applicationUserRoleId: 'role-1',
    applicationId: 'app-1',
    applicationName: 'App One',
    organizationId: 'org-1',
    organizationName: 'Org One',
    environment: 'production',
    roleId: 'role-id-1',
    roleName: 'Admin',
    status: 'ACTIVE',
    createdAt: 1704067200,
    updatedAt: 1705276800,
  };

  const mockUsersWithRoles: UserWithRoles[] = [
    {
      userId: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
      roleAssignments: [mockRoleAssignment],
    },
    {
      userId: 'user-2',
      firstName: 'Jane',
      lastName: 'Smith',
      status: 'ACTIVE',
      roleAssignments: [],
    },
  ];

  const mockOutput: GetApplicationUsersOutput = {
    users: mockUsersWithRoles,
    nextToken: 'next-token-123',
  };

  beforeEach(() => {
    usersServiceSpy = jasmine.createSpyObj('UsersService', ['getApplicationUsersWithRoles']);

    TestBed.configureTestingModule({
      providers: [
        UsersEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectOrganizationIds, value: [] },
            { selector: selectApplicationIds, value: [] },
            { selector: selectEnvironment, value: null },
            { selector: selectNextToken, value: null }
          ]
        }),
        { provide: UsersService, useValue: usersServiceSpy }
      ]
    });

    effects = TestBed.inject(UsersEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('loadUsers$', () => {
    it('should dispatch loadUsersSuccess with usersWithRoles on successful load', (done) => {
      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(of(mockOutput));

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Success');
        expect(usersServiceSpy.getApplicationUsersWithRoles).toHaveBeenCalledWith({
          organizationIds: undefined,
          applicationIds: undefined,
          environment: undefined,
          limit: 50
        });
        
        const successAction = action as ReturnType<typeof UsersActions.loadUsersSuccess>;
        expect(successAction.usersWithRoles).toEqual(mockUsersWithRoles);
        expect(successAction.nextToken).toBe('next-token-123');
        done();
      });
    });

    it('should dispatch loadUsersFailure on error', (done) => {
      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(
        throwError(() => new Error('Failed to load users'))
      );

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Failure');
        const failureAction = action as ReturnType<typeof UsersActions.loadUsersFailure>;
        expect(failureAction.error).toBe('Failed to load users');
        done();
      });
    });

    it('should include organizationIds filter when set', (done) => {
      store.overrideSelector(selectOrganizationIds, ['org-1', 'org-2']);
      store.refreshState();

      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(of(mockOutput));

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(() => {
        expect(usersServiceSpy.getApplicationUsersWithRoles).toHaveBeenCalledWith({
          organizationIds: ['org-1', 'org-2'],
          applicationIds: undefined,
          environment: undefined,
          limit: 50
        });
        done();
      });
    });

    it('should include applicationIds filter when set', (done) => {
      store.overrideSelector(selectApplicationIds, ['app-1']);
      store.refreshState();

      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(of(mockOutput));

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(() => {
        expect(usersServiceSpy.getApplicationUsersWithRoles).toHaveBeenCalledWith({
          organizationIds: undefined,
          applicationIds: ['app-1'],
          environment: undefined,
          limit: 50
        });
        done();
      });
    });

    it('should include environment filter when set', (done) => {
      store.overrideSelector(selectEnvironment, 'production');
      store.refreshState();

      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(of(mockOutput));

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(() => {
        expect(usersServiceSpy.getApplicationUsersWithRoles).toHaveBeenCalledWith({
          organizationIds: undefined,
          applicationIds: undefined,
          environment: 'production',
          limit: 50
        });
        done();
      });
    });

    it('should handle refreshUsers action the same as loadUsers', (done) => {
      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(of(mockOutput));

      actions$ = of(UsersActions.refreshUsers());

      effects.loadUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Success');
        expect(usersServiceSpy.getApplicationUsersWithRoles).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('loadMoreUsers$', () => {
    it('should dispatch loadMoreUsersSuccess with additional users', (done) => {
      store.overrideSelector(selectNextToken, 'next-token-123');
      store.refreshState();

      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(of(mockOutput));

      actions$ = of(UsersActions.loadMoreUsers());

      effects.loadMoreUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load More Users Success');
        expect(usersServiceSpy.getApplicationUsersWithRoles).toHaveBeenCalledWith({
          organizationIds: undefined,
          applicationIds: undefined,
          environment: undefined,
          limit: 50,
          nextToken: 'next-token-123'
        });
        
        const successAction = action as ReturnType<typeof UsersActions.loadMoreUsersSuccess>;
        expect(successAction.usersWithRoles).toEqual(mockUsersWithRoles);
        done();
      });
    });

    it('should dispatch loadUsersFailure when nextToken is null', (done) => {
      store.overrideSelector(selectNextToken, null);
      store.refreshState();

      actions$ = of(UsersActions.loadMoreUsers());

      effects.loadMoreUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Failure');
        const failureAction = action as ReturnType<typeof UsersActions.loadUsersFailure>;
        expect(failureAction.error).toBe('No more users to load');
        expect(usersServiceSpy.getApplicationUsersWithRoles).not.toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch loadUsersFailure on error', (done) => {
      store.overrideSelector(selectNextToken, 'next-token-123');
      store.refreshState();

      usersServiceSpy.getApplicationUsersWithRoles.and.returnValue(
        throwError(() => new Error('Failed to load more users'))
      );

      actions$ = of(UsersActions.loadMoreUsers());

      effects.loadMoreUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Failure');
        const failureAction = action as ReturnType<typeof UsersActions.loadUsersFailure>;
        expect(failureAction.error).toBe('Failed to load more users');
        done();
      });
    });
  });

  describe('filterChange$', () => {
    it('should dispatch loadUsers when organization filter changes', (done) => {
      actions$ = of(UsersActions.setOrganizationFilter({ organizationIds: ['org-1'] }));

      effects.filterChange$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users');
        done();
      });
    });

    it('should dispatch loadUsers when application filter changes', (done) => {
      actions$ = of(UsersActions.setApplicationFilter({ applicationIds: ['app-1'] }));

      effects.filterChange$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users');
        done();
      });
    });

    it('should dispatch loadUsers when environment filter changes', (done) => {
      actions$ = of(UsersActions.setEnvironmentFilter({ environment: 'production' }));

      effects.filterChange$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users');
        done();
      });
    });
  });
});
