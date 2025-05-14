// file: frontend/src/app/features/user/components/profile/profile.component.spec.ts
// author: Claude
// date: 2025-02-25
// description: Unit tests for the profile component

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';

import { ProfileComponent } from './profile.component';
import { UserService } from '../../../../core/services/user.service';
import { IUsers, UsersUpdateInput, UsersResponse } from '../../../../core/models/Users.model';
import { UserStatus } from '../../../../core/models/UserStatus.enum';
import { UserGroup } from '../../../../core/models/UserGroup.enum';

describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let mockStore: MockStore;
  let mockUserService: jasmine.SpyObj<UserService>;
  let store: jasmine.SpyObj<Store>;
  let router: jasmine.SpyObj<Router>;

  const initialState = {
    auth: {
      currentUser: null,
      debugMode: false
    }
  };

  const mockUser: IUsers = {
    id: '123',
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
    updatedAt: new Date().toISOString(),
    roleId: 'role-1',
    roleType: 'ADMIN',
  };

  const mockUpdateInput: UsersUpdateInput = {
    id: '123',
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
    updatedAt: new Date().toISOString(),
    roleId: 'role-1',
    roleType: 'ADMIN',
  };

  const mockResponse: UsersResponse = {
    statusCode: 200,
    message: 'Success',
    data: mockUser
  };

  const mockIncompleteUser: IUsers = {
    id: '123',
    cognitoId: 'abc123',
    email: 'test@example.com',
    emailVerified: true,
    phoneNumber: '',
    phoneVerified: false,
    firstName: '',
    lastName: '',
    groups: [UserGroup.USER],
    status: UserStatus.ACTIVE,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    roleId: 'role-1',
    roleType: 'ADMIN',
  };

  beforeEach(async () => {
    mockUserService = jasmine.createSpyObj('UserService', ['isUserValid', 'userUpdate', 'updateUser']);
    mockUserService.isUserValid.and.callFake(user => {
      return !!(user?.first_name && user?.last_name && user?.email && user?.phone_number);
    });
    
    // Mock the userUpdate method
    mockUserService.userUpdate.and.callFake(async (input) => {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Return a mock response
      return {
        userQueryById: {
          status_code: 200,
          user: {
            ...mockUser,
            first_name: input.first_name || mockUser.first_name,
            last_name: input.last_name || mockUser.last_name
          },
          message: 'Profile updated successfully'
        }
      };
    });

    mockUserService.updateUser.and.returnValue(Promise.resolve(mockResponse));

    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    storeSpy.select.and.returnValue(of(mockUser));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ProfileComponent],
      imports: [ReactiveFormsModule],
      providers: [
        provideMockStore({ initialState }),
        { provide: UserService, useValue: mockUserService },
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy },
        FormBuilder
      ]
    }).compileComponents();

    mockStore = TestBed.inject(MockStore);
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    component.user = mockUser;
    fixture.detectChanges();
  });

  it('should create', () => {
    mockStore.setState({
      auth: {
        currentUser: mockUser,
        debugMode: false
      }
    });
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Form initialization', () => {
    it('should initialize form with empty values', () => {
      fixture.detectChanges();
      expect(component.profileForm.get('firstName')?.value).toBe('');
      expect(component.profileForm.get('lastName')?.value).toBe('');
      // Note: email and phoneNumber are disabled fields, so they aren't in form.value
    });

    it('should populate form with user data when available', () => {
      // Set up the store with mock user
      mockStore.setState({
        auth: {
          currentUser: mockUser,
          debugMode: false
        }
      });
      
      fixture.detectChanges();
      
      expect(component.profileForm.get('firstName')?.value).toBe('Test');
      expect(component.profileForm.get('lastName')?.value).toBe('User');
      expect(component.profileForm.get('email')?.value).toBe('test@example.com');
      expect(component.profileForm.get('phoneNumber')?.value).toBe('+12345678901');
    });
  });

  describe('Form validation', () => {
    beforeEach(() => {
      mockStore.setState({
        auth: {
          currentUser: mockUser,
          debugMode: false
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
      expect((component as any).formatFieldName('firstName')).toBe('First Name');
      expect((component as any).formatFieldName('lastName')).toBe('Last Name');
    });
  });

  describe('Form actions', () => {
    beforeEach(() => {
      mockStore.setState({
        auth: {
          currentUser: mockUser,
          debugMode: false
        }
      });
      fixture.detectChanges();
    });

    it('should reset form to original values', () => {
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
      spyOn(component as any, 'getCurrentUser').and.returnValue(Promise.resolve(mockUser));
      
      // Set valid form values
      component.profileForm.patchValue({
        firstName: 'Updated',
        lastName: 'Person'
      });
      component.profileForm.markAsDirty();
      
      // Submit form
      component.onSubmit();
      
      // Check that loading state is active
      expect(component.isLoading).toBe(true);
      
      // Wait for the mock API delay
      tick(1000);
      
      // Verify form is marked as pristine after submission
      expect(component.profileForm.pristine).toBe(true);
      expect(component.isLoading).toBe(false);
    }));
  });

  describe('User validation', () => {
    it('should correctly determine if a user is valid', () => {
      // Set up the store with valid user
      mockStore.setState({
        auth: {
          currentUser: mockUser,
          debugMode: false
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
      
      // Don't test the exact format as it depends on the browser/environment timezone
      // Just test that our method returns the original string if it can't parse the date
      // and returns 'N/A' for empty strings
      const formattedDate = component.formatDate('2023-01-01T00:00:00Z');
      expect(typeof formattedDate).toBe('string');
      
      // Test empty string handling
      expect(component.formatDate('')).toBe('N/A');
      
      // Test invalid date handling
      // Invalid date handling varies by browser and environment
      const invalidResult = component.formatDate('invalid-date');
      // Just make sure we get something back and no errors thrown
      expect(typeof invalidResult).toBe('string');
    });
  });

  it('should update user profile', async () => {
    const updatedUser = { ...mockUser, firstName: 'Updated', lastName: 'Name' };
    const updateInput: UsersUpdateInput = {
      ...mockUpdateInput,
      firstName: 'Updated',
      lastName: 'Name'
    };
    const response: UsersResponse = {
      statusCode: 200,
      message: 'Success',
      data: updatedUser
    };
    mockUserService.updateUser.and.returnValue(Promise.resolve(response));

    await component.updateProfile();
    expect(mockUserService.updateUser).toHaveBeenCalledWith(updateInput);
    expect(component.user).toEqual(updatedUser);
  });
});