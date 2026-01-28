/**
 * API Key Generate Dialog Component
 *
 * Dialog for generating new API keys and displaying the generated key.
 * Shows the key only once with a copy button and requires confirmation before closing.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.2, 9.6_
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
import { takeUntil } from 'rxjs/operators';

import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectIsGenerating,
  selectGenerateError,
  selectGeneratedKey,
} from '../../store/api-keys/api-keys.selectors';
import { GeneratedKeyResult } from '../../store/api-keys/api-keys.state';

export type DialogState = 'form' | 'generated';

@Component({
  selector: 'app-api-key-generate-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, FontAwesomeModule],
  templateUrl: './api-key-generate-dialog.component.html',
  styleUrls: ['./api-key-generate-dialog.component.scss'],
})
export class ApiKeyGenerateDialogComponent implements OnInit, OnDestroy {
  @Input() applicationId!: string;
  @Input() organizationId!: string;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() keyGenerated = new EventEmitter<GeneratedKeyResult>();

  // Store observables
  isGenerating$: Observable<boolean>;
  generateError$: Observable<string | null>;
  generatedKey$: Observable<GeneratedKeyResult | null>;

  // Local state
  dialogState: DialogState = 'form';
  selectedEnvironment: Environment = Environment.Development;
  keyCopied = false;
  confirmClose = false;

  // Available environments
  environments: Environment[] = [
    Environment.Production,
    Environment.Staging,
    Environment.Development,
    Environment.Test,
    Environment.Preview,
  ];

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
    this.isGenerating$ = this.store.select(selectIsGenerating);
    this.generateError$ = this.store.select(selectGenerateError);
    this.generatedKey$ = this.store.select(selectGeneratedKey);
  }

  ngOnInit(): void {
    // Watch for generated key to switch dialog state
    this.generatedKey$
      .pipe(takeUntil(this.destroy$))
      .subscribe((key) => {
        if (key) {
          this.dialogState = 'generated';
          this.keyGenerated.emit(key);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onGenerate(): void {
    this.store.dispatch(
      ApiKeysActions.generateApiKey({
        applicationId: this.applicationId,
        organizationId: this.organizationId,
        environment: this.selectedEnvironment,
      })
    );
  }

  async copyKeyToClipboard(key: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(key);
      this.keyCopied = true;
      setTimeout(() => (this.keyCopied = false), 3000);
    } catch (err) {
      console.error('Failed to copy key:', err);
    }
  }

  onClose(): void {
    // If key was generated but not copied, show confirmation
    if (this.dialogState === 'generated' && !this.keyCopied && !this.confirmClose) {
      this.confirmClose = true;
      return;
    }

    this.resetDialog();
    this.closed.emit();
  }

  onConfirmClose(): void {
    this.resetDialog();
    this.closed.emit();
  }

  onCancelClose(): void {
    this.confirmClose = false;
  }

  private resetDialog(): void {
    this.dialogState = 'form';
    this.selectedEnvironment = Environment.Development;
    this.keyCopied = false;
    this.confirmClose = false;
    this.store.dispatch(ApiKeysActions.clearGeneratedKey());
    this.store.dispatch(ApiKeysActions.clearGenerateError());
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
