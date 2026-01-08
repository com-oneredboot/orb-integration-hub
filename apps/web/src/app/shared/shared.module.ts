// file: apps/web/src/app/shared/shared.module.ts
// author: Claude Code Assistant
// date: 2025-06-23
// description: Shared module providing reusable components, directives, and pipes across the application

import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

// Components
import { AuthButtonComponent } from './components/auth/auth-button.component';
import { AuthInputFieldComponent } from './components/auth/auth-input-field.component';
import { ErrorBoundaryComponent } from './components/error/error-boundary.component';
import { StatusBadgeComponent } from './components/ui/status-badge.component';

// Services
import { FormValidationService } from './services/form-validation.service';
import { StatusDisplayService } from './services/status-display.service';

// Re-export common modules that shared components need
const ANGULAR_MODULES = [
  CommonModule,
  ReactiveFormsModule,
  FormsModule
];

// Re-export third-party modules that shared components need
const THIRD_PARTY_MODULES = [
  FontAwesomeModule
];

// All shared components that can be used across features
const SHARED_COMPONENTS = [
  AuthButtonComponent,
  AuthInputFieldComponent,
  ErrorBoundaryComponent,
  StatusBadgeComponent
];

// All shared services
const SHARED_SERVICES = [
  FormValidationService,
  StatusDisplayService
];

@NgModule({
  imports: [
    ...ANGULAR_MODULES,
    ...THIRD_PARTY_MODULES
  ],
  declarations: [
    // Note: Components are standalone, so no declarations needed
    // This is here for future non-standalone components
  ],
  providers: [
    ...SHARED_SERVICES
  ],
  exports: [
    // Export Angular modules for consuming modules
    ...ANGULAR_MODULES,
    ...THIRD_PARTY_MODULES,
    // Export shared components
    ...SHARED_COMPONENTS
  ]
})
export class SharedModule {
  /**
   * Use this method in your app module
   * Provides global services that should be singletons
   */
  static forRoot() {
    return {
      ngModule: SharedModule,
      providers: [
        ...SHARED_SERVICES
      ]
    };
  }
}