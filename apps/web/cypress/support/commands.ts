/// <reference types="cypress" />

// Custom commands for authentication testing

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/user/auth')
  cy.get('[data-cy="username-input"]').type(username)
  cy.get('[data-cy="password-input"]').type(password)
  cy.get('[data-cy="login-button"]').click()
  cy.waitForAuthState()
})

Cypress.Commands.add('loginWithPhoneNumber', (phoneNumber: string, password: string) => {
  cy.visit('/user/auth')
  cy.get('[data-cy="phone-number-input"]').type(phoneNumber)
  cy.get('[data-cy="password-input"]').type(password)
  cy.get('[data-cy="login-button"]').click()
  cy.waitForAuthState()
})

Cypress.Commands.add('waitForAuthState', () => {
  // Wait for authentication state to settle
  cy.get('[data-cy="loading-spinner"]', { timeout: 10000 }).should('not.exist')
  cy.url().should('not.include', '/auth')
})

Cypress.Commands.add('mockCognitoAuth', () => {
  // Intercept AWS Cognito calls for testing
  cy.intercept('POST', '**/cognito-idp.**', {
    statusCode: 200,
    body: {
      AuthenticationResult: {
        AccessToken: 'mock-access-token',
        IdToken: 'mock-id-token',
        RefreshToken: 'mock-refresh-token'
      }
    }
  }).as('cognitoAuth')
  
  cy.intercept('POST', '**/graphql', (req) => {
    if (req.body.operationName === 'GetUser') {
      req.reply({
        statusCode: 200,
        body: {
          data: {
            getUser: {
              id: 'test-user-id',
              username: 'testuser',
              email: 'test@example.com',
              status: 'ACTIVE'
            }
          }
        }
      })
    }
  }).as('graphqlQueries')
})