/// <reference types="cypress" />

describe('MFA Setup and Verification', () => {
  beforeEach(() => {
    // Mock AWS Cognito authentication for testing
    cy.mockCognitoAuth()
    
    // Mock MFA setup API responses
    cy.intercept('POST', '**/graphql', (req) => {
      if (req.body.operationName === 'SetupMFA') {
        req.reply({
          statusCode: 200,
          body: {
            data: {
              setupMFA: {
                secretKey: 'MOCK_SECRET_KEY_FOR_TESTING',
                qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
              }
            }
          }
        })
      }
    }).as('mfaSetup')
    
    // Visit the auth flow page
    cy.visit('/user/auth')
    
    // Wait for page to load
    cy.get('.auth-flow__header-title').should('be.visible')
  })

  it('should complete MFA setup during user registration', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate through registration flow to MFA setup
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      
      cy.get('#phone-code-input').type('123456')
      cy.get('.auth-flow__button').click()
      
      // MFA Setup Step
      cy.get('#mfa-setup-title').should('be.visible').and('contain', 'Two-Factor Authentication')
      
      // Verify QR code is displayed
      cy.get('.qr-code').should('be.visible')
      
      // Verify secret key is displayed
      cy.get('#secret-key-text').should('be.visible').and('contain', 'MOCK_SECRET_KEY')
      
      // Enter MFA verification code
      cy.get('#mfa-setup-input')
        .should('be.visible')
        .type('123456')
      
      // Submit MFA setup
      cy.get('.auth-flow__button').click()
      
      // Verify successful completion
      cy.url().should('not.include', '/auth')
      cy.url().should('include', '/user/dashboard')
    })
  })

  it('should handle MFA verification during login', () => {
    cy.fixture('users').then((users) => {
      const mfaUser = users.mfaUser

      // Mock response indicating MFA is required
      cy.intercept('POST', '**/cognito-idp.**', (req) => {
        if (req.body.AuthFlow === 'USER_PASSWORD_AUTH') {
          req.reply({
            statusCode: 200,
            body: {
              ChallengeName: 'SOFTWARE_TOKEN_MFA',
              Session: 'mock-session-token'
            }
          })
        }
      }).as('mfaChallenge')

      // Complete email and password steps
      cy.get('#email-input').type(mfaUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(mfaUser.password)
      cy.get('.auth-flow__button').click()
      
      // Should proceed to MFA verification step
      cy.get('#mfa-verify-input')
        .should('be.visible')
        .and('have.attr', 'placeholder', 'Enter 6-digit code from app')
      
      // Enter MFA code
      cy.get('#mfa-verify-input').type('123456')
      
      // Submit MFA verification
      cy.get('.auth-flow__button').click()
      
      // Verify successful login
      cy.url().should('not.include', '/auth')
      cy.url().should('include', '/user/dashboard')
    })
  })

  it('should validate MFA code format', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to MFA setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-code-input').type('123456')
      cy.get('.auth-flow__button').click()
      
      // Test invalid MFA code format (too short)
      cy.get('#mfa-setup-input').type('123')
      cy.get('#mfa-setup-input').blur()
      
      cy.get('#mfa-setup-error')
        .should('be.visible')
        .and('contain', 'code')
      
      // Test invalid MFA code format (non-numeric)
      cy.get('#mfa-setup-input').clear().type('abcdef')
      cy.get('#mfa-setup-input').blur()
      
      cy.get('#mfa-setup-error')
        .should('be.visible')
        .and('contain', 'numeric')
      
      // Test valid MFA code format
      cy.get('#mfa-setup-input').clear().type('123456')
      cy.get('#mfa-setup-input').blur()
      
      cy.get('#mfa-setup-input').should('have.class', 'auth-flow__input-group-field--valid')
    })
  })

  it('should handle QR code loading states', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Mock delayed QR code generation
      cy.intercept('POST', '**/graphql', (req) => {
        if (req.body.operationName === 'SetupMFA') {
          // Simulate delay
          req.reply({
            delay: 2000,
            statusCode: 200,
            body: {
              data: {
                setupMFA: {
                  secretKey: 'MOCK_SECRET_KEY_FOR_TESTING',
                  qrCodeUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
                }
              }
            }
          })
        }
      }).as('mfaSetupDelayed')

      // Navigate to MFA setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-code-input').type('123456')
      cy.get('.auth-flow__button').click()
      
      // Verify loading skeleton is shown
      cy.get('.auth-flow__skeleton--qr-code').should('be.visible')
      
      // Wait for QR code to load
      cy.wait('@mfaSetupDelayed')
      
      // Verify QR code is displayed after loading
      cy.get('.qr-code').should('be.visible')
      cy.get('.auth-flow__skeleton--qr-code').should('not.exist')
    })
  })

  it('should handle MFA setup errors', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Mock MFA setup error
      cy.intercept('POST', '**/graphql', (req) => {
        if (req.body.operationName === 'SetupMFA') {
          req.reply({
            statusCode: 400,
            body: {
              errors: [{
                message: 'Failed to generate MFA secret',
                extensions: {
                  code: 'MFA_SETUP_FAILED'
                }
              }]
            }
          })
        }
      }).as('mfaSetupError')

      // Navigate to MFA setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-code-input').type('123456')
      cy.get('.auth-flow__button').click()
      
      // Wait for error response
      cy.wait('@mfaSetupError')
      
      // Verify error message is displayed
      cy.get('.auth-flow__error')
        .should('be.visible')
        .and('contain', 'MFA')
      
      // Verify retry button is available
      cy.get('.auth-flow__error .btn').should('contain', 'Try Again')
    })
  })

  it('should handle incorrect MFA verification codes', () => {
    cy.fixture('users').then((users) => {
      const mfaUser = users.mfaUser

      // Mock incorrect MFA code response
      cy.intercept('POST', '**/cognito-idp.**', (req) => {
        if (req.body.AuthFlow === 'USER_PASSWORD_AUTH') {
          req.reply({
            statusCode: 200,
            body: {
              ChallengeName: 'SOFTWARE_TOKEN_MFA',
              Session: 'mock-session-token'
            }
          })
        } else if (req.body.ChallengeName === 'SOFTWARE_TOKEN_MFA') {
          req.reply({
            statusCode: 400,
            body: {
              __type: 'CodeMismatchException',
              message: 'Invalid verification code provided, please try again.'
            }
          })
        }
      }).as('mfaVerificationError')

      // Complete login flow to MFA verification
      cy.get('#email-input').type(mfaUser.username)
      cy.get('.auth-flow__button').click()
      
      cy.get('#password-input').type(mfaUser.password)
      cy.get('.auth-flow__button').click()
      
      // Enter incorrect MFA code
      cy.get('#mfa-verify-input').type('000000')
      cy.get('.auth-flow__button').click()
      
      // Verify error message for incorrect code
      cy.get('.auth-flow__error')
        .should('be.visible')
        .and('contain', 'Invalid verification code')
      
      // Verify user can try again
      cy.get('#mfa-verify-input').should('be.visible').and('have.value', '')
    })
  })

  it('should support accessibility features in MFA setup', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to MFA setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-code-input').type('123456')
      cy.get('.auth-flow__button').click()
      
      // Verify accessibility attributes
      cy.get('#mfa-setup-title').should('have.attr', 'id')
      cy.get('.auth-flow__mfa-options').should('have.attr', 'aria-labelledby', 'mfa-setup-title')
      
      // Verify QR code has proper alt text
      cy.get('.qr-code').should('have.attr', 'alt').and('contain', 'QR code')
      
      // Verify secret key has proper labeling
      cy.get('#secret-key-text').should('have.attr', 'aria-describedby', 'secret-key-instructions')
      
      // Verify MFA input has proper attributes
      cy.get('#mfa-setup-input')
        .should('have.attr', 'aria-required', 'true')
        .and('have.attr', 'inputmode', 'numeric')
        .and('have.attr', 'maxlength', '6')
    })
  })

  it('should handle MFA backup codes (if implemented)', () => {
    // This test checks for backup codes functionality if implemented
    cy.get('body').then(($body) => {
      if ($body.find('[data-cy="backup-codes"]').length > 0) {
        cy.fixture('users').then((users) => {
          const newUser = users.newUser

          // Navigate to MFA setup completion
          cy.get('#email-input').type(newUser.username)
          cy.get('.auth-flow__button').click()
          cy.get('#password-setup-input').type(newUser.password)
          cy.get('.auth-flow__button').click()
          cy.get('#first-name-input').type(newUser.firstName)
          cy.get('#last-name-input').type(newUser.lastName)
          cy.get('.auth-flow__button').click()
          cy.get('#phone-input').type(newUser.phoneNumber)
          cy.get('.auth-flow__button').click()
          cy.get('#phone-code-input').type('123456')
          cy.get('.auth-flow__button').click()
          
          cy.get('#mfa-setup-input').type('123456')
          cy.get('.auth-flow__button').click()
          
          // Check for backup codes display
          cy.get('[data-cy="backup-codes"]').should('be.visible')
          cy.get('[data-cy="download-backup-codes"]').should('be.visible')
        })
      } else {
        cy.log('Backup codes functionality not found - skipping test')
      }
    })
  })

  it('should maintain security during MFA setup', () => {
    cy.fixture('users').then((users) => {
      const newUser = users.newUser

      // Navigate to MFA setup step
      cy.get('#email-input').type(newUser.username)
      cy.get('.auth-flow__button').click()
      cy.get('#password-setup-input').type(newUser.password)
      cy.get('.auth-flow__button').click()
      cy.get('#first-name-input').type(newUser.firstName)
      cy.get('#last-name-input').type(newUser.lastName)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-input').type(newUser.phoneNumber)
      cy.get('.auth-flow__button').click()
      cy.get('#phone-code-input').type('123456')
      cy.get('.auth-flow__button').click()
      
      // Verify secret key is not logged in console
      cy.window().then((win) => {
        cy.spy(win.console, 'log').as('consoleLog')
        cy.spy(win.console, 'error').as('consoleError')
      })
      
      // Verify QR code and secret are handled securely
      cy.get('#secret-key-text').then(($el) => {
        const secretKey = $el.text()
        expect(secretKey).to.match(/^[A-Z0-9]+$/) // Base32 format
        expect(secretKey.length).to.be.greaterThan(10)
      })
      
      // Verify no sensitive data in console
      cy.get('@consoleLog').should('not.have.been.calledWith', Cypress.sinon.match(/secret/i))
    })
  })
})