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
