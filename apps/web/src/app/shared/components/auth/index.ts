// file: apps/web/src/app/shared/components/auth/index.ts
// author: Corey Dale Peters
// date: 2025-06-21
// description: Barrel exports for reusable authentication components design system

export { AuthInputFieldComponent } from './auth-input-field.component';
export { AuthButtonComponent } from './auth-button.component';

// Export types for component configuration
export type {
  AuthInputType,
  AuthInputVariant,
  AuthInputSize,
  ValidationState
} from './auth-input-field.component';

export type {
  AuthButtonVariant,
  AuthButtonSize,
  AuthButtonType
} from './auth-button.component';