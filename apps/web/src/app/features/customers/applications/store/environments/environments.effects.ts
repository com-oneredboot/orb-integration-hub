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
import { map, catchError, switchMap } from 'rxjs/operators';

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
      switchMap((action) =>
        forkJoin({
          // Configs are optional - if they fail, return empty array
          configs: this.environmentConfigService.getConfigsByApplication(action.applicationId).pipe(
            catchError((error) => {
              console.warn('[EnvironmentsEffects] Failed to load configs, continuing with empty:', error.message);
              return of({ items: [] as IApplicationEnvironmentConfig[], nextToken: null });
            })
          ),
          // API keys are required - if they fail, the whole load fails
          apiKeys: this.apiKeyService.getApiKeysByApplication(action.applicationId),
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
        )
      )
    )
  );
}
