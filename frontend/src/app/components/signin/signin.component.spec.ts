// src/app/components/signin/signin.component.spec.ts

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { SignInComponent } from './signin.component';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import {User, UserRole, UserStatus} from '../../models/user.model';

describe('SignInComponent', () => {
  let component: SignInComponent;
  let fixture: ComponentFixture<SignInComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  const mockUser: User = {
    id: '123',
    cognito_id: 'cognito123',
    username: 'test@example.com',
    email: 'test@example.com',
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    profile: {
      full_name: 'Test User',
      phone: '+1234567890',
      language: 'en',
      preferences: {
        email_notifications: true,
        theme: 'light'
      }
    }
  };

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'authenticateUser',
      'isAuthenticated$',
      'checkIsAuthenticated',
      'getUserRole',
      'currentUser'
    ]);
    authSpy.isAuthenticated$.and.returnValue(of(false));
    authSpy.checkIsAuthenticated.and.returnValue(Promise.resolve(false));
    authSpy.currentUser = null;

    await TestBed.configureTestingModule({
      declarations: [ SignInComponent ],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SignInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty form', () => {
    expect(component.signInForm.get('username')?.value).toBe('');
    expect(component.signInForm.get('password')?.value).toBe('');
  });

  it('should validate form fields', () => {
    const form = component.signInForm;
    expect(form.valid).toBeFalsy();

    // Test invalid email
    form.controls['username'].setValue('invalid-email');
    expect(form.controls['username'].errors?.['email']).toBeTruthy();

    // Test valid email
    form.controls['username'].setValue('test@example.com');
    expect(form.controls['username'].errors).toBeFalsy();

    // Test password length
    form.controls['password'].setValue('short');
    expect(form.controls['password'].errors?.['minlength']).toBeTruthy();

    form.controls['password'].setValue('validpassword123');
    expect(form.controls['password'].errors).toBeFalsy();
  });

  it('should handle successful signin', fakeAsync(async () => {
    const navigateSpy = spyOn(router, 'navigate');
    const mockResponse = {
      success: true,
      user: mockUser,
      role: UserRole.CUSTOMER
    };

    authService.authenticateUser.and.returnValue(Promise.resolve(mockResponse));
    authService.getUserRole.and.returnValue(Promise.resolve(UserRole.CUSTOMER));

    component.signInForm.setValue({
      username: 'test@example.com',
      password: 'password123'
    });

    await component.onSubmit();
    tick();

    expect(authService.authenticateUser).toHaveBeenCalledWith({
      username: 'test@example.com',
      password: 'password123'
    });
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/dashboard']);
  }));

  it('should handle signin error', fakeAsync(async () => {
    const mockError = {
      success: false,
      error: 'Invalid credentials'
    };
    authService.authenticateUser.and.returnValue(Promise.resolve(mockError));

    component.signInForm.setValue({
      username: 'test@example.com',
      password: 'wrongpassword'
    });

    await component.onSubmit();
    tick();

    expect(component.errorMessage).toBe('Invalid credentials');
  }));

  it('should handle unconfirmed user error', fakeAsync(async () => {
    const navigateSpy = spyOn(router, 'navigate');
    authService.authenticateUser.and.returnValue(Promise.reject({
      code: 'UserNotConfirmedException',
      message: 'User is not confirmed'
    }));

    component.signInForm.setValue({
      username: 'test@example.com',
      password: 'password123'
    });

    await component.onSubmit();
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(
      ['/confirm-email'],
      { queryParams: { username: 'test@example.com' } }
    );
  }));

  it('should check initial authentication state', fakeAsync(() => {
    authService.checkIsAuthenticated.and.returnValue(Promise.resolve(true));
    authService.getUserRole.and.returnValue(Promise.resolve(UserRole.CUSTOMER));
    const navigateSpy = spyOn(router, 'navigate');

    component.ngOnInit();
    tick();

    expect(authService.checkIsAuthenticated).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/customer/dashboard']);
  }));

  it('should handle already authenticated user', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate');
    authService.isAuthenticated$.and.returnValue(of(true));
    authService.getUserRole.and.returnValue(Promise.resolve(UserRole.ADMINISTRATOR));

    component.ngOnInit();
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
  }));
});
