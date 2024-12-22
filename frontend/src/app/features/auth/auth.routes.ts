// auth.routes.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';

const routes: Routes = [
  {
    path: '',
    children: [
      // New unified auth flow route
      {
        path: 'auth',
        component: AuthFlowComponent
      },

      // Default redirect
      {
        path: '',
        redirectTo: 'auth',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutes { }
