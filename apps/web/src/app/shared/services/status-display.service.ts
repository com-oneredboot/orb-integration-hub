// file: apps/web/src/app/shared/services/status-display.service.ts
// author: Claude Code Assistant
// date: 2025-06-23
// description: Shared service for consistent status display across the application

import { Injectable } from '@angular/core';

export interface StatusConfig {
  label: string;
  cssClass: string;
  icon?: string;
  color: string;
  bgColor?: string;
  borderColor?: string;
  priority: number; // Higher number = higher priority
}

export interface StatusDisplayOptions {
  showIcon?: boolean;
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'badge' | 'chip' | 'text' | 'indicator';
}

@Injectable({
  providedIn: 'root'
})
export class StatusDisplayService {

  // User Status Configurations
  private readonly userStatusConfig: Record<string, StatusConfig> = {
    'ACTIVE': {
      label: 'Active',
      cssClass: 'status-active',
      icon: 'heartbeat',
      color: '#2B8A3E',
      bgColor: 'rgba(43, 138, 62, 0.1)',
      borderColor: 'rgba(43, 138, 62, 0.2)',
      priority: 5
    },
    'PENDING': {
      label: 'Pending',
      cssClass: 'status-pending',
      icon: 'clock',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      priority: 3
    },
    'SUSPENDED': {
      label: 'Suspended',
      cssClass: 'status-suspended',
      icon: 'pause-circle',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 4
    },
    'INACTIVE': {
      label: 'Inactive',
      cssClass: 'status-inactive',
      icon: 'question-circle',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      priority: 2
    },
    'CANCELLED': {
      label: 'Cancelled',
      cssClass: 'status-cancelled',
      icon: 'times-circle',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 1
    }
  };

  // Organization Status Configurations
  private readonly organizationStatusConfig: Record<string, StatusConfig> = {
    'ACTIVE': {
      label: 'Active',
      cssClass: 'org-status-active',
      icon: 'heartbeat',
      color: '#2B8A3E',
      bgColor: 'rgba(43, 138, 62, 0.1)',
      borderColor: 'rgba(43, 138, 62, 0.2)',
      priority: 5
    },
    'PENDING': {
      label: 'Pending Setup',
      cssClass: 'org-status-pending',
      icon: 'clock',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      priority: 3
    },
    'SUSPENDED': {
      label: 'Suspended',
      cssClass: 'org-status-suspended',
      icon: 'pause-circle',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 2
    },
    'INACTIVE': {
      label: 'Inactive',
      cssClass: 'org-status-inactive',
      icon: 'question-circle',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      priority: 1
    }
  };

  // Application Status Configurations
  private readonly applicationStatusConfig: Record<string, StatusConfig> = {
    'ACTIVE': {
      label: 'Running',
      cssClass: 'app-status-active',
      icon: 'heartbeat',
      color: '#2B8A3E',
      bgColor: 'rgba(43, 138, 62, 0.1)',
      borderColor: 'rgba(43, 138, 62, 0.2)',
      priority: 5
    },
    'PENDING': {
      label: 'Deploying',
      cssClass: 'app-status-pending',
      icon: 'clock',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      priority: 4
    },
    'STOPPED': {
      label: 'Stopped',
      cssClass: 'app-status-stopped',
      icon: 'stop-circle',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      priority: 3
    },
    'ERROR': {
      label: 'Error',
      cssClass: 'app-status-error',
      icon: 'exclamation-triangle',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 2
    },
    'MAINTENANCE': {
      label: 'Maintenance',
      cssClass: 'app-status-maintenance',
      icon: 'wrench',
      color: '#8b5cf6',
      bgColor: '#ede9fe',
      priority: 1
    },
    'INACTIVE': {
      label: 'Inactive',
      cssClass: 'app-status-inactive',
      icon: 'question-circle',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      priority: 0
    }
  };

  // Verification Status Configurations
  private readonly verificationStatusConfig: Record<string, StatusConfig> = {
    'VERIFIED': {
      label: 'Verified',
      cssClass: 'verification-verified',
      icon: 'check-circle',
      color: '#22c55e',
      bgColor: '#dcfce7',
      priority: 3
    },
    'PENDING': {
      label: 'Pending Verification',
      cssClass: 'verification-pending',
      icon: 'clock',
      color: '#f59e0b',
      bgColor: '#fef3c7',
      priority: 2
    },
    'UNVERIFIED': {
      label: 'Not Verified',
      cssClass: 'verification-unverified',
      icon: 'x-circle',
      color: '#ef4444',
      bgColor: '#fee2e2',
      priority: 1
    }
  };

  /**
   * Get status configuration for user status
   */
  getUserStatusConfig(status: string): StatusConfig {
    return this.userStatusConfig[status?.toUpperCase()] || this.getDefaultConfig(status);
  }

  /**
   * Get status configuration for organization status
   */
  getOrganizationStatusConfig(status: string): StatusConfig {
    return this.organizationStatusConfig[status?.toUpperCase()] || this.getDefaultConfig(status);
  }

  /**
   * Get status configuration for application status
   */
  getApplicationStatusConfig(status: string): StatusConfig {
    return this.applicationStatusConfig[status?.toUpperCase()] || this.getDefaultConfig(status);
  }

  /**
   * Get status configuration for verification status
   */
  getVerificationStatusConfig(status: string): StatusConfig {
    return this.verificationStatusConfig[status?.toUpperCase()] || this.getDefaultConfig(status);
  }

  /**
   * Get CSS class for user status (backward compatibility)
   */
  getUserStatusClass(status: string): string {
    const config = this.getUserStatusConfig(status);
    return config.cssClass;
  }

  /**
   * Get CSS class for organization status
   */
  getOrganizationStatusClass(status: string): string {
    const config = this.getOrganizationStatusConfig(status);
    return config.cssClass;
  }

  /**
   * Get formatted status display HTML
   */
  getStatusDisplay(
    status: string, 
    type: 'user' | 'organization' | 'application' | 'verification',
    options: StatusDisplayOptions = {}
  ): string {
    const {
      showIcon = true,
      showLabel = true,
      size = 'medium',
      variant = 'badge'
    } = options;

    let config: StatusConfig;
    switch (type) {
      case 'user':
        config = this.getUserStatusConfig(status);
        break;
      case 'organization':
        config = this.getOrganizationStatusConfig(status);
        break;
      case 'application':
        config = this.getApplicationStatusConfig(status);
        break;
      case 'verification':
        config = this.getVerificationStatusConfig(status);
        break;
      default:
        config = this.getDefaultConfig(status);
    }

    const iconHtml = showIcon && config.icon ? 
      `<i class="fa fa-${config.icon} status-icon" aria-hidden="true"></i>` : '';
    
    const labelHtml = showLabel ? 
      `<span class="status-label">${config.label}</span>` : '';

    return `
      <span class="${config.cssClass} status-${variant} status-${size}" 
            style="color: ${config.color}; ${config.bgColor ? `background-color: ${config.bgColor};` : ''}"
            role="status"
            aria-label="${config.label} status">
        ${iconHtml}
        ${labelHtml}
      </span>
    `;
  }

  /**
   * Get status priority for sorting
   */
  getStatusPriority(status: string, type: 'user' | 'organization' | 'application' | 'verification'): number {
    let config: StatusConfig;
    switch (type) {
      case 'user':
        config = this.getUserStatusConfig(status);
        break;
      case 'organization':
        config = this.getOrganizationStatusConfig(status);
        break;
      case 'application':
        config = this.getApplicationStatusConfig(status);
        break;
      case 'verification':
        config = this.getVerificationStatusConfig(status);
        break;
      default:
        config = this.getDefaultConfig(status);
    }
    return config.priority;
  }

  /**
   * Sort items by status priority
   */
  sortByStatusPriority<T>(
    items: T[], 
    statusGetter: (item: T) => string,
    type: 'user' | 'organization' | 'application' | 'verification',
    descending = true
  ): T[] {
    return items.sort((a, b) => {
      const priorityA = this.getStatusPriority(statusGetter(a), type);
      const priorityB = this.getStatusPriority(statusGetter(b), type);
      
      return descending ? priorityB - priorityA : priorityA - priorityB;
    });
  }

  /**
   * Check if status indicates an active/healthy state
   */
  isHealthyStatus(status: string, _type: 'user' | 'organization' | 'application' | 'verification'): boolean {
    const healthyStatuses = ['ACTIVE', 'VERIFIED', 'RUNNING'];
    return healthyStatuses.includes(status?.toUpperCase());
  }

  /**
   * Check if status indicates a warning state
   */
  isWarningStatus(status: string, _type: 'user' | 'organization' | 'application' | 'verification'): boolean {
    const warningStatuses = ['PENDING', 'DEPLOYING', 'MAINTENANCE'];
    return warningStatuses.includes(status?.toUpperCase());
  }

  /**
   * Check if status indicates an error/critical state
   */
  isErrorStatus(status: string, _type: 'user' | 'organization' | 'application' | 'verification'): boolean {
    const errorStatuses = ['SUSPENDED', 'ERROR', 'CANCELLED', 'UNVERIFIED'];
    return errorStatuses.includes(status?.toUpperCase());
  }

  /**
   * Get all available statuses for a type
   */
  getAvailableStatuses(type: 'user' | 'organization' | 'application' | 'verification'): StatusConfig[] {
    let configMap: Record<string, StatusConfig>;
    
    switch (type) {
      case 'user':
        configMap = this.userStatusConfig;
        break;
      case 'organization':
        configMap = this.organizationStatusConfig;
        break;
      case 'application':
        configMap = this.applicationStatusConfig;
        break;
      case 'verification':
        configMap = this.verificationStatusConfig;
        break;
      default:
        return [];
    }

    return Object.values(configMap).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Default configuration for unknown statuses
   */
  private getDefaultConfig(status: string): StatusConfig {
    return {
      label: status || 'Unknown',
      cssClass: 'status-default',
      icon: 'question-circle',
      color: '#6b7280',
      bgColor: '#f3f4f6',
      priority: 0
    };
  }
}