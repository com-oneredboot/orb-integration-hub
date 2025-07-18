// Auto-generated GraphQL operations for OwnershipTransferRequests (Lambda)
// Do not edit manually. Generated by generate.py

export const OwnershipTransferRequestsMutation = /* GraphQL */ `
mutation OwnershipTransferRequests($input: OwnershipTransferRequestsInput!) {
  OwnershipTransferRequests(input: $input) {
    StatusCode
    Message
    Data {
      transferId
      currentOwnerId
      newOwnerId
      organizationId
      status
      requiredBillingPlan
      monthlyCost
      paymentValidationToken
      createdAt
      expiresAt
      updatedAt
      completedAt
      failureReason
      billingTransitionDetails
      fraudAssessment
      notificationsSent
    }
  }
}
`;