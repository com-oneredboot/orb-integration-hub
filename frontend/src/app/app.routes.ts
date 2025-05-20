// file: frontend/src/app/app.routes.ts
// author: Corey Dale Peters
// date: 2024-12-31
// description: Contains application routes

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PlatformLayoutComponent } from "./layouts/platform-layout/platform-layout.component";
import { AuthGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: PlatformLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'platform',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  providers: [AuthGuard],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
