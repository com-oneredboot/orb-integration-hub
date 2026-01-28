/**
 * API Key Revoke Dialog Component
 *
 * Confirmation dialog for revoking API keys.
 * Requires explicit confirmation before proceeding with revocation.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.4_
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectIsRevoking,
  selectRevokeError,
  selectLastRevokedKeyId,
} from '../../store/api-keys/api-keys.selectors';

@Component({
  selector: 'app-api-key-revoke-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './api-key-revoke-dialog.component.html',
  styleUrls: ['./api-key-revoke-dialog.component.scss'],
})
export class ApiKeyRevokeDialogComponent implements OnInit, OnDestroy {
  @Input() apiKey!: IApplicationApiKeys;
  @Input() applicationId!: string;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() keyRevoked = new EventEmitter<string>();

  // Store observables
  isRevoking$: Observable<boolean>;
  revokeError$: Observable<string | null>;
  lastRevokedKeyId$: Observable<string | null>;

  // Local state
  confirmationText = '';
  isRevoked = false;

  // Environment labels
  environmentLabels: Record<Environment, string> = {
    [Environment.Unknown]: 'Unknown',
    [Environment.Production]: 'Production',
    [Environment.Staging]: 'Staging',
    [Environment.Development]: 'Development',
    [Environment.Test]: 'Test',
    [Environment.Preview]: 'Preview',
  };

  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.isRevoking$ = this.store.select(selectIsRevoking);
    this.revokeError$ = this.store.select(selectRevokeError);
    this.lastRevokedKeyId$ = this.store.select(selectLastRevokedKeyId);
  }

  ngOnInit(): void {
    // Watch for successful revocation
    this.lastRevokedKeyId$
      .pipe(
        takeUntil(this.destroy$),
        filter((keyId) => keyId === this.apiKey?.applicationApiKeyId)
      )
      .subscribe((keyId) => {
        if (keyId) {
          this.isRevoked = true;
          this.keyRevoked.emit(keyId);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isConfirmationValid(): boolean {
    return this.confirmationText.toLowerCase() === 'revoke';
  }

  onRevoke(): void {
    if (!this.isConfirmationValid) {
      return;
    }

    this.store.dispatch(
      ApiKeysActions.revokeApiKey({
        apiKeyId: this.apiKey.applicationApiKeyId,
        applicationId: this.applicationId,
        environment: this.apiKey.environment,
      })
    );
  }

  onClose(): void {
    this.resetDialog();
    this.closed.emit();
  }

  private resetDialog(): void {
    this.confirmationText = '';
    this.isRevoked = false;
    this.store.dispatch(ApiKeysActions.clearRevokeError());
  }

  getEnvironmentClass(environment: Environment): string {
    switch (environment) {
      case Environment.Production:
        return 'production';
      case Environment.Staging:
        return 'staging';
      case Environment.Development:
        return 'development';
      case Environment.Test:
        return 'test';
      case Environment.Preview:
        return 'preview';
      default:
        return 'unknown';
    }
  }
}
