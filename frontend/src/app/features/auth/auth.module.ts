// auth.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';

// Components
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';
import { EmailStepComponent } from './components/steps/email-step/email-step.component';
import { PasswordStepComponent } from './components/steps/password-step/password-step.component';
import { MfaStepComponent } from './components/steps/mfa-step/mfa-step.component';
import { CompletionStepComponent } from './components/steps/completion-step/completion-step.component';

// Existing components (to be phased out later)
import { SignInComponent } from './components/signin/signin.component';
import { SignUpComponent } from './components/signup/signup.component';

@NgModule({
  declarations: [
    // New Auth Flow Components
    AuthFlowComponent,
    EmailStepComponent,
    PasswordStepComponent,
    MfaStepComponent,
    CompletionStepComponent,

    // Existing Components
    SignInComponent,
    SignUpComponent,
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    ReactiveFormsModule
  ],
  providers: []
})
export class AuthModule { }
