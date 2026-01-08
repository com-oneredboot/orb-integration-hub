/**
 * API Contract Testing between Frontend and Backend
 */

import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Pact, Matchers } from '@pact-foundation/pact';
import { ApiService } from '../../src/app/core/services/api.service';
import { getTestConfig } from '../config/test-config';

const { like, eachLike, term, iso8601DateTime } = Matchers;

describe('Frontend-Backend API Contract Tests', () => {
  let apiService: ApiService;
  let httpMock: HttpTestingController;
  let provider: Pact;
  const config = getTestConfig();

  beforeAll(() => {
    provider = new Pact({
      consumer: 'orb-integration-hub-frontend',
      provider: 'orb-integration-hub-backend',
      port: 1234,
      log: './integration-tests/logs/pact.log',
      dir: './integration-tests/pacts',
      logLevel: 'info'
    });

    return provider.setup();
  });

  afterAll(() => {
    return provider.finalize();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });

    apiService = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    return provider.verify();
  });

  describe('User Authentication Contracts', () => {
    it('should define contract for user sign-in request', () => {
      const expectedRequest = {
        email: 'test@example.com',
        password: 'SecureP@ssw0rd!'
      };

      const expectedResponse = {
        StatusCode: 200,
        Message: 'Authentication successful',
        Data: {
          accessToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          idToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          refreshToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
          expiresIn: like(3600),
          user: {
            id: like('user-123'),
            email: like(expectedRequest.email),
            groups: eachLike('USER')
          }
        }
      };

      return provider
        .given('a valid user exists')
        .uponReceiving('a sign-in request with valid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/auth/signin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedRequest
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: expectedResponse
        })
        .then(() => {
          return apiService.signIn(expectedRequest.email, expectedRequest.password)
            .then(response => {
              expect(response.StatusCode).toBe(200);
              expect(response.Data.accessToken).toBeDefined();
              expect(response.Data.user.email).toBe(expectedRequest.email);
            });
        });
    });

    it('should define contract for invalid credentials response', () => {
      const invalidRequest = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      const errorResponse = {
        StatusCode: 401,
        Message: 'Authentication failed',
        Data: null,
        Error: {
          code: 'INVALID_CREDENTIALS',
          details: 'Email or password is incorrect'
        }
      };

      return provider
        .given('a user with invalid credentials')
        .uponReceiving('a sign-in request with invalid credentials')
        .withRequest({
          method: 'POST',
          path: '/api/auth/signin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: invalidRequest
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: errorResponse
        })
        .then(() => {
          return apiService.signIn(invalidRequest.email, invalidRequest.password)
            .then(response => {
              expect(response.StatusCode).toBe(401);
              expect(response.Data).toBeNull();
              expect(response.Error.code).toBe('INVALID_CREDENTIALS');
            });
        });
    });
  });

  describe('User Registration Contracts', () => {
    it('should define contract for user registration request', () => {
      const registrationRequest = {
        email: 'newuser@example.com',
        password: 'NewUserP@ssw0rd!',
        firstName: 'New',
        lastName: 'User',
        phoneNumber: '+15551234567'
      };

      const registrationResponse = {
        StatusCode: 201,
        Message: 'User registered successfully',
        Data: {
          userId: like('user-456'),
          email: like(registrationRequest.email),
          status: like('PENDING_VERIFICATION'),
          verificationRequired: like(true)
        }
      };

      return provider
        .given('registration is allowed')
        .uponReceiving('a user registration request')
        .withRequest({
          method: 'POST',
          path: '/api/auth/register',
          headers: {
            'Content-Type': 'application/json'
          },
          body: registrationRequest
        })
        .willRespondWith({
          status: 201,
          headers: {
            'Content-Type': 'application/json'
          },
          body: registrationResponse
        })
        .then(() => {
          return apiService.registerUser(
            registrationRequest.email,
            registrationRequest.password,
            registrationRequest.firstName,
            registrationRequest.lastName,
            registrationRequest.phoneNumber
          ).then(response => {
            expect(response.StatusCode).toBe(201);
            expect(response.Data.userId).toBeDefined();
            expect(response.Data.email).toBe(registrationRequest.email);
          });
        });
    });

    it('should define contract for duplicate email registration', () => {
      const duplicateRequest = {
        email: 'existing@example.com',
        password: 'ExistingUserP@ssw0rd!',
        firstName: 'Existing',
        lastName: 'User',
        phoneNumber: '+15551234568'
      };

      const duplicateResponse = {
        StatusCode: 409,
        Message: 'User with this email already exists',
        Data: null,
        Error: {
          code: 'USER_ALREADY_EXISTS',
          details: 'An account with this email address already exists'
        }
      };

      return provider
        .given('a user with email existing@example.com already exists')
        .uponReceiving('a registration request for existing email')
        .withRequest({
          method: 'POST',
          path: '/api/auth/register',
          headers: {
            'Content-Type': 'application/json'
          },
          body: duplicateRequest
        })
        .willRespondWith({
          status: 409,
          headers: {
            'Content-Type': 'application/json'
          },
          body: duplicateResponse
        })
        .then(() => {
          return apiService.registerUser(
            duplicateRequest.email,
            duplicateRequest.password,
            duplicateRequest.firstName,
            duplicateRequest.lastName,
            duplicateRequest.phoneNumber
          ).then(response => {
            expect(response.StatusCode).toBe(409);
            expect(response.Error.code).toBe('USER_ALREADY_EXISTS');
          });
        });
    });
  });

  describe('SMS Verification Contracts', () => {
    it('should define contract for SMS code sending request', () => {
      const smsRequest = {
        phoneNumber: '+15551234567'
      };

      const smsResponse = {
        StatusCode: 200,
        Message: 'Verification code sent successfully',
        Data: {
          phoneNumber: like(smsRequest.phoneNumber),
          messageId: like('sms-msg-123'),
          expiresIn: like(300)
        }
      };

      return provider
        .given('SMS service is available')
        .uponReceiving('a request to send SMS verification code')
        .withRequest({
          method: 'POST',
          path: '/api/sms/send-verification',
          headers: {
            'Content-Type': 'application/json'
          },
          body: smsRequest
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: smsResponse
        })
        .then(() => {
          return apiService.sendSMSVerification(smsRequest.phoneNumber)
            .then(response => {
              expect(response.StatusCode).toBe(200);
              expect(response.Data.phoneNumber).toBe(smsRequest.phoneNumber);
              expect(response.Data.messageId).toBeDefined();
            });
        });
    });

    it('should define contract for SMS rate limiting response', () => {
      const rateLimitedRequest = {
        phoneNumber: '+15551234567'
      };

      const rateLimitResponse = {
        StatusCode: 429,
        Message: 'SMS rate limit exceeded',
        Data: null,
        Error: {
          code: 'RATE_LIMIT_EXCEEDED',
          details: 'Too many SMS requests for this phone number',
          retryAfter: like(3600)
        }
      };

      return provider
        .given('phone number +15551234567 has exceeded SMS rate limit')
        .uponReceiving('a request to send SMS when rate limited')
        .withRequest({
          method: 'POST',
          path: '/api/sms/send-verification',
          headers: {
            'Content-Type': 'application/json'
          },
          body: rateLimitedRequest
        })
        .willRespondWith({
          status: 429,
          headers: {
            'Content-Type': 'application/json'
          },
          body: rateLimitResponse
        })
        .then(() => {
          return apiService.sendSMSVerification(rateLimitedRequest.phoneNumber)
            .then(response => {
              expect(response.StatusCode).toBe(429);
              expect(response.Error.code).toBe('RATE_LIMIT_EXCEEDED');
              expect(response.Error.retryAfter).toBeDefined();
            });
        });
    });

    it('should define contract for SMS code verification request', () => {
      const verifyRequest = {
        phoneNumber: '+15551234567',
        code: '123456'
      };

      const verifyResponse = {
        StatusCode: 200,
        Message: 'Code verified successfully',
        Data: {
          phoneNumber: like(verifyRequest.phoneNumber),
          isValid: like(true),
          verifiedAt: iso8601DateTime()
        }
      };

      return provider
        .given('a valid verification code exists for phone +15551234567')
        .uponReceiving('a request to verify SMS code')
        .withRequest({
          method: 'POST',
          path: '/api/sms/verify-code',
          headers: {
            'Content-Type': 'application/json'
          },
          body: verifyRequest
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: verifyResponse
        })
        .then(() => {
          return apiService.verifySMSCode(verifyRequest.phoneNumber, verifyRequest.code)
            .then(response => {
              expect(response.StatusCode).toBe(200);
              expect(response.Data.isValid).toBe(true);
              expect(response.Data.verifiedAt).toBeDefined();
            });
        });
    });
  });

  describe('User Profile Contracts', () => {
    it('should define contract for user profile retrieval', () => {
      const profileResponse = {
        StatusCode: 200,
        Message: 'Profile retrieved successfully',
        Data: {
          user: {
            id: like('user-123'),
            email: like('user@example.com'),
            firstName: like('John'),
            lastName: like('Doe'),
            phoneNumber: like('+15551234567'),
            groups: eachLike('USER'),
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
            isVerified: like(true),
            lastLogin: iso8601DateTime()
          }
        }
      };

      return provider
        .given('an authenticated user exists')
        .uponReceiving('a request for user profile')
        .withRequest({
          method: 'GET',
          path: '/api/users/profile',
          headers: {
            'Authorization': term({
              matcher: '^Bearer [A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$',
              generate: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
            })
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: profileResponse
        })
        .then(() => {
          return apiService.getUserProfile()
            .then(response => {
              expect(response.StatusCode).toBe(200);
              expect(response.Data.user.id).toBeDefined();
              expect(response.Data.user.email).toBeDefined();
              expect(response.Data.user.groups).toContain('USER');
            });
        });
    });

    it('should define contract for user profile update', () => {
      const updateRequest = {
        firstName: 'Updated',
        lastName: 'Name',
        phoneNumber: '+15551234568'
      };

      const updateResponse = {
        StatusCode: 200,
        Message: 'Profile updated successfully',
        Data: {
          user: {
            id: like('user-123'),
            email: like('user@example.com'),
            firstName: like(updateRequest.firstName),
            lastName: like(updateRequest.lastName),
            phoneNumber: like(updateRequest.phoneNumber),
            updatedAt: iso8601DateTime()
          }
        }
      };

      return provider
        .given('an authenticated user exists')
        .uponReceiving('a request to update user profile')
        .withRequest({
          method: 'PUT',
          path: '/api/users/profile',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': term({
              matcher: '^Bearer [A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$',
              generate: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
            })
          },
          body: updateRequest
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: updateResponse
        })
        .then(() => {
          return apiService.updateUserProfile(updateRequest)
            .then(response => {
              expect(response.StatusCode).toBe(200);
              expect(response.Data.user.firstName).toBe(updateRequest.firstName);
              expect(response.Data.user.lastName).toBe(updateRequest.lastName);
            });
        });
    });
  });

  describe('GraphQL API Contracts', () => {
    it('should define contract for GraphQL user query', () => {
      const graphqlRequest = {
        query: `
          query GetUser($id: ID!) {
            getUser(id: $id) {
              id
              email
              firstName
              lastName
              groups
            }
          }
        `,
        variables: {
          id: 'user-123'
        }
      };

      const graphqlResponse = {
        data: {
          getUser: {
            id: like('user-123'),
            email: like('user@example.com'),
            firstName: like('John'),
            lastName: like('Doe'),
            groups: eachLike('USER')
          }
        }
      };

      return provider
        .given('a user with ID user-123 exists')
        .uponReceiving('a GraphQL query for user details')
        .withRequest({
          method: 'POST',
          path: '/graphql',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': term({
              matcher: '^Bearer [A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$',
              generate: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
            })
          },
          body: graphqlRequest
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: graphqlResponse
        })
        .then(() => {
          return apiService.graphqlRequest(graphqlRequest.query, graphqlRequest.variables)
            .then(response => {
              expect(response.data.getUser.id).toBe('user-123');
              expect(response.data.getUser.email).toBeDefined();
              expect(response.data.getUser.groups).toContain('USER');
            });
        });
    });

    it('should define contract for GraphQL mutation', () => {
      const createUserMutation = {
        query: `
          mutation CreateUser($input: CreateUserInput!) {
            createUser(input: $input) {
              id
              email
              firstName
              lastName
              status
            }
          }
        `,
        variables: {
          input: {
            email: 'newuser@example.com',
            firstName: 'New',
            lastName: 'User'
          }
        }
      };

      const mutationResponse = {
        data: {
          createUser: {
            id: like('user-456'),
            email: like('newuser@example.com'),
            firstName: like('New'),
            lastName: like('User'),
            status: like('ACTIVE')
          }
        }
      };

      return provider
        .given('user creation is allowed')
        .uponReceiving('a GraphQL mutation to create user')
        .withRequest({
          method: 'POST',
          path: '/graphql',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': term({
              matcher: '^Bearer [A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+\\.[A-Za-z0-9\\-_]+$',
              generate: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
            })
          },
          body: createUserMutation
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: mutationResponse
        })
        .then(() => {
          return apiService.graphqlRequest(createUserMutation.query, createUserMutation.variables)
            .then(response => {
              expect(response.data.createUser.id).toBeDefined();
              expect(response.data.createUser.email).toBe('newuser@example.com');
              expect(response.data.createUser.status).toBe('ACTIVE');
            });
        });
    });
  });

  describe('Error Response Contracts', () => {
    it('should define contract for authentication required error', () => {
      const unauthorizedResponse = {
        StatusCode: 401,
        Message: 'Authentication required',
        Data: null,
        Error: {
          code: 'AUTHENTICATION_REQUIRED',
          details: 'Valid authentication token is required'
        }
      };

      return provider
        .given('no authentication token is provided')
        .uponReceiving('a request to protected endpoint without auth')
        .withRequest({
          method: 'GET',
          path: '/api/users/profile'
        })
        .willRespondWith({
          status: 401,
          headers: {
            'Content-Type': 'application/json'
          },
          body: unauthorizedResponse
        })
        .then(() => {
          return apiService.getUserProfile()
            .then(response => {
              expect(response.StatusCode).toBe(401);
              expect(response.Error.code).toBe('AUTHENTICATION_REQUIRED');
            });
        });
    });

    it('should define contract for server error response', () => {
      const serverErrorResponse = {
        StatusCode: 500,
        Message: 'Internal server error',
        Data: null,
        Error: {
          code: 'INTERNAL_SERVER_ERROR',
          details: 'An unexpected error occurred'
        }
      };

      return provider
        .given('server is experiencing errors')
        .uponReceiving('a request when server error occurs')
        .withRequest({
          method: 'POST',
          path: '/api/auth/signin',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            email: 'test@example.com',
            password: 'password'
          }
        })
        .willRespondWith({
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          },
          body: serverErrorResponse
        })
        .then(() => {
          return apiService.signIn('test@example.com', 'password')
            .then(response => {
              expect(response.StatusCode).toBe(500);
              expect(response.Error.code).toBe('INTERNAL_SERVER_ERROR');
            });
        });
    });
  });
});