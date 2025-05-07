// file: frontend/src/app/features/user/components/dashboard/dashboard.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the dashboard component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DashboardComponent } from './dashboard.component';
import { IUsers } from '../../../../core/models/Users.model';
import { UserStatus } from '../../../../core/models/UserStatus.enum';
import { UserGroup } from '../../../../core/models/UserGroup.enum';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockStore: MockStore;

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

  const initialState = {
    auth: {
      currentUser: mockUser,
      error: null,
      isLoading: false
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DashboardComponent ],
      providers: [
        provideMockStore({ initialState })
      ]
    })
    .compileComponents();

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