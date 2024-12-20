// auth-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { AuthFlowComponent } from './components/auth-flow/auth-flow.component';

// Existing components (to be phased out later)
import { SignInComponent } from './components/signin/signin.component';
import { SignUpComponent } from './components/signup/signup.component';

const routes: Routes = [
  {
    path: '',
    children: [
      // New unified auth flow route
      {
        path: 'auth',
        component: AuthFlowComponent
      },

      // Existing routes (to be phased out later)
      {
        path: 'signin',
        component: SignInComponent
      },
      {
        path: 'signup',
        component: SignUpComponent
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
export class AuthRoutingModule { }
