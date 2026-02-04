/**
 * Environment Config Effects
 *
 * Handles side effects for application environment configuration state management.
 * Follows the same patterns as ApiKeysEffects.
 *
 * @see .kiro/specs/application-environment-config/design.md
 * _Requirements: 1.1, 2.1, 3.1, 4.1, 8.1_
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, withLatestFrom, filter } from 'rxjs/operators';

import { EnvironmentConfigActions } from './environment-config.actions';
import { EnvironmentConfigService } from '../../../../../core/services/environment-config.service';
import { EnvironmentConfigState } from './environment-config.state';

// Inline selectors to avoid circular dependency issues
const _selectEnvironmentConfigState = (state: { environmentConfig: EnvironmentConfigState }) =>
  state.environmentConfig;

const selectApplicationId = (state: { environmentConfig: EnvironmentConfigState }) =>
  state.environmentConfig?.applicationId ?? null;

const selectSelectedConfig = (state: { environmentConfig: EnvironmentConfigState }) =>
  state.environmentConfig?.selectedConfig ?? null;

@Injectable()
export class EnvironmentConfigEffects {
  constructor(
    private actions$: Actions,
    private environmentConfigService: EnvironmentConfigService,
    private store: Store<{ environmentConfig: EnvironmentConfigState }>
  ) {}

  /**
   * Load Environment Configs Effect
   * Loads all environment configs for a specific application.
   */
  loadConfigs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.loadConfigs, EnvironmentConfigActions.refreshConfigs),
      switchMap((action) =>
        this.environmentConfigService.getConfigsByApplication(action.applicationId).pipe(
          map((connection) =>
            EnvironmentConfigActions.loadConfigsSuccess({ configs: connection.items })
          ),
          catchError((error) =>
            of(
              EnvironmentConfigActions.loadConfigsFailure({
                error: error.message || 'Failed to load environment configs',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Load Single Config Effect
   */
  loadConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.loadConfig),
      switchMap((action) =>
        this.environmentConfigService.getConfig(action.applicationId, action.environment).pipe(
          map((config) => EnvironmentConfigActions.loadConfigSuccess({ config })),
          catchError((error) =>
            of(
              EnvironmentConfigActions.loadConfigFailure({
                error: error.message || 'Failed to load environment config',
              })
            )
          )
        )
      )
    )
  );

  /**
   * Create Config Effect
   */
  createConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.createConfig),
      switchMap((action) =>
        this.environmentConfigService
          .createConfig(action.applicationId, action.organizationId, action.environment)
          .pipe(
            map((config) => EnvironmentConfigActions.createConfigSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.createConfigFailure({
                  error: error.message || 'Failed to create environment config',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Update Config Effect
   */
  updateConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.updateConfig),
      switchMap((action) =>
        this.environmentConfigService
          .updateConfig(action.applicationId, action.environment, {
            rateLimitPerMinute: action.rateLimitPerMinute,
            rateLimitPerDay: action.rateLimitPerDay,
            webhookEnabled: action.webhookEnabled,
            metadata: action.metadata,
          })
          .pipe(
            map((config) => EnvironmentConfigActions.updateConfigSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.updateConfigFailure({
                  error: error.message || 'Failed to update environment config',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Add Allowed Origin Effect
   */
  addAllowedOrigin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.addAllowedOrigin),
      withLatestFrom(this.store.select(selectSelectedConfig)),
      switchMap(([action, selectedConfig]) => {
        const currentOrigins = selectedConfig?.allowedOrigins ?? [];
        return this.environmentConfigService
          .addAllowedOrigin(
            action.applicationId,
            action.environment,
            action.origin,
            currentOrigins
          )
          .pipe(
            map((config) => EnvironmentConfigActions.addAllowedOriginSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.addAllowedOriginFailure({
                  error: error.message || 'Failed to add allowed origin',
                })
              )
            )
          );
      })
    )
  );

  /**
   * Remove Allowed Origin Effect
   */
  removeAllowedOrigin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.removeAllowedOrigin),
      withLatestFrom(this.store.select(selectSelectedConfig)),
      switchMap(([action, selectedConfig]) => {
        const currentOrigins = selectedConfig?.allowedOrigins ?? [];
        return this.environmentConfigService
          .removeAllowedOrigin(
            action.applicationId,
            action.environment,
            action.origin,
            currentOrigins
          )
          .pipe(
            map((config) => EnvironmentConfigActions.removeAllowedOriginSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.removeAllowedOriginFailure({
                  error: error.message || 'Failed to remove allowed origin',
                })
              )
            )
          );
      })
    )
  );

  /**
   * Update Webhook Config Effect
   */
  updateWebhookConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.updateWebhookConfig),
      switchMap((action) =>
        this.environmentConfigService
          .updateWebhookConfig(action.applicationId, action.environment, {
            webhookUrl: action.webhookUrl,
            webhookEvents: action.webhookEvents,
            webhookEnabled: action.webhookEnabled,
            webhookMaxRetries: action.webhookMaxRetries,
            webhookRetryDelaySeconds: action.webhookRetryDelaySeconds,
          })
          .pipe(
            map((config) => EnvironmentConfigActions.updateWebhookConfigSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.updateWebhookConfigFailure({
                  error: error.message || 'Failed to update webhook config',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Regenerate Webhook Secret Effect
   */
  regenerateWebhookSecret$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.regenerateWebhookSecret),
      switchMap((action) =>
        this.environmentConfigService
          .regenerateWebhookSecret(action.applicationId, action.environment)
          .pipe(
            map((result) =>
              EnvironmentConfigActions.regenerateWebhookSecretSuccess({
                webhookSecret: result.webhookSecret,
              })
            ),
            catchError((error) =>
              of(
                EnvironmentConfigActions.regenerateWebhookSecretFailure({
                  error: error.message || 'Failed to regenerate webhook secret',
                })
              )
            )
          )
      )
    )
  );

  /**
   * Set Feature Flag Effect
   */
  setFeatureFlag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.setFeatureFlag),
      withLatestFrom(this.store.select(selectSelectedConfig)),
      switchMap(([action, selectedConfig]) => {
        const currentFlags = (selectedConfig?.featureFlags ?? {}) as Record<string, unknown>;
        return this.environmentConfigService
          .setFeatureFlag(
            action.applicationId,
            action.environment,
            action.key,
            action.value,
            currentFlags
          )
          .pipe(
            map((config) => EnvironmentConfigActions.setFeatureFlagSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.setFeatureFlagFailure({
                  error: error.message || 'Failed to set feature flag',
                })
              )
            )
          );
      })
    )
  );

  /**
   * Delete Feature Flag Effect
   */
  deleteFeatureFlag$ = createEffect(() =>
    this.actions$.pipe(
      ofType(EnvironmentConfigActions.deleteFeatureFlag),
      withLatestFrom(this.store.select(selectSelectedConfig)),
      switchMap(([action, selectedConfig]) => {
        const currentFlags = (selectedConfig?.featureFlags ?? {}) as Record<string, unknown>;
        return this.environmentConfigService
          .deleteFeatureFlag(
            action.applicationId,
            action.environment,
            action.key,
            currentFlags
          )
          .pipe(
            map((config) => EnvironmentConfigActions.deleteFeatureFlagSuccess({ config })),
            catchError((error) =>
              of(
                EnvironmentConfigActions.deleteFeatureFlagFailure({
                  error: error.message || 'Failed to delete feature flag',
                })
              )
            )
          );
      })
    )
  );

  /**
   * Auto-refresh configs after successful operations
   */
  refreshAfterSuccessfulOperation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        EnvironmentConfigActions.createConfigSuccess,
        EnvironmentConfigActions.updateConfigSuccess,
        EnvironmentConfigActions.addAllowedOriginSuccess,
        EnvironmentConfigActions.removeAllowedOriginSuccess,
        EnvironmentConfigActions.updateWebhookConfigSuccess,
        EnvironmentConfigActions.setFeatureFlagSuccess,
        EnvironmentConfigActions.deleteFeatureFlagSuccess
      ),
      withLatestFrom(this.store.select(selectApplicationId)),
      filter(([, applicationId]) => !!applicationId),
      switchMap(([, applicationId]) =>
        of(EnvironmentConfigActions.loadConfigs({ applicationId: applicationId! }))
      )
    )
  );
}
