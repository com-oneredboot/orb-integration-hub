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
import { IUsers, UsersCreateInput, UsersResponse } from '../../../../core/models/Users.model';
import { UserStatus } from '../../../../core/models/UserStatus.enum';
import { UserGroup } from '../../../../core/models/UserGroup.enum';
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
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: [UserGroup.USER],
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockCreateInput: UsersCreateInput = {
    userId: '123',
    cognitoId: 'abc123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: [UserGroup.USER],
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockResponse: UsersResponse = {
    statusCode: 200,
    message: 'Success',
    data: mockUser
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
          groups: [require('../../../../core/models/UserGroup.enum').UserGroup.USER],
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
    // Should not show password input in the active step
    const activePasswordInput = compiled.querySelector('.auth-flow__form-step--active input[type="password"]');
    expect(activePasswordInput).toBeFalsy();
  });
});