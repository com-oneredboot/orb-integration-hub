// file: frontend/src/app/features/user/user.module.ts
// author: Corey Dale Peters
// date: 2025-01-01
// description: Contains user module

// 3rd Party Imports
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';

// Components
import { HomeComponent } from './components/home/home.component';
import { AuthFlowComponent} from "./components/auth-flow/auth-flow.component";
import { ProfileComponent } from "./components/profile/profile.component";
import { UserRoutes } from './user.routes';
import { authReducer } from './store/auth.reducer';

@NgModule({
  declarations: [
    AuthFlowComponent,
    HomeComponent,
    ProfileComponent
  ],
  imports: [
    CommonModule,
    UserRoutes,
    ReactiveFormsModule,
    StoreModule.forFeature('auth', authReducer),
  ],
  providers: []
})
export class UserModule { }
