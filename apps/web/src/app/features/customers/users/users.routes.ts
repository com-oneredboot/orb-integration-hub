/**
 * Users Routes
 * 
 * Routes for users management features.
 * These routes are only accessible to users with CUSTOMER, EMPLOYEE, or OWNER roles.
 */

import { Routes } from '@angular/router';
import { AuthGuard } from '../../../core/guards/auth.guard';
import { RoleGuard } from '../../../core/guards/role.guard';

export const usersRoutes: Routes = [
  {
    path: '',
    component: () => import('./components/users-list/users-list.component').then(m => m.UsersListComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: {
      roles: ['CUSTOMER', 'EMPLOYEE', 'OWNER'],
      title: 'Users',
      description: 'View users assigned to applications'
    }
  }
];
