// file: apps/web/src/app/features/user/user.routes.ts
// author: Corey Dale Peters
// date: 2025-01-01
// description: Contains user module routes

// 3rd Party Imports
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Application Imports
import { ProfileComponent } from "./components/profile/profile.component";
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AuthGuard } from '../../core/guards/auth.guard';
import { AuthFlowComponent } from "./components/auth-flow/auth-flow.component";
import { UserLayoutComponent } from '../../layouts/user-layout/user-layout.component';

export const USER_ROUTES: Routes = [
  {
    path: '',
    component: UserLayoutComponent,
    children: [
      {
        path: 'authenticate',
        component: AuthFlowComponent,
        data: { requiresAuth: false },
        children: [
          { path: '', component: AuthFlowComponent },
          { path: 'setup', component: AuthFlowComponent },
          { path: 'password', component: AuthFlowComponent },
          { path: 'verify-email', component: AuthFlowComponent },
          { path: 'signin', component: AuthFlowComponent },
          { path: 'name', component: AuthFlowComponent },
          { path: 'phone', component: AuthFlowComponent },
          { path: 'verify-phone', component: AuthFlowComponent },
          { path: 'mfa-setup', component: AuthFlowComponent },
          { path: 'mfa-verify', component: AuthFlowComponent },
          { path: '**', component: AuthFlowComponent }
        ]
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [AuthGuard],
        data: { requiresAuth: true }
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard],
        data: { requiresAuth: true }
      }
    ]
  },
  {
    path: '',
    redirectTo: 'authenticate',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(USER_ROUTES)],
  exports: [RouterModule]
})

export class UserRoutes { }
