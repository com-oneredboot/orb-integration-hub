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
import { selectCurrentUser } from '../../../user/store/user.selectors';
import { IUsers } from '../../../../core/models/UsersModel';
import { IApplicationUsers } from '../../../../core/models/ApplicationUsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { ApplicationUserStatus } from '../../../../core/enums/ApplicationUserStatusEnum';

// TODO: Import UsersService when implemented in task 6
// import { UsersService } from '../../../../core/services/users.service';

describe('UsersEffects', () => {
  let actions$: Observable<unknown>;
  let effects: UsersEffects;
  // TODO: Add UsersService spy when implemented in task 6
  // let usersServiceSpy: jasmine.SpyObj<UsersService>;
  let store: MockStore;

  const mockCurrentUser: IUsers = {
    userId: 'user-123',
    cognitoId: 'cognito-123',
    cognitoSub: 'sub-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    status: UserStatus.Active,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers: IUsers[] = [
    {
      userId: 'user-1',
      cognitoId: 'cognito-1',
      cognitoSub: 'sub-1',
      email: 'user1@example.com',
      firstName: 'John',
      lastName: 'Doe',
      status: UserStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      userId: 'user-2',
      cognitoId: 'cognito-2',
      cognitoSub: 'sub-2',
      email: 'user2@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      status: UserStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockApplicationUserRecords: IApplicationUsers[] = [
    {
      applicationUserId: 'app-user-1',
      userId: 'user-1',
      applicationId: 'app-1',
      status: ApplicationUserStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationUserId: 'app-user-2',
      userId: 'user-1',
      applicationId: 'app-2',
      status: ApplicationUserStatus.Active,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      applicationUserId: 'app-user-3',
      userId: 'user-2',
      applicationId: 'app-1',
      status: ApplicationUserStatus.Pending,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    // TODO: Create UsersService spy when implemented in task 6
    // usersServiceSpy = jasmine.createSpyObj('UsersService', ['getApplicationUsers']);

    TestBed.configureTestingModule({
      providers: [
        UsersEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectCurrentUser, value: mockCurrentUser }
          ]
        }),
        // TODO: Provide UsersService spy when implemented in task 6
        // { provide: UsersService, useValue: usersServiceSpy }
      ]
    });

    effects = TestBed.inject(UsersEffects);
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store?.resetSelectors();
  });

  describe('loadUsers$', () => {
    it('should dispatch loadUsersSuccess with users and applicationUserRecords on successful load', (done) => {
      // TODO: Mock service call when UsersService is implemented in task 6
      // usersServiceSpy.getApplicationUsers.and.returnValue(
      //   of({ users: mockUsers, applicationUserRecords: mockApplicationUserRecords })
      // );

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Success');
        // TODO: Verify service was called when implemented
        // expect(usersServiceSpy.getApplicationUsers).toHaveBeenCalledWith(mockCurrentUser.userId);
        
        // For now, verify it returns empty data (placeholder implementation)
        const successAction = action as ReturnType<typeof UsersActions.loadUsersSuccess>;
        expect(successAction.users).toEqual([]);
        expect(successAction.applicationUserRecords).toEqual([]);
        done();
      });
    });

    it('should dispatch loadUsersFailure on error', (done) => {
      // TODO: Mock service error when UsersService is implemented in task 6
      // usersServiceSpy.getApplicationUsers.and.returnValue(
      //   throwError(() => new Error('Failed to load users'))
      // );

      actions$ = of(UsersActions.loadUsers());

      effects.loadUsers$.subscribe(action => {
        // For now, it will succeed with empty data (placeholder)
        // TODO: Update this test when service is implemented
        expect(action.type).toBe('[Users] Load Users Success');
        done();
      });
    });

    it('should not call service if currentUser is null', (done) => {
      store.overrideSelector(selectCurrentUser, null);
      store.refreshState();

      // TODO: Mock service when implemented
      // usersServiceSpy.getApplicationUsers.and.returnValue(
      //   of({ users: mockUsers, applicationUserRecords: mockApplicationUserRecords })
      // );

      actions$ = of(UsersActions.loadUsers());

      // Effect should not emit anything when currentUser is null
      let emitted = false;
      effects.loadUsers$.subscribe(() => {
        emitted = true;
      });

      setTimeout(() => {
        expect(emitted).toBe(false);
        // TODO: Verify service was not called when implemented
        // expect(usersServiceSpy.getApplicationUsers).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should handle refreshUsers action the same as loadUsers', (done) => {
      // TODO: Mock service call when UsersService is implemented in task 6
      // usersServiceSpy.getApplicationUsers.and.returnValue(
      //   of({ users: mockUsers, applicationUserRecords: mockApplicationUserRecords })
      // );

      actions$ = of(UsersActions.refreshUsers());

      effects.loadUsers$.subscribe(action => {
        expect(action.type).toBe('[Users] Load Users Success');
        // TODO: Verify service was called when implemented
        // expect(usersServiceSpy.getApplicationUsers).toHaveBeenCalledWith(mockCurrentUser.userId);
        done();
      });
    });
  });

  // TODO: Add more effect tests when additional effects are implemented
  // For example:
  // - loadUser$ (single user detail)
  // - createUser$
  // - updateUser$
  // - deleteUser$
});
