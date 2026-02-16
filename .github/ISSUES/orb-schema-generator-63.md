## Feature Request

Currently, orb-schema-generator generates GraphQL operations (mutations, queries) and TypeScript query definition files for **table types** (DynamoDB-backed), but not for **Lambda types**.

## Current Behavior

For a Lambda type like `SmsVerification.yml`:
```yaml
type: lambda
name: SmsVerification
targets:
  - api
model:
  attributes:
    phoneNumber:
      type: string
      required: true
    code:
      type: number
      required: false
    valid:
      type: boolean
      required: false
```

The generator produces:
- ✅ GraphQL type definition (`type SmsVerification { ... }`)
- ✅ TypeScript model (`SmsVerificationModel.ts`)
- ❌ GraphQL mutation in schema
- ❌ TypeScript GraphQL query definition file (`SmsVerification.graphql.ts`)
- ❌ VTL resolver templates for Lambda

## Expected Behavior

For Lambda types, the generator should also produce:
1. A GraphQL mutation in the schema (e.g., `SmsVerification(input: SmsVerificationInput!): SmsVerification`)
2. A TypeScript GraphQL query definition file with the mutation string
3. VTL resolver templates that invoke the Lambda function

## Current Workaround

We have to manually create `SmsVerification.graphql.ts`:
```typescript
export const SmsVerificationMutation = /* GraphQL */ `
  mutation SmsVerification($input: SmsVerificationInput!) {
    SmsVerification(input: $input) {
      phoneNumber
      code
      valid
    }
  }
`;
```

## Impact

- Manual maintenance of Lambda-backed GraphQL operations
- Inconsistency between table types (fully generated) and Lambda types (partially generated)
- Risk of drift between schema and TypeScript definitions

## Suggested Implementation

Add a new configuration option for Lambda types to specify the operation type:
```yaml
type: lambda
name: SmsVerification
operation: mutation  # or 'query'
targets:
  - api
  - web  # to generate TypeScript query definition
```
