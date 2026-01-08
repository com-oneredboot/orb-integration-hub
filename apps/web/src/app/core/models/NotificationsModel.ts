/**
 * Notifications model.
 */

// Import enums and models used in this model
import { NotificationType } from './NotificationTypeEnum';
import { NotificationStatus } from './NotificationStatusEnum';

// CreateInput
export type NotificationsCreateInput = {
  notificationId: string;
  recipientUserId: string;
  senderUserId: string | undefined;
  type: string;
  status: string;
  title: string;
  message: string;
  metadata: Record<string, any> | undefined;
  expiresAt: string | undefined;
  createdAt: string;
  updatedAt: string;
};

// UpdateInput
export type NotificationsUpdateInput = {
  notificationId: string;
  recipientUserId: string;
  senderUserId: string | undefined;
  type: string;
  status: string;
  title: string;
  message: string;
  metadata: Record<string, any> | undefined;
  expiresAt: string | undefined;
  createdAt: string;
  updatedAt: string;
};

// QueryInput
export type NotificationsQueryByNotificationIdInput = {
  notificationId: string;
};


export type NotificationsQueryByRecipientUserIdInput = {
  recipientUserId: string;
};
export type NotificationsQueryByTypeInput = {
  type: string;
};

// Response types
export type NotificationsResponse = {
  StatusCode: number;
  Message: string;
  Data: Notifications | null;
};

export type NotificationsCreateResponse = {
  StatusCode: number;
  Message: string;
  Data: Notifications | null;
};

export type NotificationsUpdateResponse = {
  StatusCode: number;
  Message: string;
  Data: Notifications | null;
};

export type NotificationsListResponse = {
  StatusCode: number;
  Message: string;
  Data: Notifications[] | null;
};

export interface INotifications {
  notificationId: string;
  recipientUserId: string;
  senderUserId: string | undefined;
  type: NotificationType;
  status: NotificationStatus;
  title: string;
  message: string;
  metadata: Record<string, any> | undefined;
  expiresAt: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export class Notifications implements INotifications {
  notificationId = '';
  recipientUserId = '';
  senderUserId = '';
  type = NotificationType.UNKNOWN;
  status = NotificationStatus.UNKNOWN;
  title = '';
  message = '';
  metadata = {};
  expiresAt = '';
  createdAt = '';
  updatedAt = '';

  constructor(data: Partial<INotifications> = {}) {
    Object.entries(data).forEach(([key, value]) => {
      if (key in this) {
        if (key === 'type' && typeof value === 'string') {
          this.type = NotificationType[value as keyof typeof NotificationType] ?? NotificationType.UNKNOWN;
        } else 
        if (key === 'status' && typeof value === 'string') {
          this.status = NotificationStatus[value as keyof typeof NotificationStatus] ?? NotificationStatus.UNKNOWN;
        } else 
        {
          this[key as keyof this] = value as this[keyof this];
        }
      }
    });
  }
} 