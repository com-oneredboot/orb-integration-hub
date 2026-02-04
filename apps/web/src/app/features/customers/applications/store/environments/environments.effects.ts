/**
 * Environments Effects
 *
 * Handles side effects for application environments list state management.
 * Loads API keys for the environments list.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.2_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';

import { EnvironmentsActions } from './environments.actions';
import { ApiKeyService } from '../../../../../core/services/api-key.service';

@Injectable()
export class EnvironmentsEffects {
  constructor(
    private actions$: Actions,
    private apiKeyService: ApiKeyService
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
}
