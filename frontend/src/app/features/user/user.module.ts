// file: frontend/src/app/features/user/user.module.ts
// author: Corey Dale Peters
// date: 2025-01-01
// description: Contains user module

// 3rd Party Imports
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from "@ngrx/effects";
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

// Components
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';
import { ProfileComponent } from './components/profile/profile.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { UserRoutes } from './user.routes';
import { authReducer } from './components/auth-flow/store/auth.reducer';
import { AuthEffects } from './components/auth-flow/store/auth.effects';

@NgModule({
  declarations: [
    AuthFlowComponent,
    ProfileComponent,
    DashboardComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    StoreModule.forFeature('auth', authReducer),
    EffectsModule.forFeature([AuthEffects]),
    UserRoutes,
    FontAwesomeModule
  ],
  providers: []
})
export class UserModule { }
