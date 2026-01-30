// file: apps/web/src/app/layouts/user-layout/user-layout.component.spec.ts
// author: Kiro
// date: 2026-01-23
// description: Unit tests for UserLayoutComponent

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { faBuilding, faRocket, faUsers, faUser } from '@fortawesome/free-solid-svg-icons';
import { UserLayoutComponent } from './user-layout.component';
import { CognitoService } from '../../core/services/cognito.service';
import { UserGroup } from '../../core/enums/UserGroupEnum';
import { UserStatus } from '../../core/enums/UserStatusEnum';
import { IUsers } from '../../core/models/UsersModel';

describe('UserLayoutComponent', () => {
  let component: UserLayoutComponent;
  let fixture: ComponentFixture<UserLayoutComponent>;
  let mockStore: MockStore;
  let mockCognitoService: jasmine.SpyObj<CognitoService>;

  const createMockUser = (groups: string[]): IUsers => ({
    userId: '123',
    cognitoId: 'abc123',
    cognitoSub: 'cognito-sub-123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '+12345678901',
    phoneVerified: true,
    firstName: 'Test',
    lastName: 'User',
    groups: groups,
    status: UserStatus.Active,
    mfaEnabled: false,
    mfaSetupComplete: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const createInitialState = (user: IUsers | null, isAuthenticated: boolean) => ({
    user: {
      currentUser: user,
      isAuthenticated: isAuthenticated,
      error: null,
      isLoading: false,
      debugMode: false
    }
  });

  beforeEach(async () => {
    mockCognitoService = jasmine.createSpyObj('CognitoService', ['signOut']);

    await TestBed.configureTestingModule({
      imports: [UserLayoutComponent, RouterTestingModule],
      providers: [
        provideMockStore({ initialState: createInitialState(null, false) }),
        { provide: CognitoService, useValue: mockCognitoService }
      ]
    }).compileComponents();

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIcons(faBuilding, faRocket, faUsers, faUser);

    mockStore = TestBed.inject(MockStore);
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Navigation visibility for authenticated users', () => {
    beforeEach(() => {
      mockStore.setState(createInitialState(createMockUser([UserGroup.User]), true));
      fixture.detectChanges();
    });

    it('should show Dashboard link when authenticated', () => {
      const dashboardLink = fixture.nativeElement.querySelector('a[routerLink="dashboard"]');
      expect(dashboardLink).toBeTruthy();
    });

    it('should show Profile link when authenticated', () => {
      const profileLink = fixture.nativeElement.querySelector('a[routerLink="profile"]');
      expect(profileLink).toBeTruthy();
    });

    it('should show Sign Out link when authenticated', () => {
      const signOutLink = fixture.nativeElement.querySelector('a[role="button"]');
      expect(signOutLink).toBeTruthy();
      expect(signOutLink.textContent).toContain('Sign Out');
    });
  });

  describe('Navigation visibility for unauthenticated users', () => {
    beforeEach(() => {
      mockStore.setState(createInitialState(null, false));
      fixture.detectChanges();
    });

    it('should show Sign In link when not authenticated', () => {
      const signInLink = fixture.nativeElement.querySelector('a[routerLink="/authenticate"]');
      expect(signInLink).toBeTruthy();
    });

    it('should not show Dashboard link when not authenticated', () => {
      const dashboardLink = fixture.nativeElement.querySelector('a[routerLink="dashboard"]');
      expect(dashboardLink).toBeFalsy();
    });
  });

  describe('CUSTOMER-specific navigation items', () => {
    it('should show side nav for CUSTOMER users', () => {
      mockStore.setState(createInitialState(createMockUser([UserGroup.Customer]), true));
      fixture.detectChanges();

      const sideNav = fixture.nativeElement.querySelector('app-dashboard-side-nav');
      expect(sideNav).toBeTruthy();
    });

    it('should NOT show side nav for non-CUSTOMER users', () => {
      mockStore.setState(createInitialState(createMockUser([UserGroup.User]), true));
      fixture.detectChanges();

      const sideNav = fixture.nativeElement.querySelector('app-dashboard-side-nav');
      expect(sideNav).toBeFalsy();
    });

    it('should NOT show side nav for unauthenticated users', () => {
      mockStore.setState(createInitialState(null, false));
      fixture.detectChanges();

      const sideNav = fixture.nativeElement.querySelector('app-dashboard-side-nav');
      expect(sideNav).toBeFalsy();
    });
  });

  describe('Sign out functionality', () => {
    beforeEach(() => {
      mockStore.setState(createInitialState(createMockUser([UserGroup.User]), true));
      fixture.detectChanges();
    });

    it('should dispatch signout action when signOut is called', () => {
      spyOn(mockStore, 'dispatch');
      
      component.signOut();
      
      expect(mockStore.dispatch).toHaveBeenCalled();
    });
  });
});
