/**
 * Unit tests for ApiKeyGenerateDialogComponent
 *
 * Tests the API key generation dialog functionality including:
 * - Environment selection
 * - Key generation dispatch
 * - Copy to clipboard functionality
 * - Close confirmation when key not copied
 * - Dialog state transitions
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 5.2, 5.3_
 */

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { ApiKeyGenerateDialogComponent } from './api-key-generate-dialog.component';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectIsGenerating,
  selectGenerateError,
  selectGeneratedKey,
} from '../../store/api-keys/api-keys.selectors';
import { GeneratedKeyResult } from '../../store/api-keys/api-keys.state';

describe('ApiKeyGenerateDialogComponent', () => {
  let component: ApiKeyGenerateDialogComponent;
  let fixture: ComponentFixture<ApiKeyGenerateDialogComponent>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const mockGeneratedKey: GeneratedKeyResult = {
    apiKeyId: 'key-123',
    keyPrefix: 'dev_abc123',
    fullKey: 'dev_abc123_secretkey_xyz789',
    environment: Environment.Development,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeyGenerateDialogComponent, FontAwesomeModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectIsGenerating, value: false },
            { selector: selectGenerateError, value: null },
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

    fixture = TestBed.createComponent(ApiKeyGenerateDialogComponent);
    component = fixture.componentInstance;
    component.applicationId = 'app-456';
    component.organizationId = 'org-789';
    component.isOpen = true;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with form state', () => {
      expect(component.dialogState).toBe('form');
    });

    it('should default to Development environment', () => {
      expect(component.selectedEnvironment).toBe(Environment.Development);
    });

    it('should have all environments available', () => {
      expect(component.environments).toContain(Environment.Production);
      expect(component.environments).toContain(Environment.Staging);
      expect(component.environments).toContain(Environment.Development);
      expect(component.environments).toContain(Environment.Test);
      expect(component.environments).toContain(Environment.Preview);
    });

    it('should have correct environment labels', () => {
      expect(component.environmentLabels[Environment.Production]).toBe('Production');
      expect(component.environmentLabels[Environment.Staging]).toBe('Staging');
      expect(component.environmentLabels[Environment.Development]).toBe('Development');
      expect(component.environmentLabels[Environment.Test]).toBe('Test');
      expect(component.environmentLabels[Environment.Preview]).toBe('Preview');
    });

    it('should have store observables initialized', () => {
      expect(component.isGenerating$).toBeDefined();
      expect(component.generateError$).toBeDefined();
      expect(component.generatedKey$).toBeDefined();
    });
  });

  describe('Key Generation', () => {
    it('should dispatch generateApiKey action on generate', () => {
      fixture.detectChanges();

      component.onGenerate();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.generateApiKey({
          applicationId: 'app-456',
          organizationId: 'org-789',
          environment: Environment.Development,
        })
      );
    });

    it('should dispatch with selected environment', () => {
      fixture.detectChanges();
      component.selectedEnvironment = Environment.Production;

      component.onGenerate();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.generateApiKey({
          applicationId: 'app-456',
          organizationId: 'org-789',
          environment: Environment.Production,
        })
      );
    });

    it('should transition to generated state when key is received', () => {
      fixture.detectChanges();
      store.overrideSelector(selectGeneratedKey, mockGeneratedKey);
      store.refreshState();

      expect(component.dialogState).toBe('generated');
    });

    it('should emit keyGenerated event when key is received', () => {
      const keyGeneratedSpy = spyOn(component.keyGenerated, 'emit');
      fixture.detectChanges();
      store.overrideSelector(selectGeneratedKey, mockGeneratedKey);
      store.refreshState();

      expect(keyGeneratedSpy).toHaveBeenCalledWith(mockGeneratedKey);
    });
  });

  describe('Copy to Clipboard', () => {
    beforeEach(() => {
      spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
    });

    it('should copy key to clipboard', async () => {
      await component.copyKeyToClipboard('test-key-123');

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-key-123');
    });

    it('should set keyCopied to true after copying', async () => {
      await component.copyKeyToClipboard('test-key-123');

      expect(component.keyCopied).toBe(true);
    });

    it('should reset keyCopied after 3 seconds', fakeAsync(() => {
      component.copyKeyToClipboard('test-key-123');
      tick(0);

      expect(component.keyCopied).toBe(true);

      tick(3000);

      expect(component.keyCopied).toBe(false);
    }));

    it('should handle clipboard error gracefully', async () => {
      const consoleSpy = spyOn(console, 'error');
      (navigator.clipboard.writeText as jasmine.Spy).and.returnValue(Promise.reject(new Error('Clipboard error')));

      await component.copyKeyToClipboard('test-key-123');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy key:', jasmine.any(Error));
    });
  });

  describe('Dialog Close Behavior', () => {
    it('should emit closed event when closing from form state', () => {
      const closedSpy = spyOn(component.closed, 'emit');
      component.dialogState = 'form';

      component.onClose();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should show confirmation when closing with uncopied key', () => {
      component.dialogState = 'generated';
      component.keyCopied = false;
      component.confirmClose = false;

      component.onClose();

      expect(component.confirmClose).toBe(true);
    });

    it('should not show confirmation when key was copied', () => {
      const closedSpy = spyOn(component.closed, 'emit');
      component.dialogState = 'generated';
      component.keyCopied = true;

      component.onClose();

      expect(component.confirmClose).toBe(false);
      expect(closedSpy).toHaveBeenCalled();
    });

    it('should close on confirm close', () => {
      const closedSpy = spyOn(component.closed, 'emit');
      component.confirmClose = true;

      component.onConfirmClose();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should cancel close confirmation', () => {
      component.confirmClose = true;

      component.onCancelClose();

      expect(component.confirmClose).toBe(false);
    });

    it('should reset dialog state on close', () => {
      component.dialogState = 'generated';
      component.selectedEnvironment = Environment.Production;
      component.keyCopied = true;
      component.confirmClose = true;

      component.onConfirmClose();

      expect(component.dialogState).toBe('form');
      expect(component.selectedEnvironment).toBe(Environment.Development);
      expect(component.keyCopied).toBe(false);
      expect(component.confirmClose).toBe(false);
    });

    it('should dispatch clearGeneratedKey on close', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onConfirmClose();

      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.clearGeneratedKey());
    });

    it('should dispatch clearGenerateError on close', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onConfirmClose();

      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.clearGenerateError());
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
