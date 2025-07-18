// Auto-generated GraphQL operations for Notifications
// Do not edit manually. Generated by generate.py

export const NotificationsCreateMutation = /* GraphQL */ `
mutation NotificationsCreate($input: NotificationsCreateInput!) {
  NotificationsCreate(input: $input) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;

export const NotificationsUpdateMutation = /* GraphQL */ `
mutation NotificationsUpdate($input: NotificationsUpdateInput!) {
  NotificationsUpdate(input: $input) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;

export const NotificationsDeleteMutation = /* GraphQL */ `
mutation NotificationsDelete($id: ID!) {
  NotificationsDelete(id: $id) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;

export const NotificationsDisableMutation = /* GraphQL */ `
mutation NotificationsDisable($id: ID!) {
  NotificationsDisable(id: $id) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;

export const NotificationsQueryByNotificationId = /* GraphQL */ `
query NotificationsQueryByNotificationId($input: NotificationsQueryByNotificationIdInput!) {
  NotificationsQueryByNotificationId(input: $input) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;

export const NotificationsQueryByRecipientUserId = /* GraphQL */ `
query NotificationsQueryByRecipientUserId($input: NotificationsQueryByRecipientUserIdInput!) {
  NotificationsQueryByRecipientUserId(input: $input) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;

export const NotificationsQueryByType = /* GraphQL */ `
query NotificationsQueryByType($input: NotificationsQueryByTypeInput!) {
  NotificationsQueryByType(input: $input) {
    StatusCode
    Message
    Data {
      notificationId
      recipientUserId
      senderUserId
      type
      status
      title
      message
      metadata
      expiresAt
      createdAt
      updatedAt
    }
  }
}
`;


// For each secondary index, generate a query operation
 