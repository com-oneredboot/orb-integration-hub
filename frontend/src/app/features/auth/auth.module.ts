// auth.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';

// Components
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';
import { EmailStepComponent } from './components/steps/email-step/email-step.component';
import { PasswordStepComponent } from './components/steps/password-step/password-step.component';
import { MFAStepComponent } from './components/steps/mfa-step/mfa-step.component';
import { CompletionStepComponent } from './components/steps/completion-step/completion-step.component';
import {EffectsModule} from "@ngrx/effects";
import {authReducer} from "./store/auth.reducer";
import {StoreModule} from "@ngrx/store";
import {AuthEffects} from "./store/auth.effects";

@NgModule({
  declarations: [
    // New Auth Flow Components
    AuthFlowComponent,
    EmailStepComponent,
    PasswordStepComponent,
    MFAStepComponent,
    CompletionStepComponent,
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule,
    StoreModule.forFeature('auth', authReducer),
    EffectsModule.forFeature([AuthEffects])
  ],
  providers: []
})
export class AuthModule { }
