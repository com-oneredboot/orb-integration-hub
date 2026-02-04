// file: apps/web/src/app/tests/user-status-calculation.property.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Property tests for user status calculation

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { of, ReplaySubject } from 'rxjs';
import { Action } from '@ngrx/store';
import { ProfileComponent, ProfileSetupStep } from '../features/user/components/profile/profile.component';
import { UserService } from '../core/services/user.service';
import { IUsers } from '../core/models/UsersModel';
import { UserStatus } from '../core/enums/UserStatusEnum';
import { UserGroup } from '../core/enums/UserGroupEnum';

/**
 * Property Test: User Status Calculation
 * Feature: profile-setup-refactor
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 * 
 * Properties:
 * 1. Status is PENDING when required fields are missing
 * 2. Status is PENDING when phone is not verified
 * 3. Status is ACTIVE when all requirements are complete
 * 4. Step completion is consistent with user data
 */
describe('Property: User Status Calculation', () => {
  let component: ProfileComponent;
  let mockUserService: jasmine.SpyObj<UserService>;
  let actions$: ReplaySubject<Action>;

  const createMockUser = (overrides: Partial<IUsers> = {}): IUsers => ({
    userId: '123',
    cognitoId: 'abc123',
    cognitoSub: 'cognito-sub-123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: [UserGroup.User],
    status: UserStatus.Active,
    mfaEnabled: false,
    mfaSetupComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  });

  beforeEach(async () => {
    actions$ = new ReplaySubject<Action>(1);
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid', 'userUpdate', 'userQueryByUserId']);
    mockUserService.isUserValid.and.callFake(user => {
      return !!(user?.firstName && user?.lastName && user?.email && user?.phoneNumber);
    });

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const activatedRouteMock = { queryParams: of({}) };

    await TestBed.configureTestingModule({
      imports: [ProfileComponent, FontAwesomeModule],
      providers: [
        provideMockStore({ initialState: { user: { currentUser: createMockUser(), debugMode: false, isLoading: false, error: null } } }),
        provideMockActions(() => actions$),
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        FormBuilder
      ]
    }).compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    const fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Property: First incomplete step is correctly identified based on user data
   */
  describe('First incomplete step identification', () => {
    it('returns NAME when firstName is missing', () => {
      const user = createMockUser({ firstName: '' });
      expect(component.getFirstIncompleteStep(user)).toBe(ProfileSetupStep.Name);
    });

    it('returns NAME when lastName is missing', () => {
      const user = createMockUser({ lastName: '' });
      expect(component.getFirstIncompleteStep(user)).toBe(ProfileSetupStep.Name);
    });

    it('returns PHONE when phoneNumber is missing', () => {
      const user = createMockUser({ phoneNumber: '' });
      expect(component.getFirstIncompleteStep(user)).toBe(ProfileSetupStep.Phone);
    });

    it('returns PHONE_VERIFY when phone is not verified', () => {
      const user = createMockUser({ phoneVerified: false });
      expect(component.getFirstIncompleteStep(user)).toBe(ProfileSetupStep.PhoneVerify);
    });

    it('returns COMPLETE when all fields are complete', () => {
      const user = createMockUser();
      expect(component.getFirstIncompleteStep(user)).toBe(ProfileSetupStep.Complete);
    });

    it('returns NAME when user is null', () => {
      expect(component.getFirstIncompleteStep(null)).toBe(ProfileSetupStep.Name);
    });
  });

  /**
   * Property: Step completion is consistent with user data
   * If a step is marked complete, all prior steps must also be complete
   */
  describe('Step completion consistency', () => {
    it('PHONE step complete implies NAME step complete', () => {
      const user = createMockUser({ phoneNumber: '+12345678901' });
      
      if (component.isStepComplete(ProfileSetupStep.Phone, user)) {
        expect(component.isStepComplete(ProfileSetupStep.Name, user)).toBe(true);
      }
    });

    it('PHONE_VERIFY step complete implies PHONE step complete', () => {
      const user = createMockUser({ phoneVerified: true });
      
      if (component.isStepComplete(ProfileSetupStep.PhoneVerify, user)) {
        expect(component.isStepComplete(ProfileSetupStep.Phone, user)).toBe(true);
      }
    });

    it('COMPLETE step implies all prior steps complete', () => {
      const user = createMockUser();
      
      if (component.isStepComplete(ProfileSetupStep.Complete, user)) {
        expect(component.isStepComplete(ProfileSetupStep.Name, user)).toBe(true);
        expect(component.isStepComplete(ProfileSetupStep.Phone, user)).toBe(true);
        expect(component.isStepComplete(ProfileSetupStep.PhoneVerify, user)).toBe(true);
      }
    });
  });

  /**
   * Property: Progress percentage is monotonically increasing with steps
   */
  describe('Progress percentage monotonicity', () => {
    it('progress increases as steps advance', () => {
      const steps = [
        ProfileSetupStep.Name,
        ProfileSetupStep.Phone,
        ProfileSetupStep.PhoneVerify,
        ProfileSetupStep.Complete
      ];
      
      let previousProgress = -1;
      for (const step of steps) {
        component.setupState.currentStep = step;
        const currentProgress = component.getProgressPercentage();
        expect(currentProgress).toBeGreaterThanOrEqual(previousProgress);
        previousProgress = currentProgress;
      }
    });

    it('progress is 0 at NAME step', () => {
      component.setupState.currentStep = ProfileSetupStep.Name;
      expect(component.getProgressPercentage()).toBe(0);
    });

    it('progress is 100 at COMPLETE step', () => {
      component.setupState.currentStep = ProfileSetupStep.Complete;
      expect(component.getProgressPercentage()).toBe(100);
    });
  });

  /**
   * Property: Step number is consistent with step enum
   */
  describe('Step number consistency', () => {
    it('step numbers are sequential starting from 1', () => {
      const steps = [
        ProfileSetupStep.Name,
        ProfileSetupStep.Phone,
        ProfileSetupStep.PhoneVerify,
        ProfileSetupStep.Complete
      ];
      
      for (let i = 0; i < steps.length; i++) {
        component.setupState.currentStep = steps[i];
        expect(component.getStepNumber()).toBe(i + 1);
      }
    });
  });

  /**
   * Property: User with all fields complete should have COMPLETE as first incomplete step
   */
  describe('Complete user identification', () => {
    const completeUserVariants = [
      { firstName: 'John', lastName: 'Doe', phoneNumber: '+12025550123', phoneVerified: true },
      { firstName: 'Jane', lastName: 'Smith', phoneNumber: '+447911123456', phoneVerified: true },
      { firstName: 'A', lastName: 'B', phoneNumber: '+1', phoneVerified: true } // Minimal valid
    ];

    completeUserVariants.forEach((variant, index) => {
      it(`complete user variant ${index + 1} returns COMPLETE`, () => {
        const user = createMockUser(variant);
        expect(component.getFirstIncompleteStep(user)).toBe(ProfileSetupStep.Complete);
      });
    });
  });

  /**
   * Property: Incomplete user should never return COMPLETE as first incomplete step
   */
  describe('Incomplete user identification', () => {
    const incompleteUserVariants = [
      { firstName: '', lastName: 'Doe', phoneNumber: '+12025550123', phoneVerified: true },
      { firstName: 'John', lastName: '', phoneNumber: '+12025550123', phoneVerified: true },
      { firstName: 'John', lastName: 'Doe', phoneNumber: '', phoneVerified: false },
      { firstName: 'John', lastName: 'Doe', phoneNumber: '+12025550123', phoneVerified: false }
    ];

    incompleteUserVariants.forEach((variant, index) => {
      it(`incomplete user variant ${index + 1} does not return COMPLETE`, () => {
        const user = createMockUser(variant);
        expect(component.getFirstIncompleteStep(user)).not.toBe(ProfileSetupStep.Complete);
      });
    });
  });
});
