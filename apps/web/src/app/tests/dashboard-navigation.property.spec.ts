// file: apps/web/src/app/tests/dashboard-navigation.property.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Property tests for dashboard navigation consistency

import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { DashboardComponent } from '../features/user/components/dashboard/dashboard.component';
import { UserService } from '../core/services/user.service';
import { IUsers } from '../core/models/UsersModel';
import { UserStatus } from '../core/enums/UserStatusEnum';
import { UserGroup } from '../core/enums/UserGroupEnum';

/**
 * Property Test: Dashboard Navigation Consistency
 * Feature: profile-setup-refactor
 * Validates: Requirements 6.1, 6.4
 * 
 * Property: All profile-related navigation methods should navigate to /profile
 * with appropriate query parameters, never to /authenticate for profile items.
 */
describe('Property: Dashboard Navigation Consistency', () => {
  let component: DashboardComponent;
  let mockUserService: jasmine.SpyObj<UserService>;
  let router: Router;

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

  const initialState = {
    user: {
      currentUser: createMockUser(),
      error: null,
      isLoading: false,
      debugMode: false
    }
  };

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid']);
    mockUserService.isUserValid.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, FontAwesomeModule, RouterTestingModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: UserService, useValue: mockUserService }
      ]
    }).compileComponents();

    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    router = TestBed.inject(Router);
    const fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /**
   * Property: Profile navigation methods always navigate to /profile
   */
  describe('Profile navigation targets /profile', () => {
    it('goToProfile navigates to /profile without query params', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfile();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/profile']);
      // Should NOT have query params for basic profile view
      expect(navigateSpy).not.toHaveBeenCalledWith(jasmine.anything(), jasmine.objectContaining({
        queryParams: jasmine.anything()
      }));
    });

    it('goToProfileSetup navigates to /profile with setup mode', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfileSetup();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/profile'], {
        queryParams: { mode: 'setup', startFrom: 'incomplete' }
      });
    });

    it('goToPhoneVerification navigates to /profile (not /authenticate)', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToPhoneVerification();
      
      // Should navigate to profile, not authenticate
      expect(navigateSpy).toHaveBeenCalledWith(['/profile'], jasmine.anything());
      expect(navigateSpy).not.toHaveBeenCalledWith(['/authenticate']);
    });
  });

  /**
   * Property: Query parameters are consistent across profile setup methods
   */
  describe('Query parameter consistency', () => {
    it('setup methods use consistent query param structure', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfileSetup();
      const setupCall = navigateSpy.calls.mostRecent();
      
      navigateSpy.calls.reset();
      component.goToPhoneVerification();
      const phoneCall = navigateSpy.calls.mostRecent();
      
      // Both should have the same query param structure
      expect(setupCall.args[1]).toEqual(phoneCall.args[1]);
    });
  });

  /**
   * Property: Auth-related navigation still goes to /authenticate
   */
  describe('Auth navigation targets /authenticate', () => {
    it('goToEmailVerification navigates to /authenticate', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToEmailVerification();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/authenticate']);
    });

    it('goToSecuritySettings navigates to /authenticate', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToSecuritySettings();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/authenticate']);
    });
  });

  /**
   * Property: Navigation methods are idempotent
   * Calling the same method multiple times should produce the same navigation
   */
  describe('Navigation idempotency', () => {
    it('repeated calls to goToProfile produce same navigation', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfile();
      const firstCall = navigateSpy.calls.mostRecent().args;
      
      component.goToProfile();
      const secondCall = navigateSpy.calls.mostRecent().args;
      
      expect(firstCall).toEqual(secondCall);
    });

    it('repeated calls to goToProfileSetup produce same navigation', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfileSetup();
      const firstCall = navigateSpy.calls.mostRecent().args;
      
      component.goToProfileSetup();
      const secondCall = navigateSpy.calls.mostRecent().args;
      
      expect(firstCall).toEqual(secondCall);
    });
  });
});
