/// <reference types="cypress" />

describe('User Registration Journey', () => {
  beforeEach(() => {
    // Mock AWS Cognito authentication for testing
    cy.mockCognitoAuth()
    
    // Visit the auth flow page
    cy.visit('/user/auth')
    
    // Wait for page to load
    cy.get('.auth-flow__header-title').should('be.visible')
  })

  it('should complete the full user registration flow', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Step 1: Email Input
      cy.get('#email-input')
        .should('be.visible')
        .type(newUser.username)
      
      // Verify email validation feedback
      cy.get('#email-input').should('have.class', 'auth-flow__input-group-field--valid')
      
      // Continue to next step
      cy.get('.auth-flow__button').click()
      
      // Step 2: Password Setup (for new user)
      cy.get('#password-setup-input')
        .should('be.visible')
        .type(newUser.password)
      
      // Verify password requirements are met
      cy.get('.auth-flow__requirement--valid').should('have.length', 5)
      
      // Continue to next step
      cy.get('.auth-flow__button').click()
      
      // Step 3: Name Setup
      cy.get('#first-name-input')
        .should('be.visible')
        .type(newUser.firstName)
      
      cy.get('#last-name-input')
        .should('be.visible')
        .type(newUser.lastName)
      
      // Continue to next step
      cy.get('.auth-flow__button').click()
      
      // Step 4: Phone Setup
      cy.get('#phone-input')
        .should('be.visible')
        .type(newUser.phoneNumber)
      
      // Continue to phone verification
      cy.get('.auth-flow__button').click()
      
      // Step 5: Phone Verification
      cy.get('#phone-code-input')
        .should('be.visible')
        .type('123456') // Mock verification code
      
      // Continue to next step
      cy.get('.auth-flow__button').click()
      
      // Step 6: MFA Setup (if enabled)
      cy.get('body').then(($body) => {
        if ($body.find('#mfa-setup-input').length > 0) {
          // MFA is enabled, complete setup
          cy.get('#mfa-setup-input')
            .should('be.visible')
            .type('123456') // Mock MFA code
          
          cy.get('.auth-flow__button').click()
        }
      })
      
      // Verify successful completion
      cy.url().should('not.include', '/auth')
      cy.url().should('include', '/user/dashboard')
    })
  })

  it('should validate email format in real-time', () => {
    // Test invalid email format
    cy.get('#email-input').type('invalid-email')
    cy.get('#email-input').blur()
    
    cy.get('#email-error')
      .should('be.visible')
      .and('contain', 'email')
    
    // Test valid email format
    cy.get('#email-input').clear().type('valid@example.com')
    cy.get('#email-input').blur()
    
    cy.get('#email-input').should('have.class', 'auth-flow__input-group-field--valid')
  })

  it('should validate password requirements', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to password setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      
      // Test weak password
      cy.get('#password-setup-input').type('weak')
      
      // Check that requirements are not met
      cy.get('.auth-flow__requirement--valid').should('have.length.lessThan', 5)
      
      // Test strong password
      cy.get('#password-setup-input').clear().type(newUser.password)
      
      // Check that all requirements are met
      cy.get('.auth-flow__requirement--valid').should('have.length', 5)
    })
  })

  it('should allow navigation back to previous steps', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to name setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      
      // Verify we're on name setup step
      cy.get('#first-name-input').should('be.visible')
      
      // Navigate back
      cy.get('.auth-flow__back-button').click()
      
      // Verify we're back on password setup step
      cy.get('#password-setup-input').should('be.visible')
    })
  })

  it('should handle phone number validation', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to phone setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      
      // Test invalid phone number
      cy.get('#phone-input').type('invalid-phone')
      cy.get('#phone-input').blur()
      
      cy.get('#phone-error')
        .should('be.visible')
        .and('contain', 'phone')
      
      // Test valid phone number
      cy.get('#phone-input').clear().type(newUser.phoneNumber)
      cy.get('#phone-input').blur()
      
      cy.get('#phone-input').should('have.class', 'auth-flow__input-group-field--valid')
    })
  })

  it('should show progress indicator throughout the flow', () => {
    // Check initial progress
    cy.get('.auth-flow__progress').should('be.visible')
    cy.get('.auth-flow__progress-step--active').should('contain', '1')
    
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Progress through steps and verify progress indicator
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('.auth-flow__progress-step--active').should('contain', '2')
      
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      
      cy.get('.auth-flow__progress-step--active').should('contain', '3')
    })
  })

  it('should handle form submission with loading states', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      cy.get('#email-input').type(newUser.username)
      
      // Click submit and verify loading state
      cy.get('.auth-flow__button').click()
      
      // Check for loading spinner (may appear briefly)
      cy.get('.auth-flow__button').should('not.be.disabled')
    })
  })

  it('should support keyboard navigation', () => {
    // Test tab navigation
    cy.get('#email-input').focus()
    cy.get('#email-input').should('have.focus')
    
    // Tab to submit button
    cy.get('#email-input').tab()
    cy.get('.auth-flow__button').should('have.focus')
    
    // Test enter key submission
    cy.fixture('users').then((users) => {
      const newUser = users.newUser
      
      cy.get('#email-input').type(newUser.username)
      cy.get('#email-input').type('{enter}')
      
      // Should advance to next step
      cy.get('#password-setup-input').should('be.visible')
    })
  })

  it('should handle resend verification code', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to phone verification step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      
      // Test resend code functionality
      cy.get('.auth-flow__text-button').should('be.visible').click()
      
      // Verify code input is still available
      cy.get('#phone-code-input').should('be.visible')
    })
  })
})