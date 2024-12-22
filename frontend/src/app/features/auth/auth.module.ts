// auth.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthRoutes } from './auth.routes';

// Components
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';
import {EffectsModule} from "@ngrx/effects";
import {authReducer} from "./store/auth.reducer";
import {StoreModule} from "@ngrx/store";
import {AuthEffects} from "./store/auth.effects";

@NgModule({
  declarations: [
    // New Auth Flow Components
    AuthFlowComponent
  ],
  imports: [
    CommonModule,
    AuthRoutes,
    ReactiveFormsModule,
    StoreModule.forFeature('auth', authReducer),
    EffectsModule.forFeature([AuthEffects])
  ],
  providers: []
})
export class AuthModule { }
