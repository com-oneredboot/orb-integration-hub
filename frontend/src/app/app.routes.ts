// file: frontend/src/app/app.routes.ts
// author: Corey Dale Peters
// date: 2024-12-31
// description: Contains application routes

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from "./layouts/app-layout/app-layout.component";

export const routes: Routes = [
  {
    path: '',
    component: AppLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: '',
        loadChildren: () => import('./features/user/user.module').then(m => m.UserModule),
        data: { requiresAuth: false, group: 'USER' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
