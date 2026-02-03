/**
 * Unit tests for ApiKeyRotateDialogComponent
 *
 * Tests the API key rotation dialog functionality including:
 * - Rotation confirmation flow
 * - Key rotation dispatch
 * - Copy to clipboard functionality
 * - Dialog state transitions
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 5.5_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { ApiKeyRotateDialogComponent } from './api-key-rotate-dialog.component';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApplicationApiKeyType } from '../../../../../core/enums/ApplicationApiKeyTypeEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectIsRotating,
  selectRotateError,
  selectGeneratedKey,
} from '../../store/api-keys/api-keys.selectors';
import { GeneratedKeyResult } from '../../store/api-keys/api-keys.state';

describe('ApiKeyRotateDialogComponent', () => {
  let component: ApiKeyRotateDialogComponent;
  let fixture: ComponentFixture<ApiKeyRotateDialogComponent>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const createMockApiKey = (overrides: Partial<IApplicationApiKeys> = {}): IApplicationApiKeys => ({
    applicationApiKeyId: 'key-123',
    applicationId: 'app-456',
    organizationId: 'org-789',
    environment: Environment.Development,
    keyHash: 'hash123',
    keyPrefix: 'pk_dev_abc123',
    keyType: ApplicationApiKeyType.Publishable,
    status: ApplicationApiKeyStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    ...overrides,
  });

  const mockApiKey = createMockApiKey();

  const mockGeneratedKey: GeneratedKeyResult = {
    apiKeyId: 'key-new-456',
    keyPrefix: 'dev_new789',
    fullKey: 'dev_new789_secretkey_abc123',
    environment: Environment.Development,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeyRotateDialogComponent, FontAwesomeModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectIsRotating, value: false },
            { selector: selectRotateError, value: null },
            { selector: selectGeneratedKey, value: null },
          ],
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    fixture = TestBed.createComponent(ApiKeyRotateDialogComponent);
    component = fixture.componentInstance;
    component.apiKey = mockApiKey;
    component.applicationId = 'app-456';
    component.isOpen = true;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with confirm state', () => {
      expect(component.dialogState).toBe('confirm');
    });

    it('should have store observables initialized', () => {
      expect(component.isRotating$).toBeDefined();
      expect(component.rotateError$).toBeDefined();
      expect(component.generatedKey$).toBeDefined();
    });

    it('should have correct environment labels', () => {
      expect(component.environmentLabels[Environment.Production]).toBe('Production');
      expect(component.environmentLabels[Environment.Staging]).toBe('Staging');
      expect(component.environmentLabels[Environment.Development]).toBe('Development');
    });
  });

  describe('Key Rotation', () => {
    it('should dispatch rotateApiKey action on rotate', () => {
      fixture.detectChanges();

      component.onRotate();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.rotateApiKey({
          apiKeyId: 'key-123',
          applicationId: 'app-456',
          environment: Environment.Development,
        })
      );
    });

    it('should transition to rotating state when isRotating becomes true', () => {
      fixture.detectChanges();
      component.dialogState = 'confirm';
      store.overrideSelector(selectIsRotating, true);
      store.refreshState();

      expect(component.dialogState).toBe('rotating');
    });

    it('should transition to completed state when key is received', () => {
      fixture.detectChanges();
      component.dialogState = 'rotating';
      store.overrideSelector(selectGeneratedKey, mockGeneratedKey);
      store.refreshState();

      expect(component.dialogState).toBe('completed');
    });

    it('should emit keyRotated event when rotation completes', () => {
      const keyRotatedSpy = spyOn(component.keyRotated, 'emit');
      fixture.detectChanges();
      component.dialogState = 'rotating';
      store.overrideSelector(selectGeneratedKey, mockGeneratedKey);
      store.refreshState();

      expect(keyRotatedSpy).toHaveBeenCalledWith(mockGeneratedKey);
    });

    it('should not transition to completed if not in rotating state', () => {
      fixture.detectChanges();
      component.dialogState = 'confirm';
      store.overrideSelector(selectGeneratedKey, mockGeneratedKey);
      store.refreshState();

      expect(component.dialogState).toBe('confirm');
    });
  });

  describe('Copy to Clipboard', () => {
    let clipboardSpy: jasmine.Spy;

    beforeEach(() => {
      // Reset the spy if it already exists
      if (navigator.clipboard.writeText && (navigator.clipboard.writeText as jasmine.Spy).and) {
        clipboardSpy = navigator.clipboard.writeText as jasmine.Spy;
        clipboardSpy.and.returnValue(Promise.resolve());
      } else {
        clipboardSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
      }
    });

    it('should copy key to clipboard', fakeAsync(() => {
      component.copyKeyToClipboard('test-key-123');
      tick(0); // Resolve the Promise

      expect(clipboardSpy).toHaveBeenCalledWith('test-key-123');
    }));

    it('should set newKeyCopied to true after copying', fakeAsync(() => {
      component.copyKeyToClipboard('test-key-123');
      tick(0); // Resolve the Promise

      expect(component.newKeyCopied).toBe(true);
    }));

    it('should reset newKeyCopied after 3 seconds', fakeAsync(() => {
      component.copyKeyToClipboard('test-key-123');
      tick(0); // Resolve the Promise

      expect(component.newKeyCopied).toBe(true);

      tick(3000);

      expect(component.newKeyCopied).toBe(false);
    }));

    it('should handle clipboard error gracefully', fakeAsync(() => {
      const consoleSpy = spyOn(console, 'error');
      clipboardSpy.and.returnValue(Promise.reject(new Error('Clipboard error')));

      component.copyKeyToClipboard('test-key-123');
      tick(0); // Resolve the Promise

      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy key:', jasmine.any(Error));
    }));
  });

  describe('Dialog Close', () => {
    it('should emit closed event on close', () => {
      const closedSpy = spyOn(component.closed, 'emit');

      component.onClose();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should reset dialog state on close', () => {
      component.dialogState = 'completed';
      component.newKeyCopied = true;

      component.onClose();

      expect(component.dialogState).toBe('confirm');
      expect(component.newKeyCopied).toBe(false);
    });

    it('should dispatch clearGeneratedKey on close', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onClose();

      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.clearGeneratedKey());
    });

    it('should dispatch clearRotateError on close', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onClose();

      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.clearRotateError());
    });
  });

  describe('Environment Class', () => {
    it('should return correct class for production', () => {
      expect(component.getEnvironmentClass(Environment.Production)).toBe('production');
    });

    it('should return correct class for staging', () => {
      expect(component.getEnvironmentClass(Environment.Staging)).toBe('staging');
    });

    it('should return correct class for development', () => {
      expect(component.getEnvironmentClass(Environment.Development)).toBe('development');
    });

    it('should return correct class for test', () => {
      expect(component.getEnvironmentClass(Environment.Test)).toBe('test');
    });

    it('should return correct class for preview', () => {
      expect(component.getEnvironmentClass(Environment.Preview)).toBe('preview');
    });

    it('should return unknown for unknown environment', () => {
      expect(component.getEnvironmentClass(Environment.Unknown)).toBe('unknown');
    });
  });

  describe('Cleanup', () => {
    it('should complete destroy$ subject on ngOnDestroy', () => {
      fixture.detectChanges();
      const destroySpy = spyOn(component['destroy$'], 'next');
      const completeSpy = spyOn(component['destroy$'], 'complete');

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
      expect(completeSpy).toHaveBeenCalled();
    });
  });
});
