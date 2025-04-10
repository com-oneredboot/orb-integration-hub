import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { PlatformComponent } from './platform.component';
import { PLATFORM_ROUTES } from './platform.routes';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(PLATFORM_ROUTES),
    FontAwesomeModule,
    PlatformComponent
  ]
})
export class PlatformModule { } 