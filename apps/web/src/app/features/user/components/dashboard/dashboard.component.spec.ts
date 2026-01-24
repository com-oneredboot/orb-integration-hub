// file: apps/web/src/app/features/user/components/dashboard/dashboard.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the dashboard component - CTA Hub redesign

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { DashboardComponent } from './dashboard.component';
import { UserService } from '../../../../core/services/user.service';
import { DashboardCtaService } from '../../services/dashboard-cta.service';
import { IUsers } from '../../../../core/models/UsersModel';
import { UserStatus } from '../../../../core/enums/UserStatusEnum';
import { UserGroup } from '../../../../core/enums/UserGroupEnum';
import { CtaCard, SideNavItem } from './dashboard.types';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockCtaService: jasmine.SpyObj<DashboardCtaService>;
  let mockStore: MockStore;

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

  const mockCtaCards: CtaCard[] = [
    {
      id: 'health-mfa',
      icon: 'shield-alt',
      title: 'Secure Your Account',
      description: 'Enable MFA',
      actionLabel: 'Setup MFA',
      actionRoute: '/authenticate',
      priority: 40,
      category: 'health'
    },
    {
      id: 'benefit-orgs',
      icon: 'building',
      title: 'Manage Organizations',
      description: 'Create and manage business entities',
      actionLabel: 'Upgrade Now',
      actionRoute: '/upgrade',
      priority: 100,
      category: 'benefit'
    }
  ];

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

    mockCtaService = jasmine.createSpyObj('DashboardCtaService', ['getCtaCards']);
    mockCtaService.getCtaCards.and.returnValue(mockCtaCards);

    await TestBed.configureTestingModule({
      imports: [DashboardComponent, FontAwesomeModule, RouterTestingModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: UserService, useValue: mockUserService },
        { provide: DashboardCtaService, useValue: mockCtaService }
      ]
    }).compileComponents();

    // Add FontAwesome icons to library
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    mockStore = TestBed.inject(MockStore);
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
    component.currentUser$.subscribe(user => {
      expect(user).toEqual(mockUser);
      done();
    });
  });

  describe('CTA Cards', () => {
    it('should have ctaCards$ Observable', (done) => {
      component.ctaCards$.subscribe(cards => {
        expect(cards).toEqual(mockCtaCards);
        done();
      });
    });

    it('should call DashboardCtaService.getCtaCards with user', () => {
      expect(mockCtaService.getCtaCards).toHaveBeenCalled();
    });

    it('should track cards by ID', () => {
      const card = mockCtaCards[0];
      expect(component.trackByCardId(0, card)).toBe(card.id);
    });

    it('should log CTA card action on onCtaCardAction', () => {
      const consoleSpy = spyOn(console, 'log');
      const card = mockCtaCards[0];
      
      component.onCtaCardAction(card);
      
      expect(consoleSpy).toHaveBeenCalledWith('[Dashboard] CTA card action:', card.id, card.title);
    });
  });

  describe('Side Navigation', () => {
    it('should log side nav item click on onSideNavItemClicked', () => {
      const consoleSpy = spyOn(console, 'log');
      const item: SideNavItem = {
        id: 'profile',
        icon: 'user',
        tooltip: 'Edit Profile',
        route: '/profile'
      };
      
      component.onSideNavItemClicked(item);
      
      expect(consoleSpy).toHaveBeenCalledWith('[Dashboard] Side nav item clicked:', item.id, item.tooltip);
    });
  });

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

    it('should return true for isCustomerUser when user has CUSTOMER group', () => {
      const customerUser = { ...mockUser, groups: [UserGroup.Customer] };
      expect(component.isCustomerUser(customerUser)).toBe(true);
    });

    it('should return false for isCustomerUser when user does not have CUSTOMER group', () => {
      expect(component.isCustomerUser(mockUser)).toBe(false);
    });
  });

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

  describe('Debug Context', () => {
    it('should provide debug context with CTA card counts', () => {
      const context = component.debugContext;
      
      expect(context.page).toBe('Dashboard');
      expect(context.storeState).toBeDefined();
      if (context.storeState) {
        expect(context.storeState['ctaCardCount']).toBeDefined();
        expect(context.storeState['healthCardCount']).toBeDefined();
        expect(context.storeState['benefitCardCount']).toBeDefined();
        expect(context.storeState['actionCardCount']).toBeDefined();
      }
    });
  });

  describe('Utility Methods', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-01-15T12:00:00Z');
      const formatted = component.formatDate(date);
      expect(formatted).toContain('January');
      expect(formatted).toContain('2025');
    });

    it('should return "Not available" for empty date', () => {
      expect(component.formatDate('')).toBe('Not available');
    });

    it('should delegate isUserValid to UserService', () => {
      component.isUserValid(mockUser);
      expect(mockUserService.isUserValid).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Template Rendering', () => {
    it('should render the page header', () => {
      const header = fixture.nativeElement.querySelector('.orb-page-header');
      expect(header).toBeTruthy();
    });

    it('should render the side navigation', () => {
      const sideNav = fixture.nativeElement.querySelector('app-dashboard-side-nav');
      expect(sideNav).toBeTruthy();
    });

    it('should render CTA cards', () => {
      const ctaCards = fixture.nativeElement.querySelectorAll('app-cta-card');
      expect(ctaCards.length).toBe(mockCtaCards.length);
    });

    it('should display status badge', () => {
      const badge = fixture.nativeElement.querySelector('.orb-header-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toContain('Account Active');
    });
  });

  describe('Loading State', () => {
    it('should show loading overlay when isLoading is true', () => {
      mockStore.setState({
        user: {
          ...initialState.user,
          isLoading: true
        }
      });
      fixture.detectChanges();
      
      const loadingOverlay = fixture.nativeElement.querySelector('.orb-loading-overlay');
      expect(loadingOverlay).toBeTruthy();
    });

    it('should hide loading overlay when isLoading is false', () => {
      const loadingOverlay = fixture.nativeElement.querySelector('.orb-loading-overlay');
      expect(loadingOverlay).toBeFalsy();
    });
  });
});
