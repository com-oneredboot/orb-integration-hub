// file: frontend/src/app/features/user/components/this-is-not-the-page/this-is-not-the-page.component.ts
// author: Corey Dale Peters
// date: 2025-03-07
// description: TypeScript file

import { Component } from '@angular/core';

@Component({
  selector: 'app-this-is-not-the-page',
  templateUrl: './this-is-not-the-page.component.html',
  styleUrl: './this-is-not-the-page.component.scss'
})
export class ThisIsNotThePageComponent {

  constructor() {
    console.debug('ThisIsNotThePageComponent::constructor');
  }
}
