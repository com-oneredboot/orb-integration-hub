/**
 * API Keys Effects
 *
 * Handles side effects for application API key state management.
 * Follows the same patterns as GroupsEffects.
 *
 * @see .kiro/specs/application-access-management/design.md
 * _Requirements: 9.1_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import {
  map,
  catchError,
  switchMap,
  withLatestFrom,
  filter,
} from 'rxjs/operators';

import { ApiKeysActions } from './api-keys.actions';
import { ApiKeyService } from '../../../../../core/services/api-key.service';
import { selectCurrentApplicationId } from './api-keys.selectors';

@Injectable()
export class ApiKeysEffects {
  constructor(
    private actions$: Actions,
    private apiKeyService: ApiKeyService,
    private store: Store
  ) {}

  /**
   * Load API Keys Effect
   * Loads all API keys for a specific application.
   */
  loadApiKeys$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApiKeysActions.loadApiKeys, ApiKeysActions.refreshApiKeys),
      switchMap((action) =>
        this.apiKeyService.getApiKeysByApplication(action.applicationId).pipe(
          map((connection) =>
            ApiKeysActions.loadApiKeysSuccess({ apiKeys: connection.items })
          ),
          catchError((error) =>
            of(
              ApiKeysActions.loadApiKeysFailure({
                error: error.message || 'Failed to load API keys',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Generate API Key Effect
   */
  generateApiKey$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApiKeysActions.generateApiKey),
      switchMap((action) =>
        this.apiKeyService
          .generateApiKey(
            action.applicationId,
            action.organizationId,
            action.environment
          )
          .pipe(
            map((result) =>
              ApiKeysActions.generateApiKeySuccess({
                apiKey: result.apiKey,
                generatedKey: result.generatedKey,
              })
            ),
            catchError((error) =>
              of(
                ApiKeysActions.generateApiKeyFailure({
                  error: error.message || 'Failed to generate API key',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Rotate API Key Effect
   */
  rotateApiKey$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApiKeysActions.rotateApiKey),
      switchMap((action) =>
        this.apiKeyService
          .rotateApiKey(action.apiKeyId, action.applicationId, action.environment)
          .pipe(
            map((result) =>
              ApiKeysActions.rotateApiKeySuccess({
                apiKey: result.apiKey,
                newKey: result.newKey,
              })
            ),
            catchError((error) =>
              of(
                ApiKeysActions.rotateApiKeyFailure({
                  error: error.message || 'Failed to rotate API key',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Revoke API Key Effect
   */
  revokeApiKey$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApiKeysActions.revokeApiKey),
      switchMap((action) =>
        this.apiKeyService.revokeApiKey(action.apiKeyId).pipe(
          map(() =>
            ApiKeysActions.revokeApiKeySuccess({
              apiKeyId: action.apiKeyId,
            })
          ),
          catchError((error) =>
            of(
              ApiKeysActions.revokeApiKeyFailure({
                error: error.message || 'Failed to revoke API key',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Auto-refresh API keys after successful operations
   */
  refreshAfterSuccessfulOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        ApiKeysActions.generateApiKeySuccess,
        ApiKeysActions.rotateApiKeySuccess,
        ApiKeysActions.revokeApiKeySuccess
      ),
      withLatestFrom(this.store.select(selectCurrentApplicationId)),
      filter(([, applicationId]) => !!applicationId),
      switchMap(([, applicationId]) =>
        of(ApiKeysActions.loadApiKeys({ applicationId: applicationId! }))
      )
    )
  );
}
