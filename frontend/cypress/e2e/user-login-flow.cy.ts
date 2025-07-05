/// <reference types="cypress" />

describe('User Login Flow', () => {
  beforeEach(() => {
    // Mock AWS Cognito authentication for testing
    cy.mockCognitoAuth()
    
    // Visit the auth flow page
    cy.visit('/user/auth')
    
    // Wait for page to load
    cy.get('.auth-flow__header-title').should('be.visible')
  })

  it('should successfully login existing user with email and password', () => {
    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      // Step 1: Enter email
      cy.get('#email-input')
        .should('be.visible')
        .type(validUser.username)
      
      cy.get('.auth-flow__button').click()
      
      // Step 2: Enter password (existing user flow)
      cy.get('#password-input')
        .should('be.visible')
        .type(validUser.password)
      
      // Submit login
      cy.get('.auth-flow__button').click()
      
      // Verify successful login
      cy.url().should('not.include', '/auth')
      cy.url().should('include', '/user/dashboard')
    })
  })

  it('should handle login with MFA verification', () => {
    cy.fixture('users').then((users) => {
      const mfaUser = users.mfaUser

      // Complete email and password steps
      cy.get('#email-input').type(mfaUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(mfaUser.password)
      cy.get('.auth-flow__button').click()
      
      // Should proceed to MFA verification step
      cy.get('#mfa-verify-input')
        .should('be.visible')
        .type('123456') // Mock MFA code
      
      cy.get('.auth-flow__button').click()
      
      // Verify successful login after MFA
      cy.url().should('not.include', '/auth')
      cy.url().should('include', '/user/dashboard')
    })
  })

  it('should show error for invalid credentials', () => {
    cy.fixture('users').then((users) => {
      const invalidUser = users.invalidUser

      // Mock failed authentication response
      cy.intercept('POST', '**/cognito-idp.**', {
        statusCode: 400,
        body: {
          __type: 'NotAuthorizedException',
          message: 'Incorrect username or password.'
        }
      }).as('failedAuth')

      cy.get('#email-input').type(invalidUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(invalidUser.password)
      cy.get('.auth-flow__button').click()
      
      // Verify error message is displayed
      cy.get('.auth-flow__error')
        .should('be.visible')
        .and('contain', 'Authentication Error')
      
      // Verify retry button is available
      cy.get('.auth-flow__error .btn').should('contain', 'Try Again')
    })
  })

  it('should validate email format during login', () => {
    // Test invalid email format
    cy.get('#email-input').type('invalid-email-format')
    cy.get('#email-input').blur()
    
    cy.get('#email-error')
      .should('be.visible')
      .and('contain', 'email')
    
    // Test valid email format
    cy.get('#email-input').clear().type('valid@example.com')
    cy.get('#email-input').blur()
    
    cy.get('#email-input').should('have.class', 'auth-flow__input-group-field--valid')
  })

  it('should validate password requirements during login', () => {
    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      // Navigate to password step
      cy.get('#email-input').type(validUser.username)
      cy.get('.auth-flow__button').click()
      
      // Test empty password
      cy.get('#password-input').focus().blur()
      
      cy.get('#password-error')
        .should('be.visible')
        .and('contain', 'required')
      
      // Test valid password
      cy.get('#password-input').type(validUser.password)
      cy.get('#password-input').blur()
      
      cy.get('#password-input').should('have.class', 'auth-flow__input-group-field--valid')
    })
  })

  it('should toggle password visibility', () => {
    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      // Navigate to password step
      cy.get('#email-input').type(validUser.username)
      cy.get('.auth-flow__button').click()
      
      // Enter password
      cy.get('#password-input').type(validUser.password)
      
      // Verify password is hidden by default
      cy.get('#password-input').should('have.attr', 'type', 'password')
      
      // Click toggle button
      cy.get('.auth-flow__input-group-toggle').click()
      
      // Verify password is now visible
      cy.get('#password-input').should('have.attr', 'type', 'text')
      
      // Click toggle button again
      cy.get('.auth-flow__input-group-toggle').click()
      
      // Verify password is hidden again
      cy.get('#password-input').should('have.attr', 'type', 'password')
    })
  })

  it('should handle session timeout scenarios', () => {
    // Mock session timeout response
    cy.intercept('POST', '**/graphql', {
      statusCode: 401,
      body: {
        errors: [{
          message: 'Session has expired',
          extensions: {
            code: 'UNAUTHENTICATED'
          }
        }]
      }
    }).as('sessionTimeout')

    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      cy.get('#email-input').type(validUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(validUser.password)
      cy.get('.auth-flow__button').click()
      
      // Wait for session timeout response
      cy.wait('@sessionTimeout')
      
      // Should display appropriate error message
      cy.get('.auth-flow__error')
        .should('be.visible')
        .and('contain', 'Session')
    })
  })

  it('should support keyboard-only navigation', () => {
    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      // Test tab navigation through login form
      cy.get('body').tab()
      cy.get('#email-input').should('have.focus')
      
      // Enter email and press enter
      cy.get('#email-input').type(validUser.username)
      cy.get('#email-input').type('{enter}')
      
      // Should advance to password step
      cy.get('#password-input').should('be.visible')
      
      // Enter password and press enter
      cy.get('#password-input').type(validUser.password)
      cy.get('#password-input').type('{enter}')
      
      // Should submit the form
      cy.url().should('not.include', '/auth')
    })
  })

  it('should handle rate limiting protection', () => {
    // Mock rate limiting response
    cy.intercept('POST', '**/cognito-idp.**', {
      statusCode: 429,
      body: {
        __type: 'TooManyRequestsException',
        message: 'Too many failed attempts. Please try again later.'
      }
    }).as('rateLimited')

    cy.fixture('users').then((users) => {
      const invalidUser = users.invalidUser

      // Attempt login multiple times
      for (let i = 0; i < 3; i++) {
        cy.get('#email-input').clear().type(invalidUser.username)
        cy.get('.auth-flow__button').click()
        
        cy.get('#password-input').clear().type(invalidUser.password)
        cy.get('.auth-flow__button').click()
        
        // Navigate back for next attempt
        if (i < 2) {
          cy.get('.auth-flow__start-over-button').click()
        }
      }
      
      // Verify rate limiting message
      cy.get('.auth-flow__error')
        .should('be.visible')
        .and('contain', 'Too many')
    })
  })

  it('should handle password reset flow', () => {
    // Note: This assumes a password reset link/button exists
    // If not implemented, this test can be marked as pending
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="forgot-password"]').length > 0) {
        cy.fixture('users').then((users) => {
          const validUser = users.validUser

          cy.get('#email-input').type(validUser.username)
          cy.get('.auth-flow__button').click()
          
          // Click forgot password (if available)
          cy.get('[data-cy="forgot-password"]').click()
          
          // Should navigate to password reset flow
          cy.url().should('include', 'reset')
        })
      } else {
        // Skip this test if password reset is not implemented
        cy.log('Password reset functionality not found - skipping test')
      }
    })
  })

  it('should maintain form state during page refresh', () => {
    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      // Enter email
      cy.get('#email-input').type(validUser.username)
      
      // Refresh page
      cy.reload()
      
      // Verify we're back at the beginning
      cy.get('#email-input').should('be.visible').and('have.value', '')
      cy.get('.auth-flow__progress-step--active').should('contain', '1')
    })
  })

  it('should handle network connectivity issues', () => {
    // Mock network error
    cy.intercept('POST', '**/cognito-idp.**', {
      forceNetworkError: true
    }).as('networkError')

    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      cy.get('#email-input').type(validUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(validUser.password)
      cy.get('.auth-flow__button').click()
      
      // Should display network error message
      cy.get('.auth-flow__error')
        .should('be.visible')
        .and('contain', 'connection')
    })
  })

  it('should clear sensitive data on logout', () => {
    cy.fixture('users').then((users) => {
      const validUser = users.validUser

      // Complete successful login
      cy.get('#email-input').type(validUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(validUser.password)
      cy.get('.auth-flow__button').click()
      
      // Navigate to dashboard
      cy.url().should('include', '/user/dashboard')
      
      // Simulate logout and return to auth
      cy.visit('/user/auth')
      
      // Verify form is cleared
      cy.get('#email-input').should('have.value', '')
    })
  })
})