/**
 * Customer Routes
 * 
 * Routes for customer-specific features including organizations and applications management.
 * These routes are only accessible to users with CUSTOMER group membership.
 */

import { Routes } from '@angular/router';

export const CUSTOMER_ROUTES: Routes = [
  {
    path: 'organizations',
    loadChildren: () => import('./organizations/organizations.routes').then(m => m.organizationsRoutes),
    data: { 
      title: 'Organizations',
      description: 'Manage your organizations and team access'
    }
  },
  {
    path: 'applications',
    loadChildren: () => import('./applications/applications.routes').then(m => m.applicationsRoutes),
    data: { 
      title: 'Applications',
      description: 'Manage your applications and environments'
    }
  },
  {
    path: '',
    redirectTo: 'organizations',
    pathMatch: 'full'
  }
];