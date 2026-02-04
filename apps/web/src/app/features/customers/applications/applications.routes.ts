import { Routes } from '@angular/router';
import { ApplicationsComponent } from './applications.component';
import { ApplicationDetailPageComponent } from './components/application-detail-page/application-detail-page.component';
import { EnvironmentDetailPageComponent } from './components/environment-detail-page/environment-detail-page.component';

export const applicationsRoutes: Routes = [
  {
    path: '',
    component: ApplicationsComponent,
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