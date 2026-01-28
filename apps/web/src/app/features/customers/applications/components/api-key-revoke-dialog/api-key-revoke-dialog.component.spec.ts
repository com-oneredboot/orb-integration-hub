/**
 * Unit tests for ApiKeyRevokeDialogComponent
 *
 * Tests the API key revocation dialog functionality including:
 * - Confirmation text validation
 * - Revocation dispatch
 * - Dialog state management
 * - Error handling
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 5.6_
 */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';
import { FontAwesomeModule, FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

import { ApiKeyRevokeDialogComponent } from './api-key-revoke-dialog.component';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';
import { Environment } from '../../../../../core/enums/EnvironmentEnum';
import { ApplicationApiKeyStatus } from '../../../../../core/enums/ApplicationApiKeyStatusEnum';
import { ApiKeysActions } from '../../store/api-keys/api-keys.actions';
import {
  selectIsRevoking,
  selectRevokeError,
  selectLastRevokedKeyId,
} from '../../store/api-keys/api-keys.selectors';

describe('ApiKeyRevokeDialogComponent', () => {
  let component: ApiKeyRevokeDialogComponent;
  let fixture: ComponentFixture<ApiKeyRevokeDialogComponent>;
  let store: MockStore;
  let dispatchSpy: jasmine.Spy;

  const createMockApiKey = (overrides: Partial<IApplicationApiKeys> = {}): IApplicationApiKeys => ({
    applicationApiKeyId: 'key-123',
    applicationId: 'app-456',
    organizationId: 'org-789',
    environment: Environment.Production,
    keyHash: 'hash123',
    keyPrefix: 'prd_abc123',
    status: ApplicationApiKeyStatus.Active,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    ...overrides,
  });

  const mockApiKey = createMockApiKey();

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApiKeyRevokeDialogComponent, FontAwesomeModule],
      providers: [
        provideMockStore({
          selectors: [
            { selector: selectIsRevoking, value: false },
            { selector: selectRevokeError, value: null },
            { selector: selectLastRevokedKeyId, value: null },
          ],
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(MockStore);
    dispatchSpy = spyOn(store, 'dispatch');

    // Register FontAwesome icons
    const library = TestBed.inject(FaIconLibrary);
    library.addIconPacks(fas);

    fixture = TestBed.createComponent(ApiKeyRevokeDialogComponent);
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

    it('should initialize with empty confirmation text', () => {
      expect(component.confirmationText).toBe('');
    });

    it('should initialize with isRevoked as false', () => {
      expect(component.isRevoked).toBe(false);
    });

    it('should have store observables initialized', () => {
      expect(component.isRevoking$).toBeDefined();
      expect(component.revokeError$).toBeDefined();
      expect(component.lastRevokedKeyId$).toBeDefined();
    });

    it('should have correct environment labels', () => {
      expect(component.environmentLabels[Environment.Production]).toBe('Production');
      expect(component.environmentLabels[Environment.Staging]).toBe('Staging');
      expect(component.environmentLabels[Environment.Development]).toBe('Development');
    });
  });

  describe('Confirmation Validation', () => {
    it('should return false when confirmation text is empty', () => {
      component.confirmationText = '';
      expect(component.isConfirmationValid).toBe(false);
    });

    it('should return false when confirmation text is incorrect', () => {
      component.confirmationText = 'delete';
      expect(component.isConfirmationValid).toBe(false);
    });

    it('should return true when confirmation text is "revoke"', () => {
      component.confirmationText = 'revoke';
      expect(component.isConfirmationValid).toBe(true);
    });

    it('should return true when confirmation text is "REVOKE" (case insensitive)', () => {
      component.confirmationText = 'REVOKE';
      expect(component.isConfirmationValid).toBe(true);
    });

    it('should return true when confirmation text is "Revoke" (mixed case)', () => {
      component.confirmationText = 'Revoke';
      expect(component.isConfirmationValid).toBe(true);
    });
  });

  describe('Key Revocation', () => {
    it('should not dispatch revokeApiKey when confirmation is invalid', () => {
      fixture.detectChanges();
      component.confirmationText = 'invalid';

      component.onRevoke();

      expect(dispatchSpy).not.toHaveBeenCalledWith(
        jasmine.objectContaining({ type: ApiKeysActions.revokeApiKey.type })
      );
    });

    it('should dispatch revokeApiKey when confirmation is valid', () => {
      fixture.detectChanges();
      component.confirmationText = 'revoke';

      component.onRevoke();

      expect(dispatchSpy).toHaveBeenCalledWith(
        ApiKeysActions.revokeApiKey({
          apiKeyId: 'key-123',
          applicationId: 'app-456',
          environment: Environment.Production,
        })
      );
    });

    it('should set isRevoked to true when revocation succeeds', () => {
      fixture.detectChanges();
      store.overrideSelector(selectLastRevokedKeyId, 'key-123');
      store.refreshState();

      expect(component.isRevoked).toBe(true);
    });

    it('should emit keyRevoked event when revocation succeeds', () => {
      const keyRevokedSpy = spyOn(component.keyRevoked, 'emit');
      fixture.detectChanges();
      store.overrideSelector(selectLastRevokedKeyId, 'key-123');
      store.refreshState();

      expect(keyRevokedSpy).toHaveBeenCalledWith('key-123');
    });

    it('should not emit keyRevoked for different key id', () => {
      const keyRevokedSpy = spyOn(component.keyRevoked, 'emit');
      fixture.detectChanges();
      store.overrideSelector(selectLastRevokedKeyId, 'different-key-456');
      store.refreshState();

      expect(keyRevokedSpy).not.toHaveBeenCalled();
    });
  });

  describe('Dialog Close', () => {
    it('should emit closed event on close', () => {
      const closedSpy = spyOn(component.closed, 'emit');

      component.onClose();

      expect(closedSpy).toHaveBeenCalled();
    });

    it('should reset confirmation text on close', () => {
      component.confirmationText = 'revoke';

      component.onClose();

      expect(component.confirmationText).toBe('');
    });

    it('should reset isRevoked on close', () => {
      component.isRevoked = true;

      component.onClose();

      expect(component.isRevoked).toBe(false);
    });

    it('should dispatch clearRevokeError on close', () => {
      fixture.detectChanges();
      dispatchSpy.calls.reset();

      component.onClose();

      expect(dispatchSpy).toHaveBeenCalledWith(ApiKeysActions.clearRevokeError());
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
