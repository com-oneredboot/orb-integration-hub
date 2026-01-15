// file: apps/web/src/app/core/graphql/SmsVerification.graphql.ts
// author: Corey Dale Peters
// date: 2025-01-15
// description: GraphQL mutation for SMS verification (Lambda-backed, manually maintained)
// NOTE: This file is NOT auto-generated because SmsVerification is a Lambda type

/**
 * GraphQL mutation for SMS verification
 * This mutation is backed by a Lambda function and handles:
 * - Sending verification codes to phone numbers
 * - Verifying codes provided by users
 */
export const SmsVerificationMutation = /* GraphQL */ `
  mutation SmsVerification($input: SmsVerificationInput!) {
    SmsVerification(input: $input) {
      phoneNumber
      code
      valid
    }
  }
`;
