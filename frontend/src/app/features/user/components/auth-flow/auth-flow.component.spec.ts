// file: frontend/src/app/features/user/components/auth-flow/auth-flow.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the auth-flow component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';

import { AuthFlowComponent } from './auth-flow.component';
import { AuthSteps } from './store/auth.state';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';
import { UserStatus, UserGroups } from '../../../../core/models/user.enum';

describe('AuthFlowComponent', () => {
  let component: AuthFlowComponent;
  let fixture: ComponentFixture<AuthFlowComponent>;
  let mockStore: MockStore;
  let mockRouter: Router;
  let mockUserService: jasmine.SpyObj<UserService>;

  const initialState = {
    auth: {
      currentStep: AuthSteps.EMAIL,
      isLoading: false,
      error: null,
      userExists: false,
      currentUser: null,
      debugMode: false,
      sessionActive: false
    }
  };

  const mockUser: User = {
    user_id: '123',
    cognito_id: 'abc123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '+12345678901',
    groups: [UserGroups.USER] as UserGroups[],
    status: UserStatus.ACTIVE,
    created_at: Date.now()
  };

  const mockInvalidUser: User = {
    user_id: '123',
    cognito_id: 'abc123',
    email: 'test@example.com',
    first_name: '',
    last_name: '',
    phone_number: '',
    groups: [UserGroups.USER] as UserGroups[],
    status: UserStatus.ACTIVE,
    created_at: Date.now()
  };

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid']);

    await TestBed.configureTestingModule({
      declarations: [AuthFlowComponent],
      imports: [ReactiveFormsModule, RouterTestingModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    mockStore = TestBed.inject(MockStore);
    mockRouter = TestBed.inject(Router);
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    
    // Spy on router navigate method
    spyOn(mockRouter, 'navigate').and.returnValue(Promise.resolve(true));
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should navigate to dashboard when user is valid', () => {
    // Set up the test
    mockUserService.isUserValid.and.returnValue(true);
    spyOn(component['currentUser$'], 'pipe').and.returnValue(of(mockUser));
    
    // Call the private method directly using type casting to access it
    (component as any).handleAuthComplete();
    
    // Verify the navigation occurred correctly
    expect(mockUserService.isUserValid).toHaveBeenCalledWith(mockUser);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should navigate to profile when user is missing required attributes', () => {
    // Set up the test
    mockUserService.isUserValid.and.returnValue(false);
    spyOn(component['currentUser$'], 'pipe').and.returnValue(of(mockInvalidUser));
    
    // Call the private method directly using type casting to access it
    (component as any).handleAuthComplete();
    
    // Verify the navigation occurred correctly
    expect(mockUserService.isUserValid).toHaveBeenCalledWith(mockInvalidUser);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
  });

  it('should navigate to profile when no user is found', () => {
    // Set up the test
    spyOn(component['currentUser$'], 'pipe').and.returnValue(of(null));
    
    // Call the private method directly using type casting to access it
    (component as any).handleAuthComplete();
    
    // Verify the navigation occurred correctly
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/profile']);
  });
  
  it('should handle phone verification flow correctly', () => {
    // Prepare the component for phone setup
    mockStore.setState({
      auth: {
        ...initialState.auth,
        currentStep: AuthSteps.PHONE_SETUP
      }
    });
    fixture.detectChanges();
    
    // Set a valid phone number
    component.authForm.get('phoneNumber')?.setValue('+12345678901');
    
    // Spy on store dispatch
    spyOn(mockStore, 'dispatch');
    
    // Submit the form
    component.onSubmit();
    
    // Check that the proper action was dispatched
    expect(mockStore.dispatch).toHaveBeenCalled();
    
    // Now test the phone verification step
    mockStore.setState({
      auth: {
        ...initialState.auth,
        currentStep: AuthSteps.PHONE_VERIFY,
        phoneValidationId: '+12345678901'
      }
    });
    fixture.detectChanges();
    
    // Reset spy
    (mockStore.dispatch as jasmine.Spy).calls.reset();
    
    // Enter verification code
    component.authForm.get('phoneCode')?.setValue('123456');
    
    // Submit again to verify code
    component.onSubmit();
    
    // Verify code verification action was dispatched
    expect(mockStore.dispatch).toHaveBeenCalled();
  });
  
  it('should allow resending verification code', () => {
    // Set up component for phone verification step
    mockStore.setState({
      auth: {
        ...initialState.auth,
        currentStep: AuthSteps.PHONE_VERIFY,
        currentUser: { ...mockUser }
      }
    });
    fixture.detectChanges();
    
    // Spy on store dispatch
    spyOn(mockStore, 'dispatch');
    
    // Call the resend method
    component.resendVerificationCode();
    
    // Verify the resend action was dispatched
    expect(mockStore.dispatch).toHaveBeenCalled();
  });
});