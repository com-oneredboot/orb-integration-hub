// file: apps/web/src/app/features/user/components/dashboard/dashboard.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the dashboard component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { DashboardComponent } from './dashboard.component';
import { UserService } from '../../../../core/services/user.service';
import { IUsers } from '../../../../core/models/UsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { UserGroup } from '../../../../core/enums/UserGroupEnum';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let mockStore: MockStore;
  let router: Router;

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
    groups: [UserGroup.User],
    status: UserStatus.Active,
    mfaEnabled: false,
    mfaSetupComplete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const initialState = {
    user: {
      currentUser: mockUser,
      error: null,
      isLoading: false,
      debugMode: false
    }
  };

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid']);
    mockUserService.isUserValid.and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ DashboardComponent, FontAwesomeModule, RouterTestingModule ],
      providers: [
        provideMockStore({ initialState }),
        { provide: UserService, useValue: mockUserService }
      ]
    })
    .compileComponents();

    // Add FontAwesome icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    mockStore = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have currentUser$ Observable', (done) => {
    // Subscribe to the Observable to check its value
    let receivedUser: IUsers | null = null;
    component.currentUser$.subscribe(user => {
      receivedUser = user;
      expect(receivedUser).toEqual(mockUser);
      done();
    });
  });

  /**
   * Dashboard Navigation Tests
   * Feature: profile-setup-refactor
   * Validates: Requirements 6.1, 6.4, 8.4
   */
  describe('Dashboard Navigation', () => {
    it('should navigate to profile page on goToProfile()', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfile();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/profile']);
    });

    it('should navigate to profile setup with correct query params on goToProfileSetup()', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToProfileSetup();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/profile'], {
        queryParams: { mode: 'setup', startFrom: 'incomplete' }
      });
    });

    it('should navigate to profile setup on goToPhoneVerification()', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToPhoneVerification();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/profile'], {
        queryParams: { mode: 'setup', startFrom: 'incomplete' }
      });
    });

    it('should navigate to authenticate on goToEmailVerification()', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToEmailVerification();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/authenticate']);
    });

    it('should navigate to authenticate on goToSecuritySettings()', () => {
      const navigateSpy = spyOn(router, 'navigate');
      
      component.goToSecuritySettings();
      
      expect(navigateSpy).toHaveBeenCalledWith(['/authenticate']);
    });
  });

  /**
   * Health Check Tests
   * Feature: profile-setup-refactor
   * Validates: Requirements 7.1, 7.2, 7.3, 7.4
   */
  describe('Health Check Methods', () => {
    it('should return true for hasValidName when user has first and last name', () => {
      expect(component.hasValidName(mockUser)).toBe(true);
    });

    it('should return false for hasValidName when user has no first name', () => {
      const userWithoutFirstName = { ...mockUser, firstName: '' };
      expect(component.hasValidName(userWithoutFirstName)).toBe(false);
    });

    it('should return false for hasValidName when user has no last name', () => {
      const userWithoutLastName = { ...mockUser, lastName: '' };
      expect(component.hasValidName(userWithoutLastName)).toBe(false);
    });

    it('should return false for hasValidName when user is null', () => {
      expect(component.hasValidName(null)).toBe(false);
    });

    it('should return true for hasHealthWarnings when user has incomplete profile', () => {
      const incompleteUser = { ...mockUser, phoneVerified: false };
      expect(component.hasHealthWarnings(incompleteUser)).toBe(true);
    });

    it('should return true for hasHealthWarnings when user is null', () => {
      expect(component.hasHealthWarnings(null)).toBe(true);
    });

    it('should return false for hasHealthWarnings when user has complete profile with MFA', () => {
      const completeUser = { ...mockUser, mfaEnabled: true, mfaSetupComplete: true };
      expect(component.hasHealthWarnings(completeUser)).toBe(false);
    });

    it('should return true for isCustomerUser when user has CUSTOMER group', () => {
      const customerUser = { ...mockUser, groups: [UserGroup.Customer] };
      expect(component.isCustomerUser(customerUser)).toBe(true);
    });

    it('should return false for isCustomerUser when user does not have CUSTOMER group', () => {
      expect(component.isCustomerUser(mockUser)).toBe(false);
    });
  });

  /**
   * Status Display Tests
   */
  describe('Status Display Methods', () => {
    it('should return correct status class for ACTIVE', () => {
      expect(component.getStatusClass('ACTIVE')).toBe('active');
    });

    it('should return correct status class for PENDING', () => {
      expect(component.getStatusClass('PENDING')).toBe('pending');
    });

    it('should return correct status class for INACTIVE', () => {
      expect(component.getStatusClass('INACTIVE')).toBe('suspended');
    });

    it('should return correct status icon for ACTIVE', () => {
      expect(component.getStatusIcon('ACTIVE')).toBe('check-circle');
    });

    it('should return correct status icon for PENDING', () => {
      expect(component.getStatusIcon('PENDING')).toBe('clock');
    });

    it('should return correct status label for ACTIVE', () => {
      expect(component.getStatusLabel('ACTIVE')).toBe('Account Active');
    });

    it('should return correct status label for PENDING', () => {
      expect(component.getStatusLabel('PENDING')).toBe('Account Pending');
    });
  });
});