// ╔════════════════════════════════════════════════════════════════════════════╗
// ║                                                                            ║
// ║   ⚠️  DEPRECATED - DO NOT USE THIS STORE  ⚠️                               ║
// ║                                                                            ║
// ║   This entire api-keys store has been DEPRECATED and consolidated into    ║
// ║   the environments store. All API key functionality is now handled by:    ║
// ║                                                                            ║
// ║   👉  Import from: '../../store/environments'                              ║
// ║                                                                            ║
// ║   Migration Guide:                                                         ║
// ║   - ApiKeysActions.loadApiKeys    → EnvironmentsActions.loadEnvironments  ║
// ║   - ApiKeysActions.generateApiKey → EnvironmentsActions.generateApiKey    ║
// ║   - ApiKeysActions.rotateApiKey   → EnvironmentsActions.rotateApiKey      ║
// ║   - ApiKeysActions.revokeApiKey   → EnvironmentsActions.revokeApiKey      ║
// ║   - fromApiKeys.selectApiKeys     → fromEnvironments.selectApiKeys        ║
// ║                                                                            ║
// ║   @see .kiro/specs/store-consolidation/requirements.md                     ║
// ║   @see .kiro/specs/store-consolidation/design.md                           ║
// ║                                                                            ║
// ╚════════════════════════════════════════════════════════════════════════════╝

/**
 * @deprecated This entire store is deprecated. Use the environments store instead.
 *
 * The API keys functionality has been consolidated into the environments store
 * to eliminate duplicate API calls and data inconsistency.
 *
 * DO NOT import from this file for new code.
 *
 * @see ../../store/environments - Use this store instead
 * @see .kiro/specs/store-consolidation/requirements.md - Requirements 5.1, 5.2
 */

export * from './api-keys.state';
export * from './api-keys.actions';
export * from './api-keys.reducer';
export * from './api-keys.selectors';
export * from './api-keys.effects';
