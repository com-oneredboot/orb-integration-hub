import { Routes } from '@angular/router';
import { ApplicationsComponent } from './applications.component';

export const applicationsRoutes: Routes = [
  {
    path: '',
    component: ApplicationsComponent,
    data: { 
      title: 'Applications',
      description: 'Manage your applications and environments'
    }
  }
];