/**
 * Environments Effects
 *
 * Handles side effects for application environments list state management.
 * Loads both environment configs and API keys for the environments list.
 *
 * @see .kiro/specs/environments-list-and-detail/design.md
 * _Requirements: 2.2_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, timeout } from 'rxjs/operators';

import { EnvironmentsActions } from './environments.actions';
import { EnvironmentConfigService } from '../../../../../core/services/environment-config.service';
import { ApiKeyService } from '../../../../../core/services/api-key.service';
import { IApplicationEnvironmentConfig } from '../../../../../core/models/ApplicationEnvironmentConfigModel';
import { IApplicationApiKeys } from '../../../../../core/models/ApplicationApiKeysModel';

@Injectable()
export class EnvironmentsEffects {
  constructor(
    private actions$: Actions,
    private environmentConfigService: EnvironmentConfigService,
    private apiKeyService: ApiKeyService
  ) {}

  /**
   * Load Environments Effect
   * Loads both environment configs and API keys for an application.
   * API keys are the primary data source - configs are optional.
   * If configs fail to load, we still show the list with API key data.
   */
  loadEnvironments$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentsActions.loadEnvironments, EnvironmentsActions.refreshEnvironments),
      switchMap((action) => {
        // Load API keys (primary data source) - must succeed
        const apiKeys$ = this.apiKeyService.getApiKeysByApplication(action.applicationId);
        
        // Configs are optional - use a 3 second timeout and fallback to empty
        const configs$ = this.environmentConfigService.getConfigsByApplication(action.applicationId).pipe(
          timeout(3000), // Fail fast if configs take too long
          catchError((error) => {
            console.warn('[EnvironmentsEffects] Failed to load configs, continuing with empty:', error.message || error);
            return of({ items: [] as IApplicationEnvironmentConfig[], nextToken: null });
          })
        );

        return forkJoin({
          configs: configs$,
          apiKeys: apiKeys$,
        }).pipe(
          map(({ configs, apiKeys }) =>
            EnvironmentsActions.loadEnvironmentsSuccess({
              configs: configs.items,
              apiKeys: apiKeys.items,
            })
          ),
          catchError((error) =>
            of(
              EnvironmentsActions.loadEnvironmentsFailure({
                error: error.message || 'Failed to load environments',
              })
            )
          )
        );
      })
    )
  );
}
