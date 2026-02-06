import { Routes } from '@angular/router';
import { ApplicationsListComponent } from './components/applications-list/applications-list.component';
import { ApplicationDetailPageComponent } from './components/application-detail-page/application-detail-page.component';
import { EnvironmentDetailPageComponent } from './components/environment-detail-page/environment-detail-page.component';

export const applicationsRoutes: Routes = [
  {
    path: '',
    component: ApplicationsListComponent,
    data: { 
      title: 'Applications',
      description: 'Manage your applications and environments'
    }
  },
  {
    path: ':id/environments/:env',
    component: EnvironmentDetailPageComponent,
    data: {
      title: 'Environment Configuration',
      description: 'Configure environment-specific settings'
    }
  },
  {
    path: ':id',
    component: ApplicationDetailPageComponent,
    data: {
      title: 'Application Details',
      description: 'View and edit application details'
    }
  }
];