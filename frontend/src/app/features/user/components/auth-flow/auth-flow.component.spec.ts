// file: frontend/src/app/features/user/components/auth-flow/auth-flow.component.spec.ts
// author: Corey Dale Peters
// date: 2025-02-24
// description: Unit tests for the auth-flow component

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { AuthFlowComponent } from './auth-flow.component';
import { UserService } from '../../../../core/services/user.service';
import { IUsers, UsersCreateInput, UsersResponse } from '../../../../core/models/Users.model';
import { UserStatus } from '../../../../core/models/UserStatus.enum';
import { UserGroup } from '../../../../core/models/UserGroup.enum';
import { Router } from '@angular/router';

describe('AuthFlowComponent', () => {
  let component: AuthFlowComponent;
  let fixture: ComponentFixture<AuthFlowComponent>;
  let userService: jasmine.SpyObj<UserService>;
  let store: jasmine.SpyObj<Store>;
  let router: jasmine.SpyObj<Router>;

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

  const mockCreateInput: UsersCreateInput = {
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

  const mockResponse: UsersResponse = {
    statusCode: 200,
    message: 'Success',
    data: mockUser
  };

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', ['userCreate']);
    userServiceSpy.userCreate.and.returnValue(Promise.resolve(mockResponse));

    const storeSpy = jasmine.createSpyObj('Store', ['select']);
    storeSpy.select.and.returnValue(of(mockUser));

    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [ AuthFlowComponent ],
      imports: [ ReactiveFormsModule ],
      providers: [
        FormBuilder,
        { provide: UserService, useValue: userServiceSpy },
        { provide: Store, useValue: storeSpy },
        { provide: Router, useValue: routerSpy }
      ]
    })
    .compileComponents();

    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    store = TestBed.inject(Store) as jasmine.SpyObj<Store>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AuthFlowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should create user', async () => {
    const password = 'TestPassword123!';
    userService.userCreate.and.returnValue(Promise.resolve(mockResponse));

    component.signupForm.patchValue({
      email: 'test@example.com',
      password: password,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+12345678901'
    });

    await component.onSubmit();
    expect(userService.userCreate).toHaveBeenCalledWith(mockCreateInput, password);
  });
});