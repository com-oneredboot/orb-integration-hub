// file: apps/web/src/app/shared/components/ui/status-badge.component.ts
// author: Claude Code Assistant
// date: 2025-06-23
// description: Reusable status badge component for consistent status display across the application

import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusDisplayService, StatusConfig, StatusDisplayOptions } from '../../services/status-display.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span 
      [class]="getStatusClasses()"
      [style.color]="statusConfig.color"
      [style.background-color]="statusConfig.bgColor"
      [style.border]="statusConfig.borderColor ? '1px solid ' + statusConfig.borderColor : null"
      role="status"
      [attr.aria-label]="statusConfig.label + ' status'">
      
      <i *ngIf="showIcon && statusConfig.icon" 
         [class]="'fa fa-' + statusConfig.icon" 
         class="status-badge__icon"
         aria-hidden="true"></i>
      
      <span *ngIf="showLabel" class="status-badge__label">
        {{ statusConfig.label }}
      </span>
    </span>
  `,
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent implements OnInit, OnChanges {
  // Core Properties
  @Input() status!: string;
  @Input() type: 'user' | 'organization' | 'application' | 'verification' = 'user';
  
  // Display Options
  @Input() showIcon = true;
  @Input() showLabel = true;
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() variant: 'badge' | 'chip' | 'text' | 'indicator' = 'badge';
  
  // Styling
  @Input() customClass?: string;
  @Input() theme?: 'default' | 'compact' | 'minimal';
  
  // Configuration
  statusConfig!: StatusConfig;

  constructor(private statusDisplayService: StatusDisplayService) {}

  ngOnInit(): void {
    this.updateStatusConfig();
  }

  ngOnChanges(): void {
    this.updateStatusConfig();
  }

  private updateStatusConfig(): void {
    switch (this.type) {
      case 'user':
        this.statusConfig = this.statusDisplayService.getUserStatusConfig(this.status);
        break;
      case 'organization':
        this.statusConfig = this.statusDisplayService.getOrganizationStatusConfig(this.status);
        break;
      case 'application':
        this.statusConfig = this.statusDisplayService.getApplicationStatusConfig(this.status);
        break;
      case 'verification':
        this.statusConfig = this.statusDisplayService.getVerificationStatusConfig(this.status);
        break;
      default:
        this.statusConfig = this.statusDisplayService.getUserStatusConfig(this.status);
    }
  }

  getStatusClasses(): string {
    const classes = [
      'status-badge',
      `status-badge--${this.variant}`,
      `status-badge--${this.size}`,
      this.statusConfig.cssClass
    ];

    if (this.theme) {
      classes.push(`status-badge--${this.theme}`);
    }

    if (this.customClass) {
      classes.push(this.customClass);
    }

    // Add utility classes based on status type
    if (this.statusDisplayService.isHealthyStatus(this.status, this.type)) {
      classes.push('status-badge--healthy');
    } else if (this.statusDisplayService.isWarningStatus(this.status, this.type)) {
      classes.push('status-badge--warning');
    } else if (this.statusDisplayService.isErrorStatus(this.status, this.type)) {
      classes.push('status-badge--error');
    }

    return classes.join(' ');
  }

  // Public getter for priority (useful for sorting)
  get priority(): number {
    return this.statusConfig.priority;
  }

  // Public getter for status checking
  get isHealthy(): boolean {
    return this.statusDisplayService.isHealthyStatus(this.status, this.type);
  }

  get isWarning(): boolean {
    return this.statusDisplayService.isWarningStatus(this.status, this.type);
  }

  get isError(): boolean {
    return this.statusDisplayService.isErrorStatus(this.status, this.type);
  }
}