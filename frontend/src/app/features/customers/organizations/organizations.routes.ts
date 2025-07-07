import { Routes } from '@angular/router';
import { OrganizationsComponent } from './organizations.component';

export const organizationsRoutes: Routes = [
  {
    path: '',
    component: OrganizationsComponent,
    data: { 
      title: 'Organizations',
      description: 'Manage your organizations and team access'
    }
  }
];