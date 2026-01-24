import { Routes } from '@angular/router';
import { OrganizationsComponent } from './organizations.component';
import { OrganizationDetailPageComponent } from './components/organization-detail-page/organization-detail-page.component';

export const organizationsRoutes: Routes = [
  {
    path: '',
    component: OrganizationsComponent,
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