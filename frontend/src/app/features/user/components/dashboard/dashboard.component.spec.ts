// file: frontend/src/app/features/user/components/dashboard/dashboard.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the dashboard component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { DashboardComponent } from './dashboard.component';
import { User, UserGroup, UserStatus } from '../../../../core/models/user.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockStore: MockStore;

  const mockUser: User = {
    user_id: '123',
    cognito_id: 'abc123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '+12345678901',
    groups: [UserGroup.USER],
    status: UserStatus.ACTIVE,
    created_at: '2023-01-01T00:00:00Z'
  };

  const initialState = {
    auth: {
      currentUser: mockUser
    }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardComponent],
      providers: [
        provideMockStore({ initialState })
      ]
    }).compileComponents();

    mockStore = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user information from the store', () => {
    // Update the store with user info
    const userSelector = mockStore.overrideSelector('auth.currentUser', mockUser);
    mockStore.refreshState();
    fixture.detectChanges();

    // Get the component instance and check it gets the data
    expect(component).toBeTruthy();
    
    // Subscribe to the Observable to check its value
    let receivedUser: User | null = null;
    component.currentUser$.subscribe(user => {
      receivedUser = user;
    });
    
    expect(receivedUser).not.toBeNull();
  });
});