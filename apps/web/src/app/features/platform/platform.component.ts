// file: apps/web/src/app/features/platform/platform.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { CommonModule } from '@angular/common';
import { 
  faRocket, 
  faBook, 
  faCreditCard, 
  faShieldHalved,
  faCalendarCheck,
  faChartLine,
  faCheckCircle,
  faCode,
  faSliders,
  faTerminal,
  faCheck,
  faStar,
  faMessage
} from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-platform',
    templateUrl: './platform.component.html',
    styleUrls: ['./platform.component.scss'],
    standalone: true,
    imports: [FontAwesomeModule, CommonModule]
})
export class PlatformComponent {
  // Expose icons to the template
  protected faRocket = faRocket;
  protected faBook = faBook;
  protected faCreditCard = faCreditCard;
  protected faShieldHalved = faShieldHalved;
  protected faCalendarCheck = faCalendarCheck;
  protected faChartLine = faChartLine;
  protected faCheckCircle = faCheckCircle;
  protected faCode = faCode;
  protected faSliders = faSliders;
  protected faTerminal = faTerminal;
  protected faCheck = faCheck;
  protected faStar = faStar;
  protected faMessage = faMessage;

  constructor(private router: Router, library: FaIconLibrary) {
    // Add icons to the library for use in the template
    library.addIcons(
      faRocket,
      faBook,
      faCreditCard,
      faShieldHalved,
      faCalendarCheck,
      faChartLine,
      faCheckCircle,
      faCode,
      faSliders,
      faTerminal,
      faCheck,
      faStar,
      faMessage
    );
  }

  navigateToSignup() {
    this.router.navigate(['/authenticate']);
  }

  navigateToSignin() {
    this.router.navigate(['/authenticate']);
  }
} 