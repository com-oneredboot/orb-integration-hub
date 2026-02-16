/**
 * Confirm Unassign Dialog Component
 *
 * Simple confirmation dialog for unassigning users from applications.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { IUsers } from '../../../../../core/models/UsersModel';

@Component({
  selector: 'app-confirm-unassign-dialog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './confirm-unassign-dialog.component.html',
  styleUrls: ['./confirm-unassign-dialog.component.scss'],
})
export class ConfirmUnassignDialogComponent {
  @Input() user: IUsers | null = null;
  @Input() applicationName = '';
  @Input() isOpen = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  getUserFullName(): string {
    if (!this.user) return '';
    return `${this.user.firstName} ${this.user.lastName}`;
  }
}
