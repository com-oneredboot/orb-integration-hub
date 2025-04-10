// file: frontend/src/app/features/user/user.routes.ts
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

const routes: Routes = [
  {
    path: '',
    component: UserLayoutComponent,
    children: [
      {
        path: 'authenticate',
        component: AuthFlowComponent,
        data: { requiresAuth: false }
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
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})

export class UserRoutes { }
