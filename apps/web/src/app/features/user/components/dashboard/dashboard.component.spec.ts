// file: apps/web/src/app/features/user/components/dashboard/dashboard.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the dashboard component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
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
  let mockStore: MockStore;
  let mockUserService: jasmine.SpyObj<UserService>;
  let mockRouter: jasmine.SpyObj<Router>;

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
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

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
});