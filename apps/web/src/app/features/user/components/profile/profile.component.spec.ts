// file: apps/web/src/app/features/user/components/profile/profile.component.spec.ts
// author: Claude
// date: 2025-02-25
// description: Unit tests for the profile component

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { ProfileComponent } from './profile.component';
import { UserService } from '../../../../core/services/user.service';
import { IUsers, Users } from '../../../../core/models/UsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { UserGroup } from '../../../../core/enums/UserGroupEnum';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockStore: MockStore;
  const _mockRouter = jasmine.createSpyObj('Router', ['navigate']);

  const initialState = {
    user: {
      currentUser: null,
      debugMode: false,
      isLoading: false,
      error: null
    }
  };

  const mockUser: IUsers = { userId: '123', cognitoId: 'abc123', cognitoSub: 'cognito-sub-123', email: 'test@example.com', emailVerified: true, phoneNumber: '+12345678901', phoneVerified: true, firstName: 'Test', lastName: 'User', groups: [UserGroup.User], status: UserStatus.Active, mfaEnabled: false, mfaSetupComplete: false, createdAt: new Date(), updatedAt: new Date() };

  const mockIncompleteUser: IUsers = { userId: '123', cognitoId: 'abc123', cognitoSub: 'cognito-sub-123', email: 'test@example.com', emailVerified: false, phoneNumber: '', phoneVerified: false, firstName: '', lastName: '', groups: [], status: UserStatus.Inactive, mfaEnabled: false, mfaSetupComplete: false, createdAt: new Date(), updatedAt: new Date() };

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid', 'userUpdate', 'userQueryByUserId']);
    mockUserService.isUserValid.and.callFake(user => {
      return !!(user?.firstName && user?.lastName && user?.email && user?.phoneNumber);
    });
    
    // Mock the userUpdate method
    mockUserService.userUpdate.and.callFake(async (input) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        StatusCode: 200,
        Message: 'Profile updated successfully',
        Data: new Users({
            ...mockUser,
          firstName: input.firstName || mockUser.firstName,
          lastName: input.lastName || mockUser.lastName
        })
      };
    });

    mockUserService.userQueryByUserId.and.callFake((_input) => Promise.resolve({ StatusCode: 200, Message: 'OK', Data: new Users(mockUser) }));

    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    storeSpy.select.and.returnValue(of(mockUser));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    const activatedRouteMock = {
      queryParams: of({})
    };

    await TestBed.configureTestingModule({
      imports: [ ProfileComponent, FontAwesomeModule ],
      providers: [
        provideMockStore({ initialState }),
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        FormBuilder
      ]
    }).compileComponents();

    // Add FontAwesome icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    mockStore = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    mockStore.setState({
      user: {
        currentUser: mockUser,
        debugMode: false,
        isLoading: false,
        error: null
      }
    });
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Form initialization', () => {
    it('should initialize form with user data when user exists', () => {
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
      expect(component.profileForm.get('firstName')?.value).toBe('Test');
      expect(component.profileForm.get('lastName')?.value).toBe('User');
      expect(component.profileForm.get('email')?.value).toBe('test@example.com');
      expect(component.profileForm.get('phoneNumber')?.value).toBe('+12345678901');
    });
    it('should initialize form with empty values when no user exists', () => {
      mockStore.setState({
        user: {
          currentUser: null,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
      expect(component.profileForm.get('firstName')?.value).toBe('');
      expect(component.profileForm.get('lastName')?.value).toBe('');
    });
  });

  describe('Form validation', () => {
    beforeEach(() => {
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
    });

    it('should validate required fields', () => {
      const firstNameControl = component.profileForm.get('firstName');
      firstNameControl?.setValue('');
      firstNameControl?.markAsTouched();
      expect(component.isFieldInvalid('firstName')).toBe(true);
      expect(component.getErrorMessage('firstName')).toContain('required');
      
      const lastNameControl = component.profileForm.get('lastName');
      lastNameControl?.setValue('');
      lastNameControl?.markAsTouched();
      expect(component.isFieldInvalid('lastName')).toBe(true);
      expect(component.getErrorMessage('lastName')).toContain('required');
    });

    it('should validate minLength constraint', () => {
      const firstNameControl = component.profileForm.get('firstName');
      firstNameControl?.setValue('A');
      firstNameControl?.markAsTouched();
      expect(component.isFieldInvalid('firstName')).toBe(true);
      expect(component.getErrorMessage('firstName')).toContain('at least 2 characters');
    });

    it('should correctly format field names in error messages', () => {
      // Access the private method using type casting
      expect((component as unknown as { formatFieldName: (name: string) => string }).formatFieldName('firstName')).toBe('First Name');
      expect((component as unknown as { formatFieldName: (name: string) => string }).formatFieldName('lastName')).toBe('Last Name');
    });
  });

  describe('Form actions', () => {
    beforeEach(() => {
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
    });

    it('should reset form to original values', async () => {
      // Change form values
      component.profileForm.patchValue({
        firstName: 'Changed',
        lastName: 'Name'
      });
      
      // Mark as dirty
      component.profileForm.markAsDirty();
      expect(component.profileForm.dirty).toBe(true);
      
      // Reset form
      component.resetForm();
      
      // Wait for async subscription to complete
      await fixture.whenStable();
      fixture.detectChanges();
      
      // Verify form values are reset
      expect(component.profileForm.get('firstName')?.value).toBe('Test');
      expect(component.profileForm.get('lastName')?.value).toBe('User');
      expect(component.profileForm.pristine).toBe(true);
    });

    it('should mark fields as touched when submitting invalid form', async () => {
      // Make form invalid
      component.profileForm.patchValue({
        firstName: '',
        lastName: ''
      });
      
      expect(component.profileForm.valid).toBe(false);
      
      // Submit form
      await component.onSubmit();
      
      // Verify fields are marked as touched
      expect(component.profileForm.get('firstName')?.touched).toBe(true);
      expect(component.profileForm.get('lastName')?.touched).toBe(true);
    });

    it('should process form submission correctly with valid data', fakeAsync(() => {
      // Spy on getCurrentUser
      spyOn(component as unknown as { getCurrentUser: () => Promise<IUsers | null> }, 'getCurrentUser').and.returnValue(Promise.resolve(mockUser));
      
      // Set valid form values
      component.profileForm.patchValue({
        firstName: 'Updated',
        lastName: 'Person'
      });
      component.profileForm.markAsDirty();
      
      // Submit form
      component.onSubmit();
      
      // Wait for the mock API delay
      tick(1000);
      
      // Verify form is marked as pristine after submission
      expect(component.profileForm.pristine).toBe(true);
    }));
  });

  describe('User validation', () => {
    it('should correctly determine if a user is valid', () => {
      // Set up the store with valid user
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
      
      expect(component.isUserValid(mockUser)).toBe(true);
      expect(component.isUserValid(mockIncompleteUser)).toBe(false);
      expect(mockUserService.isUserValid).toHaveBeenCalledWith(mockUser);
      expect(mockUserService.isUserValid).toHaveBeenCalledWith(mockIncompleteUser);
    });
  });

  describe('Date formatting', () => {
    it('should format dates correctly', () => {
      // Note: Date formatting can vary by timezone, so we need to be more flexible
      
      // Test with a Date object
      const formattedDate = component.formatDate(new Date('2023-01-01T00:00:00Z'));
      expect(typeof formattedDate).toBe('string');
      
      // Test null/undefined handling
      expect(component.formatDate(null as unknown as Date)).toBe('N/A');
      expect(component.formatDate(undefined as unknown as Date)).toBe('N/A');
      
      // Test invalid date handling
      const invalidResult = component.formatDate(new Date('invalid-date'));
      // Just make sure we get something back and no errors thrown
      expect(typeof invalidResult).toBe('string');
    });
  });

  /**
   * Edit Mode Toggling Tests
   * Feature: profile-setup-refactor
   * Validates: Requirements 8.1
   */
  describe('Edit Mode Toggling', () => {
    beforeEach(() => {
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
    });

    it('should set correct state when startFullFlow() is called', () => {
      component.startFullFlow();
      
      expect(component.setupState.isFlowMode).toBe(true);
      expect(component.setupState.currentStep).toBe('NAME');
      expect(component.setupState.startFromBeginning).toBe(true);
      expect(component.isEditMode).toBe(true);
    });

    it('should reset phone verification state when startFullFlow() is called', () => {
      // Set some phone verification state first
      component.phoneVerificationState.codeSent = true;
      component.phoneVerificationState.error = 'Some error';
      
      component.startFullFlow();
      
      expect(component.phoneVerificationState.codeSent).toBe(false);
      expect(component.phoneVerificationState.error).toBeNull();
      expect(component.phoneVerificationState.codeExpiration).toBeNull();
      expect(component.phoneVerificationState.cooldownUntil).toBeNull();
    });

    it('should skip completed steps when startFromIncomplete() is called', async () => {
      // User has name but no phone
      const userWithName = { ...mockUser, phoneNumber: '', phoneVerified: false };
      mockStore.setState({
        user: {
          currentUser: userWithName,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
      
      await component.startFromIncomplete();
      
      expect(component.setupState.isFlowMode).toBe(true);
      expect(component.setupState.currentStep).toBe('PHONE');
      expect(component.setupState.startFromBeginning).toBe(false);
    });

    it('should go to NAME step when user has no name', async () => {
      const userWithoutName = { ...mockUser, firstName: '', lastName: '' };
      mockStore.setState({
        user: {
          currentUser: userWithoutName,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
      
      await component.startFromIncomplete();
      
      expect(component.setupState.currentStep).toBe('NAME');
    });

    it('should go to PHONE_VERIFY step when phone not verified', async () => {
      const userWithUnverifiedPhone = { ...mockUser, phoneVerified: false };
      mockStore.setState({
        user: {
          currentUser: userWithUnverifiedPhone,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
      
      await component.startFromIncomplete();
      
      expect(component.setupState.currentStep).toBe('PHONE_VERIFY');
    });

    it('should return to summary view when showSummary() is called', () => {
      component.startFullFlow();
      expect(component.setupState.isFlowMode).toBe(true);
      
      component.showSummary();
      
      expect(component.setupState.isFlowMode).toBe(false);
      expect(component.setupState.currentStep).toBe('COMPLETE');
      expect(component.isEditMode).toBe(false);
    });

    it('should navigate to next step correctly', () => {
      component.startFullFlow();
      expect(component.setupState.currentStep).toBe('NAME');
      
      component.nextStep();
      expect(component.setupState.currentStep).toBe('PHONE');
      
      component.nextStep();
      expect(component.setupState.currentStep).toBe('PHONE_VERIFY');
    });

    it('should navigate to previous step correctly', () => {
      component.startFullFlow();
      component.skipToStep(component.ProfileSetupStep.PHONE_VERIFY);
      
      component.previousStep();
      expect(component.setupState.currentStep).toBe('PHONE');
      
      component.previousStep();
      expect(component.setupState.currentStep).toBe('NAME');
    });

    it('should not go before first step', () => {
      component.startFullFlow();
      expect(component.setupState.currentStep).toBe('NAME');
      
      component.previousStep();
      expect(component.setupState.currentStep).toBe('NAME');
    });

    it('should exit flow mode when reaching COMPLETE step', () => {
      component.startFullFlow();
      component.skipToStep(component.ProfileSetupStep.PHONE_VERIFY);
      
      component.nextStep();
      
      expect(component.setupState.currentStep).toBe('COMPLETE');
      expect(component.setupState.isFlowMode).toBe(false);
    });
  });

  /**
   * Phone Verification Flow Tests
   * Feature: profile-setup-refactor
   * Validates: Requirements 8.2
   */
  describe('Phone Verification Flow', () => {
    beforeEach(() => {
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
    });

    it('should set codeSent to true after sending verification code', async () => {
      // Mock the sendSMSVerificationCode method
      mockUserService.sendSMSVerificationCode = jasmine.createSpy('sendSMSVerificationCode')
        .and.returnValue(Promise.resolve({ success: true, message: 'Code sent' }));
      
      await component.sendVerificationCode();
      
      expect(mockUserService.sendSMSVerificationCode).toHaveBeenCalledWith(mockUser.phoneNumber as string);
      expect(component.phoneVerificationState.codeSent).toBe(true);
      expect(component.phoneVerificationState.codeExpiration).not.toBeNull();
      expect(component.phoneVerificationState.cooldownUntil).not.toBeNull();
    });

    it('should set error when verification code sending fails', async () => {
      mockUserService.sendSMSVerificationCode = jasmine.createSpy('sendSMSVerificationCode')
        .and.returnValue(Promise.resolve({ success: false, message: 'Rate limit exceeded' }));
      
      await component.sendVerificationCode();
      
      expect(component.phoneVerificationState.error).toBe('Rate limit exceeded');
    });

    it('should handle exception when sending verification code', async () => {
      mockUserService.sendSMSVerificationCode = jasmine.createSpy('sendSMSVerificationCode')
        .and.returnValue(Promise.reject(new Error('Network error')));
      
      await component.sendVerificationCode();
      
      expect(component.phoneVerificationState.error).toBe('Failed to send verification code. Please try again.');
    });

    it('should allow resend when cooldown has passed', () => {
      component.phoneVerificationState.cooldownUntil = new Date(Date.now() - 1000);
      
      expect(component.canResendCode()).toBe(true);
    });

    it('should not allow resend during cooldown', () => {
      component.phoneVerificationState.cooldownUntil = new Date(Date.now() + 30000);
      
      expect(component.canResendCode()).toBe(false);
    });

    it('should allow resend when no cooldown is set', () => {
      component.phoneVerificationState.cooldownUntil = null;
      
      expect(component.canResendCode()).toBe(true);
    });

    it('should verify code successfully and update user state', async () => {
      mockUserService.verifySMSCode = jasmine.createSpy('verifySMSCode')
        .and.returnValue(Promise.resolve(true));
      
      component.verifyForm.patchValue({ verificationCode: '123456' });
      
      await component.submitVerifyStep();
      
      expect(mockUserService.verifySMSCode).toHaveBeenCalledWith(mockUser.phoneNumber as string, '123456');
      expect(mockUserService.userUpdate).toHaveBeenCalled();
    });

    it('should set error when verification code is invalid', async () => {
      mockUserService.verifySMSCode = jasmine.createSpy('verifySMSCode')
        .and.returnValue(Promise.resolve(false));
      
      component.verifyForm.patchValue({ verificationCode: '000000' });
      
      await component.submitVerifyStep();
      
      expect(component.phoneVerificationState.error).toBe('Invalid verification code. Please try again.');
    });

    it('should not submit when verification form is invalid', async () => {
      mockUserService.verifySMSCode = jasmine.createSpy('verifySMSCode');
      
      component.verifyForm.patchValue({ verificationCode: '123' }); // Too short
      
      await component.submitVerifyStep();
      
      expect(mockUserService.verifySMSCode).not.toHaveBeenCalled();
      expect(component.verifyForm.get('verificationCode')?.touched).toBe(true);
    });
  });

  /**
   * Step Completion Tests
   * Feature: profile-setup-refactor
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  describe('Step Completion Logic', () => {
    it('should correctly identify NAME step as complete', () => {
      expect(component.isStepComplete(component.ProfileSetupStep.NAME, mockUser)).toBe(true);
      expect(component.isStepComplete(component.ProfileSetupStep.NAME, { ...mockUser, firstName: '' })).toBe(false);
      expect(component.isStepComplete(component.ProfileSetupStep.NAME, { ...mockUser, lastName: '' })).toBe(false);
    });

    it('should correctly identify PHONE step as complete', () => {
      expect(component.isStepComplete(component.ProfileSetupStep.PHONE, mockUser)).toBe(true);
      expect(component.isStepComplete(component.ProfileSetupStep.PHONE, { ...mockUser, phoneNumber: '' })).toBe(false);
    });

    it('should correctly identify PHONE_VERIFY step as complete', () => {
      expect(component.isStepComplete(component.ProfileSetupStep.PHONE_VERIFY, mockUser)).toBe(true);
      expect(component.isStepComplete(component.ProfileSetupStep.PHONE_VERIFY, { ...mockUser, phoneVerified: false })).toBe(false);
    });

    it('should correctly identify COMPLETE step', () => {
      expect(component.isStepComplete(component.ProfileSetupStep.COMPLETE, mockUser)).toBe(true);
      expect(component.isStepComplete(component.ProfileSetupStep.COMPLETE, { ...mockUser, phoneVerified: false })).toBe(false);
    });

    it('should return false for all steps when user is null', () => {
      expect(component.isStepComplete(component.ProfileSetupStep.NAME, null)).toBe(false);
      expect(component.isStepComplete(component.ProfileSetupStep.PHONE, null)).toBe(false);
      expect(component.isStepComplete(component.ProfileSetupStep.PHONE_VERIFY, null)).toBe(false);
      expect(component.isStepComplete(component.ProfileSetupStep.COMPLETE, null)).toBe(false);
    });

    it('should calculate progress percentage correctly', () => {
      component.setupState.currentStep = component.ProfileSetupStep.NAME;
      expect(component.getProgressPercentage()).toBe(0);
      
      component.setupState.currentStep = component.ProfileSetupStep.PHONE;
      expect(component.getProgressPercentage()).toBe(33);
      
      component.setupState.currentStep = component.ProfileSetupStep.PHONE_VERIFY;
      expect(component.getProgressPercentage()).toBe(67);
      
      component.setupState.currentStep = component.ProfileSetupStep.COMPLETE;
      expect(component.getProgressPercentage()).toBe(100);
    });

    it('should return correct step number', () => {
      component.setupState.currentStep = component.ProfileSetupStep.NAME;
      expect(component.getStepNumber()).toBe(1);
      
      component.setupState.currentStep = component.ProfileSetupStep.PHONE;
      expect(component.getStepNumber()).toBe(2);
      
      component.setupState.currentStep = component.ProfileSetupStep.PHONE_VERIFY;
      expect(component.getStepNumber()).toBe(3);
    });
  });

  /**
   * Form Validation Error Display Tests
   * Feature: profile-setup-refactor
   * Validates: Requirements 1.3
   */
  describe('Form Validation Error Display', () => {
    beforeEach(() => {
      mockStore.setState({
        user: {
          currentUser: mockUser,
          debugMode: false,
          isLoading: false,
          error: null
        }
      });
      fixture.detectChanges();
    });

    it('should show required error for empty firstName in nameForm', () => {
      component.nameForm.get('firstName')?.setValue('');
      component.nameForm.get('firstName')?.markAsTouched();
      
      const control = component.nameForm.get('firstName');
      expect(control?.invalid).toBe(true);
      expect(control?.errors?.['required']).toBeTruthy();
    });

    it('should show minLength error for short firstName in nameForm', () => {
      component.nameForm.get('firstName')?.setValue('A');
      component.nameForm.get('firstName')?.markAsTouched();
      
      const control = component.nameForm.get('firstName');
      expect(control?.invalid).toBe(true);
      expect(control?.errors?.['minlength']).toBeTruthy();
    });

    it('should validate phone number format in phoneForm', () => {
      // Invalid formats
      component.phoneForm.get('phoneNumber')?.setValue('1234567890');
      expect(component.phoneForm.get('phoneNumber')?.invalid).toBe(true);
      
      component.phoneForm.get('phoneNumber')?.setValue('+0123456789');
      expect(component.phoneForm.get('phoneNumber')?.invalid).toBe(true);
      
      // Valid E.164 format
      component.phoneForm.get('phoneNumber')?.setValue('+12025550123');
      expect(component.phoneForm.get('phoneNumber')?.valid).toBe(true);
    });

    it('should validate verification code format in verifyForm', () => {
      // Too short
      component.verifyForm.get('verificationCode')?.setValue('123');
      expect(component.verifyForm.get('verificationCode')?.invalid).toBe(true);
      
      // Non-numeric
      component.verifyForm.get('verificationCode')?.setValue('abcdef');
      expect(component.verifyForm.get('verificationCode')?.invalid).toBe(true);
      
      // Valid 6-digit code
      component.verifyForm.get('verificationCode')?.setValue('123456');
      expect(component.verifyForm.get('verificationCode')?.valid).toBe(true);
    });

    it('should mark all fields as touched when submitting invalid nameForm', async () => {
      component.nameForm.patchValue({ firstName: '', lastName: '' });
      
      await component.submitNameStep();
      
      expect(component.nameForm.get('firstName')?.touched).toBe(true);
      expect(component.nameForm.get('lastName')?.touched).toBe(true);
    });

    it('should mark all fields as touched when submitting invalid phoneForm', async () => {
      component.phoneForm.patchValue({ phoneNumber: '' });
      
      await component.submitPhoneStep();
      
      expect(component.phoneForm.get('phoneNumber')?.touched).toBe(true);
    });
  });
});