/**
 * Users Routes
 * 
 * Routes for users management features.
 */

import { Routes } from '@angular/router';
import { UsersListComponent } from './components/users-list/users-list.component';

export const usersRoutes: Routes = [
  {
    path: '',
    component: UsersListComponent,
    data: {
      title: 'Users',
      description: 'View users assigned to applications'
    }
  }
];
