/**
 * Environments Effects
 *
 * Handles side effects for application environments state management.
 * This is the single source of truth for both environment configs AND API keys.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.2_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter, tap } from 'rxjs/operators';

import { EnvironmentsActions } from './environments.actions';
import { ApiKeyService } from '../../../../../core/services/api-key.service';
import { selectApplicationId } from './environments.selectors';

@Injectable()
export class EnvironmentsEffects {
  constructor(
    private actions$: Actions,
    private apiKeyService: ApiKeyService,
    private store: Store
  ) {}

  /**
   * Load Environments Effect
   * Loads API keys for an application - this is the primary data source.
   * Environment configs are not loaded here (they're optional and can be loaded separately).
   */
  loadEnvironments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentsActions.loadEnvironments, EnvironmentsActions.refreshEnvironments),
      tap((action) => {
        console.log('[EnvironmentsEffects] Action received:', action.type, 'applicationId:', action.applicationId);
      }),
      switchMap((action) => {
        console.log('[EnvironmentsEffects] Calling apiKeyService.getApiKeysByApplication');
        
        return this.apiKeyService.getApiKeysByApplication(action.applicationId).pipe(
          tap((connection) => {
            console.log('[EnvironmentsEffects] API keys response:', connection);
          }),
          map((connection) => {
            console.log('[EnvironmentsEffects] Dispatching loadEnvironmentsSuccess with', connection.items.length, 'items');
            return EnvironmentsActions.loadEnvironmentsSuccess({
              configs: [], // Configs are optional, load separately if needed
              apiKeys: connection.items,
            });
          }),
          catchError((error) => {
            console.error('[EnvironmentsEffects] Error:', error);
            return of(
              EnvironmentsActions.loadEnvironmentsFailure({
                error: error.message || 'Failed to load environments',
              })
            );
          })
        );
      })
    )
  );

  /**
   * Generate API Key Effect
   */
  generateApiKey$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentsActions.generateApiKey),
      switchMap((action) =>
        this.apiKeyService
          .generateApiKey(
            action.applicationId,
            action.organizationId,
            action.environment
          )
          .pipe(
            map((result) =>
              EnvironmentsActions.generateApiKeySuccess({
                apiKey: result.apiKey,
                generatedKey: result.generatedKey,
              })
            ),
            catchError((error) =>
              of(
                EnvironmentsActions.generateApiKeyFailure({
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
      ofType(EnvironmentsActions.rotateApiKey),
      switchMap((action) =>
        this.apiKeyService
          .rotateApiKey(action.apiKeyId, action.applicationId, action.environment)
          .pipe(
            map((result) =>
              EnvironmentsActions.rotateApiKeySuccess({
                apiKey: result.apiKey,
                newKey: result.newKey,
              })
            ),
            catchError((error) =>
              of(
                EnvironmentsActions.rotateApiKeyFailure({
                  error: error.message || 'Failed to rotate API key',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Regenerate API Key Effect
   * Creates a new ACTIVE key and marks the old one as ROTATING with 7-day grace period.
   */
  regenerateApiKey$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentsActions.regenerateApiKey),
      switchMap((action) =>
        this.apiKeyService
          .regenerateApiKey(
            action.apiKeyId,
            action.applicationId,
            action.organizationId,
            action.environment
          )
          .pipe(
            map((result) =>
              EnvironmentsActions.regenerateApiKeySuccess({
                oldKey: result.oldKey,
                newKey: result.newKey,
                regeneratedKeyResult: {
                  oldKey: result.oldKey,
                  newKey: result.newKey,
                  newKeyFullValue: result.newKeyFullValue,
                  environment: result.newKey.environment,
                },
              })
            ),
            catchError((error) =>
              of(
                EnvironmentsActions.regenerateApiKeyFailure({
                  error: error.message || 'Failed to regenerate API key',
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
      ofType(EnvironmentsActions.revokeApiKey),
      switchMap((action) =>
        this.apiKeyService.revokeApiKey(action.apiKeyId).pipe(
          map((revokedKey) =>
            EnvironmentsActions.revokeApiKeySuccess({
              apiKeyId: action.apiKeyId,
              revokedKey: revokedKey,
            })
          ),
          catchError((error) =>
            of(
              EnvironmentsActions.revokeApiKeyFailure({
                error: error.message || 'Failed to revoke API key',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Auto-refresh environments after successful API key operations
   */
  refreshAfterSuccessfulOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        EnvironmentsActions.generateApiKeySuccess,
        EnvironmentsActions.rotateApiKeySuccess,
        EnvironmentsActions.regenerateApiKeySuccess,
        EnvironmentsActions.revokeApiKeySuccess
      ),
      withLatestFrom(this.store.select(selectApplicationId)),
      filter(([, applicationId]) => !!applicationId),
      switchMap(([, applicationId]) =>
        of(EnvironmentsActions.loadEnvironments({ applicationId: applicationId! }))
      )
    )
  );
}
