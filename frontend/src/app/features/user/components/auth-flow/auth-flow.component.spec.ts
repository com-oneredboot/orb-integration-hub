// file: frontend/src/app/features/user/components/auth-flow/auth-flow.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the auth-flow component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { AuthFlowComponent } from './auth-flow.component';
import { UserService } from '../../../../core/services/user.service';
import { IUsers, Users, UsersCreateInput, UsersResponse } from '../../../../core/models/UsersModel';
import { UserStatus } from '../../../../core/models/UserStatusEnum';
import { UserGroup } from '../../../../core/models/UserGroupEnum';
import { Router } from '@angular/router';

describe('AuthFlowComponent', () => {
  let component: AuthFlowComponent;
  let fixture: ComponentFixture<AuthFlowComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let store: jasmine.SpyObj<Store>;
  let router: jasmine.SpyObj<Router>;

  const mockUser: IUsers = {
    userId: '123',
    cognitoId: 'abc123',
    cognitoSub: 'cognito-sub-123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: [UserGroup.USER],
    status: UserStatus.ACTIVE,
    mfaEnabled: false,
    mfaSetupComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockCreateInput: UsersCreateInput = {
    userId: '123',
    cognitoId: 'abc123',
    cognitoSub: 'cognito-sub-123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: [UserGroup.USER],
    status: 'ACTIVE',
    mfaEnabled: false,
    mfaSetupComplete: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockResponse: UsersResponse = {
    StatusCode: 200,
    Message: 'Success',
    Data: new Users(mockUser)
  };

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['userCreate', 'isUserValid']);
    userServiceSpy.userCreate.and.returnValue(Promise.resolve(mockResponse));
    userServiceSpy.isUserValid.and.returnValue(true);

    const storeSpy = jasmine.createSpyObj('Store', ['select', 'dispatch']);
    storeSpy.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.PASSWORD_SETUP);
      }
      if (selector === require('./store/auth.selectors').selectCurrentUser) {
        return of(mockUser);
      }
      return of(null);
    });

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [ AuthFlowComponent ],
      providers: [
        FormBuilder,
        { provide: UserService, useValue: userServiceSpy },
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create user', async () => {
    store.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.PASSWORD_SETUP);
      }
      if (selector === require('./store/auth.selectors').selectCurrentUser) {
        return of(mockUser);
      }
      return of(null);
    });

    const password = 'TestPassword123!';

    component.authForm.patchValue({
      email: 'test@example.com',
      password: password,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+12345678901'
    });

    await component.onSubmit();
    expect(store.dispatch).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: '[Auth] Create User',
        input: jasmine.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          phoneNumber: '+12345678901',
          groups: [UserGroup.USER],
          status: 'PENDING',
          userId: jasmine.any(String),
          cognitoId: jasmine.any(String),
          createdAt: jasmine.any(String),
          updatedAt: jasmine.any(String),
          phoneVerified: false,
          emailVerified: false
        }),
        password: password
      })
    );
  });

  it('should display error banner when error is set in store', () => {
    // Simulate error in store
    store.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectError) {
        return of('Unable to connect to the server. Please check your connection and try again.');
      }
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.EMAIL);
      }
      return of(null);
    });
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.auth-flow__error')?.textContent)
      .toContain('Unable to connect to the server. Please check your connection and try again.');
  });

  it('should not advance to password step and should show error if userExists returns false', () => {
    // Simulate error in store for user not found or not authorized
    store.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectError) {
        return of('User not found or not authorized.');
      }
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.EMAIL);
      }
      return of(null);
    });
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Error banner should be shown
    expect(compiled.querySelector('.auth-flow__error')?.textContent)
      .toContain('User not found or not authorized.');
    // Should still be on email step
    expect(compiled.querySelector('input[type="email"]')).toBeTruthy();
    // Password input should NOT be in the active step
    const activePasswordInput = compiled.querySelector('.auth-flow__form-step--active input[type="password"]');
    expect(activePasswordInput).toBeFalsy();
  });

  it('should advance to password setup step if user is not found', () => {
    store.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.PASSWORD_SETUP);
      }
      if (selector === require('./store/auth.selectors').selectError) {
        return of(null);
      }
      return of(null);
    });
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Password input should be present in the active step (for password setup)
    const activePasswordInput = compiled.querySelector('.auth-flow__form-step--active input[type="password"]');
    expect(activePasswordInput).toBeTruthy();
  });

  it('should show error and not advance if checkEmailFailure is dispatched', () => {
    store.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.EMAIL);
      }
      if (selector === require('./store/auth.selectors').selectError) {
        return of('Some error occurred');
      }
      return of(null);
    });
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Error banner should be shown
    const errorBanner = compiled.querySelector('.auth-flow__error');
    expect(errorBanner).toBeTruthy();
    // Password input should NOT be in the active step
    const activePasswordInput = compiled.querySelector('.auth-flow__form-step--active input[type="password"]');
    expect(activePasswordInput).toBeFalsy();
  });

  it('should handle unauthorized error from UsersCreate mutation', async () => {
    // Simulate Unauthorized error from userCreate
    userService.userCreate.and.returnValue(Promise.resolve({
      StatusCode: 401,
      Message: 'Not Authorized to access UsersCreate on type Mutation',
      Data: null
    }));

    store.select.and.callFake((selector: any) => {
      if (selector === require('./store/auth.selectors').selectCurrentStep) {
        return of(require('./store/auth.state').AuthSteps.PASSWORD_SETUP);
      }
      if (selector === require('./store/auth.selectors').selectCurrentUser) {
        return of(null);
      }
      return of(null);
    });

    component.authForm.patchValue({
      email: 'unauth@example.com',
      password: 'TestPassword123!',
      firstName: 'Unauthorized',
      lastName: 'User',
      phoneNumber: '+12345678901'
    });

    await component.onSubmit();
    // '[Auth] Create User' should be dispatched to start the effect
    expect(store.dispatch).toHaveBeenCalledWith(
      jasmine.objectContaining({ type: '[Auth] Create User' })
    );
    // '[Auth] Create User Success' should NOT be dispatched on unauthorized
    expect(store.dispatch).not.toHaveBeenCalledWith(
      jasmine.objectContaining({ type: '[Auth] Create User Success' })
    );
  });
});