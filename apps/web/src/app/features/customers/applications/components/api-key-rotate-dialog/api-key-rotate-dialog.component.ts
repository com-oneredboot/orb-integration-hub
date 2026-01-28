/**
 * API Key Rotate Dialog Component
 *
 * Dialog for rotating API keys. Shows both current and next keys during rotation period.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.3_
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
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectIsRotating,
  selectRotateError,
  selectGeneratedKey,
} from '../../store/api-keys/api-keys.selectors';
import { GeneratedKeyResult } from '../../store/api-keys/api-keys.state';

export type RotateDialogState = 'confirm' | 'rotating' | 'completed';

@Component({
  selector: 'app-api-key-rotate-dialog',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule],
  templateUrl: './api-key-rotate-dialog.component.html',
  styleUrls: ['./api-key-rotate-dialog.component.scss'],
})
export class ApiKeyRotateDialogComponent implements OnInit, OnDestroy {
  @Input() apiKey!: IApplicationApiKeys;
  @Input() applicationId!: string;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() keyRotated = new EventEmitter<GeneratedKeyResult>();

  // Store observables
  isRotating$: Observable<boolean>;
  rotateError$: Observable<string | null>;
  generatedKey$: Observable<GeneratedKeyResult | null>;

  // Local state
  dialogState: RotateDialogState = 'confirm';
  newKeyCopied = false;

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
    this.isRotating$ = this.store.select(selectIsRotating);
    this.rotateError$ = this.store.select(selectRotateError);
    this.generatedKey$ = this.store.select(selectGeneratedKey);
  }

  ngOnInit(): void {
    // Watch for rotation completion
    this.generatedKey$
      .pipe(takeUntil(this.destroy$))
      .subscribe((key) => {
        if (key && this.dialogState === 'rotating') {
          this.dialogState = 'completed';
          this.keyRotated.emit(key);
        }
      });

    // Watch for rotating state
    this.isRotating$
      .pipe(takeUntil(this.destroy$))
      .subscribe((isRotating) => {
        if (isRotating && this.dialogState === 'confirm') {
          this.dialogState = 'rotating';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onRotate(): void {
    this.store.dispatch(
      ApiKeysActions.rotateApiKey({
        apiKeyId: this.apiKey.applicationApiKeyId,
        applicationId: this.applicationId,
        environment: this.apiKey.environment,
      })
    );
  }

  async copyKeyToClipboard(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.newKeyCopied = true;
      setTimeout(() => (this.newKeyCopied = false), 3000);
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
  }

  onClose(): void {
    this.resetDialog();
    this.closed.emit();
  }

  private resetDialog(): void {
    this.dialogState = 'confirm';
    this.newKeyCopied = false;
    this.store.dispatch(ApiKeysActions.clearGeneratedKey());
    this.store.dispatch(ApiKeysActions.clearRotateError());
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
