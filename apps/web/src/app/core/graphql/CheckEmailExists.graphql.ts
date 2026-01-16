/**
 * GraphQL operations for CheckEmailExists
 * 
 * This is a public endpoint accessible via API key authentication.
 * Used during the authentication flow to check if an email exists.
 */

export const CheckEmailExists = /* GraphQL */ `
  query CheckEmailExists($input: CheckEmailExistsInput!) {
    CheckEmailExists(input: $input) {
      email
      exists
    }
  }
`;
