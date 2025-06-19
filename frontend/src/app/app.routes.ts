// file: frontend/src/app/app.routes.ts
// author: Corey Dale Peters
// date: 2024-12-31
// description: Contains application routes

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlatformLayoutComponent } from "./layouts/platform-layout/platform-layout.component";
import { AuthGuard } from './core/guards/auth.guard';
import { PlatformComponent } from './features/platform/platform.component';
import { AuthFlowComponent } from './features/user/components/auth-flow/auth-flow.component';
import { ProfileComponent } from './features/user/components/profile/profile.component';
import { DashboardComponent } from './features/user/components/dashboard/dashboard.component';
import { UserLayoutComponent } from './layouts/user-layout/user-layout.component';
import { ThisIsNotThePageComponent } from './features/user/components/this-is-not-the-page/this-is-not-the-page.component';

export const routes: Routes = [
  {
    path: '',
    component: PlatformLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'platform',
        pathMatch: 'full'
      },
      {
        path: 'platform',
        component: PlatformComponent
      }
    ]
  },
  {
    path: 'authenticate',
    component: AuthFlowComponent
  },
  {
    path: '',
    component: UserLayoutComponent,
    children: [
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard],
        data: { requiresAuth: true }
      },
      {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [AuthGuard],
        data: { requiresAuth: true }
      }
    ]
  },
  {
    path: '**',
    component: ThisIsNotThePageComponent
  }
];

@NgModule({
  providers: [AuthGuard],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
