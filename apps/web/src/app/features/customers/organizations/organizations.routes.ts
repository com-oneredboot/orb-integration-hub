import { Routes } from '@angular/router';
import { OrganizationsListComponent } from './components/organizations-list/organizations-list.component';
import { OrganizationDetailPageComponent } from './components/organization-detail-page/organization-detail-page.component';

export const organizationsRoutes: Routes = [
  {
    path: '',
    component: OrganizationsListComponent,
    data: { 
      title: 'Organizations',
      description: 'Manage your organizations and team access'
    }
  },
  {
    path: ':id',
    component: OrganizationDetailPageComponent,
    data: {
      title: 'Organization Details',
      description: 'View and edit organization details'
    }
  }
];