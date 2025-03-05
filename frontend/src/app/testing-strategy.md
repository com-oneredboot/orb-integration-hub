# Testing Strategy for ORB Integration Hub

## Overview

This document outlines the recommended approach for testing the ORB Integration Hub frontend. These guidelines replace the previous pattern of using in-app mock data for testing and development.

## Testing Approaches

### Unit Tests

For isolated component and service testing:

1. **Test Files**: Co-locate test files with implementation files (*.spec.ts)
2. **Test Framework**: Use Angular Testing Module and Jasmine
3. **Mocking**: Use jasmine spies and mock providers instead of in-app mocks
4. **Coverage**: Aim for >80% code coverage

Example service test:

```typescript
describe('UserService', () => {
  let service: UserService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let cognitoServiceSpy: jasmine.SpyObj<CognitoService>;
  let storeSpy: jasmine.SpyObj<Store>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['query', 'mutate']);
    const cognitoSpy = jasmine.createSpyObj('CognitoService', ['createCognitoUser']);
    const storeSpyObj = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: ApiService, useValue: apiSpy },
        { provide: CognitoService, useValue: cognitoSpy },
        { provide: Store, useValue: storeSpyObj }
      ]
    });
    
    service = TestBed.inject(UserService);
    apiServiceSpy = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    cognitoServiceSpy = TestBed.inject(CognitoService) as jasmine.SpyObj<CognitoService>;
    storeSpy = TestBed.inject(Store) as jasmine.SpyObj<Store>;
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });

  it('should check if user exists', async () => {
    const mockResponse = {
      data: {
        userQueryById: {
          status_code: 200,
          user: { user_id: '123' },
          message: 'User found'
        }
      }
    };
    
    apiServiceSpy.query.and.returnValue(Promise.resolve(mockResponse));
    
    const result = await service.userExists({ email: 'test@example.com' });
    
    expect(result).toBeTrue();
    expect(apiServiceSpy.query).toHaveBeenCalledWith(
      jasmine.any(Object),
      { input: { email: 'test@example.com' } },
      'apiKey'
    );
  });
  
  // Additional tests...
});
```

### Integration Tests

For testing component interactions:

1. **Component Harnesses**: Use Angular Component Test Harnesses
2. **Service Mocks**: Create dedicated mock services for testing
3. **API Mocks**: Use HttpTestingController to intercept HTTP requests

Example component test:

```typescript
describe('ProfileComponent', () => {
  let component: ProfileComponent;
  let fixture: ComponentFixture<ProfileComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let router: Router;
  
  const mockUser: User = {
    user_id: '123',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    cognito_id: 'cognito-123',
    phone_number: '+1234567890',
    phone_verified: true,
    groups: [UserGroups.USER],
    status: UserStatus.ACTIVE,
    created_at: Date.now()
  };

  beforeEach(async () => {
    const userSpy = jasmine.createSpyObj('UserService', ['userUpdate', 'isUserValid']);
    
    await TestBed.configureTestingModule({
      declarations: [ProfileComponent],
      imports: [
        ReactiveFormsModule,
        RouterTestingModule,
        // Other imports...
      ],
      providers: [
        { provide: UserService, useValue: userSpy },
        provideMockStore({
          selectors: [
            { selector: fromAuth.selectCurrentUser, value: mockUser },
            { selector: fromAuth.selectDebugMode, value: false }
          ]
        })
      ]
    }).compileComponents();
    
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
  it('should load user data into form', () => {
    expect(component.profileForm.get('firstName')?.value).toBe('Test');
    expect(component.profileForm.get('lastName')?.value).toBe('User');
    expect(component.profileForm.get('email')?.value).toBe('test@example.com');
  });
  
  // Additional tests...
});
```

### E2E Tests

For end-to-end flow testing:

1. **Framework**: Use Cypress or Playwright
2. **API Mocking**: Use Cypress Intercept or equivalent
3. **Test Data**: Create specific test users in a test environment

Example E2E test:

```typescript
describe('User Authentication', () => {
  beforeEach(() => {
    // Set up API mocks
    cy.intercept('POST', '**/graphql', (req) => {
      if (req.body.query.includes('userExist')) {
        req.reply({
          data: {
            userQueryById: {
              status_code: 200,
              user: { user_id: 'test-id' },
              message: 'User found'
            }
          }
        });
      }
    }).as('userExistQuery');
  });

  it('should allow user to sign in', () => {
    cy.visit('/authenticate');
    
    cy.get('[data-test="email-input"]').type('test@example.com');
    cy.get('[data-test="next-button"]').click();
    
    cy.wait('@userExistQuery');
    
    cy.get('[data-test="password-input"]').type('TestPassword123!');
    cy.get('[data-test="sign-in-button"]').click();
    
    cy.url().should('include', '/dashboard');
  });
});
```

## Development Testing

For local development:

1. **Test Environment**: Set up a dedicated development environment
2. **Test Data**: Create test users in the development environment
3. **API Testing**: Use tools like Postman to test API endpoints

## Authentication Testing

1. **Mock Auth Provider**: Create a dedicated test auth provider
2. **Auth Interceptor**: Implement a test auth interceptor
3. **User Roles**: Test with different user roles

## Benefits Over In-App Mocks

1. **Reliability**: Tests match actual usage patterns
2. **Maintainability**: No duplicated mock logic in app code
3. **Separation of Concerns**: Test code lives in test files
4. **Predictability**: Consistent behavior across environments

## Implementation Plan

1. Remove in-app mocks and fallbacks
2. Create proper test utilities
3. Implement unit tests for all services
4. Add component integration tests
5. Develop E2E test suite
6. Set up CI/CD pipeline for automated testing